package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

type contextKey string

const authClaimsKey contextKey = "authClaims"

var adminEmail string
var adminPasswordHash []byte
var jwtSecret []byte
var jwtExpiration time.Duration

func main() {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_USER", "admin"),
		getEnv("POSTGRES_PASSWORD", "changeme"),
		getEnv("POSTGRES_DB", "upcycleconnect"),
	)

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open database connection: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := waitForDB(ctx); err != nil {
		log.Fatalf("Database not ready: %v", err)
	}
	log.Println("✓ Connected to PostgreSQL")

	if err := initAuth(); err != nil {
		log.Fatalf("Auth configuration error: %v", err)
	}
	log.Println("✓ JWT auth initialized")

	if err := ensureOffersSchema(); err != nil {
		log.Fatalf("Offers schema initialization error: %v", err)
	}
	log.Println("✓ Offers schema initialized")

	if err := ensureEventsSchema(); err != nil {
		log.Fatalf("Events schema initialization error: %v", err)
	}
	log.Println("✓ Events schema initialized")

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /ping", pingHandler)
	mux.HandleFunc("GET /api/status", statusHandler)
	mux.HandleFunc("/api/auth/login", loginHandler)
	mux.Handle("/api/auth/me", authMiddleware(http.HandlerFunc(meHandler)))
	mux.Handle("/api/admin/service-categories", authMiddleware(http.HandlerFunc(serviceCategoriesHandler)))
	mux.Handle("/api/admin/service-categories/", authMiddleware(http.HandlerFunc(serviceCategoryByIDHandler)))
	mux.Handle("/api/admin/services", authMiddleware(http.HandlerFunc(servicesHandler)))
	mux.Handle("/api/admin/services/", authMiddleware(http.HandlerFunc(serviceByIDHandler)))
	mux.Handle("/api/admin/events", authMiddleware(http.HandlerFunc(eventsHandler)))
	mux.Handle("/api/admin/events/", authMiddleware(http.HandlerFunc(eventByIDHandler)))
	mux.Handle("/api/admin/event-categories", authMiddleware(http.HandlerFunc(eventCategoriesHandler)))
	mux.Handle("/api/admin/event-categories/", authMiddleware(http.HandlerFunc(eventCategoryByIDHandler)))

	port := getEnv("API_PORT", "8080")

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      corsMiddleware(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down server...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Fatalf("Server shutdown failed: %v", err)
		}
	}()

	log.Printf("🚀 API server starting on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}

	log.Println("Server stopped gracefully")
}


func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func waitForDB(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for database")
		default:
			if err := db.PingContext(ctx); err == nil {
				return nil
			}
			log.Println("Waiting for database...")
			time.Sleep(2 * time.Second)
		}
	}
}

func initAuth() error {
	adminEmail = strings.ToLower(strings.TrimSpace(getEnv("ADMIN_EMAIL", "admin@upcycleconnect.fr")))
	if adminEmail == "" {
		return fmt.Errorf("ADMIN_EMAIL cannot be empty")
	}

	plainPassword := getEnv("ADMIN_PASSWORD", "admin1234")
	if plainPassword == "" {
		return fmt.Errorf("ADMIN_PASSWORD cannot be empty")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}
	adminPasswordHash = hash

	jwtSecretValue := getEnv("JWT_SECRET", "dev-only-secret-change-me")
	if len(jwtSecretValue) < 16 {
		return fmt.Errorf("JWT_SECRET must be at least 16 characters")
	}
	jwtSecret = []byte(jwtSecretValue)

	hoursStr := getEnv("JWT_EXPIRES_HOURS", "12")
	hours, err := strconv.Atoi(hoursStr)
	if err != nil || hours < 1 {
		hours = 12
	}
	jwtExpiration = time.Duration(hours) * time.Hour

	return nil
}


func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if tokenString == "" {
			writeError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}

		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
		if err != nil || !token.Valid {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		r = r.WithContext(context.WithValue(r.Context(), authClaimsKey, claims))
		next.ServeHTTP(w, r)
	})
}


func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintln(w, "pong")
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	dbStatus := "connected"
	if err := db.Ping(); err != nil {
		dbStatus = fmt.Sprintf("error: %v", err)
	}

	var tableCount int
	err := db.QueryRow(
		`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`,
	).Scan(&tableCount)
	if err != nil {
		tableCount = -1
	}

	var userCount int
	_ = db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&userCount)

	var itemCount int
	_ = db.QueryRow(`SELECT COUNT(*) FROM items`).Scan(&itemCount)

	var categoryCount int
	_ = db.QueryRow(`SELECT COUNT(*) FROM categories`).Scan(&categoryCount)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"service":    "upcycleconnect-api",
		"version":    "0.1.0",
		"database":   dbStatus,
		"tables":     tableCount,
		"users":      userCount,
		"items":      itemCount,
		"categories": categoryCount,
		"time":       time.Now().UTC().Format(time.RFC3339),
	})
}

type serviceCategoryPayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

type servicePayload struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	CategoryID  int64   `json:"categoryId"`
	Type        string  `json:"type"`
	Price       float64 `json:"price"`
	Status      string  `json:"status"`
}

type eventPayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	CategoryID  int64  `json:"categoryId"`
	Type        string `json:"type"`
	DateDebut   string `json:"dateDebut"`
	DateFin     string `json:"dateFin"`
	Lieu        string `json:"lieu"`
	Capacite    *int64 `json:"capacite"`
	Status      string `json:"status"`
	Intervenant string `json:"intervenant"`
}

type eventCategoryPayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

func ensureOffersSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS service_categories (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'actif',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT service_categories_status_check CHECK (status IN ('actif', 'inactif'))
		)`,
		`CREATE TABLE IF NOT EXISTS services (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			category_id BIGINT NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
			type TEXT NOT NULL,
			price NUMERIC(12,2) NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'brouillon',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT services_type_check CHECK (type IN ('service', 'atelier', 'formation', 'evenement')),
			CONSTRAINT services_status_check CHECK (status IN ('actif', 'inactif', 'brouillon'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id)`,
		`CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)`,
		`CREATE INDEX IF NOT EXISTS idx_service_categories_status ON service_categories(status)`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return err
		}
	}

	return nil
}

func serviceCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		statusFilter := normalizeCategoryStatus(strings.TrimSpace(r.URL.Query().Get("status")))

		rows, err := db.Query(`
			SELECT c.id, c.name, c.description, c.status, c.created_at, c.updated_at, COUNT(s.id) AS linked_services
			FROM service_categories c
			LEFT JOIN services s ON s.category_id = c.id
			WHERE ($1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.description ILIKE '%' || $1 || '%')
			AND ($2 = '' OR c.status = $2)
			GROUP BY c.id
			ORDER BY c.created_at DESC
		`, q, statusFilter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list categories")
			return
		}
		defer rows.Close()

		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var name, description, status string
			var createdAt, updatedAt time.Time
			var linkedServices int64

			if err := rows.Scan(&id, &name, &description, &status, &createdAt, &updatedAt, &linkedServices); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse categories")
				return
			}

			result = append(result, map[string]interface{}{
				"id":             id,
				"name":           name,
				"description":    description,
				"status":         status,
				"linkedServices": linkedServices,
				"createdAt":      createdAt.UTC().Format(time.RFC3339),
				"updatedAt":      updatedAt.UTC().Format(time.RFC3339),
			})
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload serviceCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		name := strings.TrimSpace(payload.Name)
		description := strings.TrimSpace(payload.Description)
		status := normalizeCategoryStatus(payload.Status)

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}

		if status == "" {
			status = "actif"
		}

		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO service_categories (name, description, status)
			VALUES ($1, $2, $3)
			RETURNING id, created_at, updated_at
		`, name, description, status).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create category")
			return
		}

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":             id,
			"name":           name,
			"description":    description,
			"status":         status,
			"linkedServices": 0,
			"createdAt":      createdAt.UTC().Format(time.RFC3339),
			"updatedAt":      updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func serviceCategoryByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/service-categories/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var payload serviceCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		name := strings.TrimSpace(payload.Name)
		description := strings.TrimSpace(payload.Description)
		status := normalizeCategoryStatus(payload.Status)

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if status == "" {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}

		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE service_categories
			SET name = $1, description = $2, status = $3, updated_at = NOW()
			WHERE id = $4
			RETURNING created_at, updated_at
		`, name, description, status, id)

		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "category not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update category")
			return
		}

		var linkedServices int64
		_ = db.QueryRow(`SELECT COUNT(*) FROM services WHERE category_id = $1`, id).Scan(&linkedServices)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id":             id,
			"name":           name,
			"description":    description,
			"status":         status,
			"linkedServices": linkedServices,
			"createdAt":      createdAt.UTC().Format(time.RFC3339),
			"updatedAt":      updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		var linkedServices int64
		if err := db.QueryRow(`SELECT COUNT(*) FROM services WHERE category_id = $1`, id).Scan(&linkedServices); err != nil {
			writeError(w, http.StatusInternalServerError, "could not check category relations")
			return
		}

		if linkedServices > 0 {
			writeError(w, http.StatusConflict, "cannot delete a category with linked services")
			return
		}

		result, err := db.Exec(`DELETE FROM service_categories WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete category")
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func servicesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		statusFilter := normalizeServiceStatus(strings.TrimSpace(r.URL.Query().Get("status")))

		var categoryID interface{}
		categoryRaw := strings.TrimSpace(r.URL.Query().Get("categoryId"))
		if categoryRaw != "" {
			parsedCategoryID, err := strconv.ParseInt(categoryRaw, 10, 64)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid categoryId")
				return
			}
			categoryID = parsedCategoryID
		} else {
			categoryID = nil
		}

		rows, err := db.Query(`
			SELECT s.id, s.name, s.description, s.category_id, c.name, s.type, s.price, s.status, s.created_at, s.updated_at
			FROM services s
			JOIN service_categories c ON c.id = s.category_id
			WHERE ($1 = '' OR s.name ILIKE '%' || $1 || '%' OR s.description ILIKE '%' || $1 || '%')
			AND ($2::BIGINT IS NULL OR s.category_id = $2)
			AND ($3 = '' OR s.status = $3)
			ORDER BY s.created_at DESC
		`, q, categoryID, statusFilter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list services")
			return
		}
		defer rows.Close()

		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id, catID int64
			var name, description, categoryName, svcType, status string
			var price float64
			var createdAt, updatedAt time.Time

			if err := rows.Scan(&id, &name, &description, &catID, &categoryName, &svcType, &price, &status, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse services")
				return
			}

			result = append(result, map[string]interface{}{
				"id":           id,
				"name":         name,
				"description":  description,
				"categoryId":   catID,
				"categoryName": categoryName,
				"type":         svcType,
				"price":        price,
				"status":       status,
				"createdAt":    createdAt.UTC().Format(time.RFC3339),
				"updatedAt":    updatedAt.UTC().Format(time.RFC3339),
			})
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload servicePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		name := strings.TrimSpace(payload.Name)
		description := strings.TrimSpace(payload.Description)
		svcType := normalizeServiceType(payload.Type)
		status := normalizeServiceStatus(payload.Status)

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if payload.CategoryID <= 0 {
			writeError(w, http.StatusBadRequest, "categoryId is required")
			return
		}
		if svcType == "" {
			writeError(w, http.StatusBadRequest, "invalid type")
			return
		}
		if status == "" {
			status = "brouillon"
		}

		var categoryExists bool
		if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM service_categories WHERE id = $1)`, payload.CategoryID).Scan(&categoryExists); err != nil || !categoryExists {
			writeError(w, http.StatusBadRequest, "category does not exist")
			return
		}

		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO services (name, description, category_id, type, price, status)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, created_at, updated_at
		`, name, description, payload.CategoryID, svcType, payload.Price, status).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create service")
			return
		}

		var categoryName string
		_ = db.QueryRow(`SELECT name FROM service_categories WHERE id = $1`, payload.CategoryID).Scan(&categoryName)

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":           id,
			"name":         name,
			"description":  description,
			"categoryId":   payload.CategoryID,
			"categoryName": categoryName,
			"type":         svcType,
			"price":        payload.Price,
			"status":       status,
			"createdAt":    createdAt.UTC().Format(time.RFC3339),
			"updatedAt":    updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func serviceByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/services/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid service id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var payload servicePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		name := strings.TrimSpace(payload.Name)
		description := strings.TrimSpace(payload.Description)
		svcType := normalizeServiceType(payload.Type)
		status := normalizeServiceStatus(payload.Status)

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if payload.CategoryID <= 0 {
			writeError(w, http.StatusBadRequest, "categoryId is required")
			return
		}
		if svcType == "" {
			writeError(w, http.StatusBadRequest, "invalid type")
			return
		}
		if status == "" {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}

		var categoryExists bool
		if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM service_categories WHERE id = $1)`, payload.CategoryID).Scan(&categoryExists); err != nil || !categoryExists {
			writeError(w, http.StatusBadRequest, "category does not exist")
			return
		}

		var createdAt, updatedAt time.Time
		result := db.QueryRow(`
			UPDATE services
			SET name = $1, description = $2, category_id = $3, type = $4, price = $5, status = $6, updated_at = NOW()
			WHERE id = $7
			RETURNING created_at, updated_at
		`, name, description, payload.CategoryID, svcType, payload.Price, status, id)

		if err := result.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "service not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update service")
			return
		}

		var categoryName string
		_ = db.QueryRow(`SELECT name FROM service_categories WHERE id = $1`, payload.CategoryID).Scan(&categoryName)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id":           id,
			"name":         name,
			"description":  description,
			"categoryId":   payload.CategoryID,
			"categoryName": categoryName,
			"type":         svcType,
			"price":        payload.Price,
			"status":       status,
			"createdAt":    createdAt.UTC().Format(time.RFC3339),
			"updatedAt":    updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM services WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete service")
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "service not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func parseIDFromPath(path string, prefix string) (int64, error) {
	trimmed := strings.TrimPrefix(path, prefix)
	trimmed = strings.Trim(trimmed, "/")
	if trimmed == "" {
		return 0, fmt.Errorf("missing id")
	}

	id, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid id")
	}

	return id, nil
}

func normalizeCategoryStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "actif" || value == "inactif" {
		return value
	}
	return ""
}

func normalizeServiceStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "actif" || value == "inactif" || value == "brouillon" {
		return value
	}
	return ""
}

func normalizeServiceType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "service" || value == "atelier" || value == "formation" || value == "evenement" {
		return value
	}
	return ""
}

func normalizeEventCategoryStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "actif" || value == "inactif" {
		return value
	}
	return ""
}

func ensureEventsSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS event_categories (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'actif',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT event_categories_status_check CHECK (status IN ('actif', 'inactif'))
		)`,
		`CREATE TABLE IF NOT EXISTS events (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			category_id BIGINT,
			type TEXT NOT NULL,
			date_debut TIMESTAMPTZ NOT NULL,
			date_fin TIMESTAMPTZ NOT NULL,
			lieu TEXT NOT NULL DEFAULT '',
			capacite BIGINT,
			status TEXT NOT NULL DEFAULT 'brouillon',
			intervenant TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT events_type_check CHECK (type IN ('atelier', 'formation', 'evenement', 'conference')),
			CONSTRAINT events_status_check CHECK (status IN ('brouillon', 'planifie', 'valide', 'annule', 'termine')),
			CONSTRAINT events_dates_check CHECK (date_fin >= date_debut)
		)`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS category_id BIGINT`,
		`CREATE INDEX IF NOT EXISTS idx_events_date_debut ON events(date_debut)`,
		`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`,
		`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`,
		`CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id)` ,
		`CREATE INDEX IF NOT EXISTS idx_event_categories_status ON event_categories(status)` ,
		`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_id_fkey`,
		`ALTER TABLE events ADD CONSTRAINT events_category_id_fkey FOREIGN KEY (category_id) REFERENCES event_categories(id) ON DELETE RESTRICT`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return err
		}
	}

	seedCategories := []struct {
		name        string
		description string
		status      string
	}{
		{"Ateliers", "Sessions pratiques de reutilisation et transformation.", "actif"},
		{"Formations", "Parcours pedagogiques et montees en competence.", "actif"},
		{"Conferences", "Interventions et prises de parole publiques.", "actif"},
		{"Evenements communautaires", "Rencontres, portes ouvertes et journees speciales.", "actif"},
	}

	for _, category := range seedCategories {
		if _, err := db.Exec(`
			INSERT INTO event_categories (name, description, status)
			VALUES ($1, $2, $3)
			ON CONFLICT (name) DO NOTHING
		`, category.name, category.description, category.status); err != nil {
			return err
		}
	}

	if _, err := db.Exec(`
		UPDATE events e
		SET category_id = c.id
		FROM event_categories c
		WHERE e.category_id IS NULL
		AND c.name = CASE
			WHEN e.type = 'atelier' THEN 'Ateliers'
			WHEN e.type = 'formation' THEN 'Formations'
			WHEN e.type = 'conference' THEN 'Conferences'
			ELSE 'Evenements communautaires'
		END
	`); err != nil {
		return err
	}

	var eventCount int64
	if err := db.QueryRow(`SELECT COUNT(*) FROM events`).Scan(&eventCount); err != nil {
		return err
	}

	if eventCount > 0 {
		return nil
	}

	seedRows := []struct {
		name        string
		description string
		typeName    string
		start       string
		end         string
		location    string
		capacity    int64
		status      string
		speaker     string
	}{
		{"Atelier transformation de cagettes en etagere", "Atelier pratique de reutilisation bois pour mobilier utile.", "atelier", "2026-03-20T14:00:00Z", "2026-03-20T17:00:00Z", "Atelier La Fayette", 20, "planifie", "Claire Martin"},
		{"Formation initiation a l'upcycling", "Session de decouverte des bases pour particuliers.", "formation", "2026-03-23T09:30:00Z", "2026-03-23T12:30:00Z", "Paris 10", 25, "valide", "Yassine B."},
		{"Conference locale economie circulaire", "Conference ouverte autour des initiatives locales.", "conference", "2026-03-27T18:00:00Z", "2026-03-27T20:00:00Z", "Montreuil", 80, "planifie", "Sophie Laurent"},
		{"Atelier customisation textile", "Customisation creative de vetements recuperes.", "atelier", "2026-03-29T10:00:00Z", "2026-03-29T13:00:00Z", "Ivry", 16, "planifie", "Julien R."},
		{"Journee decouverte projets UpcycleConnect", "Presentation des projets et rencontre des animateurs.", "evenement", "2026-04-02T09:00:00Z", "2026-04-02T17:00:00Z", "Bourg-la-Reine", 60, "valide", "Claire Martin"},
	}

	for _, row := range seedRows {
		var categoryID int64
		categoryName := "Evenements communautaires"
		switch row.typeName {
		case "atelier":
			categoryName = "Ateliers"
		case "formation":
			categoryName = "Formations"
		case "conference":
			categoryName = "Conferences"
		}

		if err := db.QueryRow(`SELECT id FROM event_categories WHERE name = $1`, categoryName).Scan(&categoryID); err != nil {
			return err
		}

		if _, err := db.Exec(`
			INSERT INTO events (name, description, category_id, type, date_debut, date_fin, lieu, capacite, status, intervenant)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, row.name, row.description, categoryID, row.typeName, row.start, row.end, row.location, row.capacity, row.status, row.speaker); err != nil {
			return err
		}
	}

	return nil
}

func eventsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		statusFilter := normalizeEventStatus(strings.TrimSpace(r.URL.Query().Get("status")))
		typeFilter := normalizeEventType(strings.TrimSpace(r.URL.Query().Get("type")))

		var categoryID interface{}
		categoryRaw := strings.TrimSpace(r.URL.Query().Get("categoryId"))
		if categoryRaw != "" {
			parsedCategoryID, err := strconv.ParseInt(categoryRaw, 10, 64)
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid categoryId")
				return
			}
			categoryID = parsedCategoryID
		} else {
			categoryID = nil
		}

		rows, err := db.Query(`
			SELECT e.id, e.name, e.description, e.category_id, c.name, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.created_at, e.updated_at
			FROM events e
			JOIN event_categories c ON c.id = e.category_id
			WHERE ($1 = '' OR e.name ILIKE '%' || $1 || '%' OR e.description ILIKE '%' || $1 || '%' OR e.lieu ILIKE '%' || $1 || '%' OR e.intervenant ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%')
			AND ($2 = '' OR e.status = $2)
			AND ($3 = '' OR e.type = $3)
			AND ($4::BIGINT IS NULL OR e.category_id = $4)
			ORDER BY date_debut ASC, created_at DESC
		`, q, statusFilter, typeFilter, categoryID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list events")
			return
		}
		defer rows.Close()

		items := make([]map[string]interface{}, 0)
		for rows.Next() {
			item, err := scanEventRow(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse events")
				return
			}
			items = append(items, item)
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})

	case http.MethodPost:
		payload, startAt, endAt, err := parseAndValidateEventPayload(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var categoryName string
		if err := db.QueryRow(`SELECT name FROM event_categories WHERE id = $1`, payload.CategoryID).Scan(&categoryName); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, "category does not exist")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not validate category")
			return
		}

		var id int64
		var createdAt, updatedAt time.Time
		var capacity sql.NullInt64
		if payload.Capacite != nil {
			capacity = sql.NullInt64{Int64: *payload.Capacite, Valid: true}
		}

		err = db.QueryRow(`
			INSERT INTO events (name, description, category_id, type, date_debut, date_fin, lieu, capacite, status, intervenant)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id, created_at, updated_at
		`,
			strings.TrimSpace(payload.Name),
			strings.TrimSpace(payload.Description),
			payload.CategoryID,
			normalizeEventType(payload.Type),
			startAt,
			endAt,
			strings.TrimSpace(payload.Lieu),
			capacity,
			normalizeEventStatus(payload.Status),
			strings.TrimSpace(payload.Intervenant),
		).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create event")
			return
		}

		writeJSON(w, http.StatusCreated, mapEventPayload(id, payload, categoryName, startAt, endAt, createdAt, updatedAt))

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func eventByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/events/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	switch r.Method {
	case http.MethodGet:
		row := db.QueryRow(`
			SELECT e.id, e.name, e.description, e.category_id, c.name, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.created_at, e.updated_at
			FROM events e
			JOIN event_categories c ON c.id = e.category_id
			WHERE e.id = $1
		`, id)

		item, err := scanEventSingleRow(row)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "event not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not fetch event")
			return
		}

		writeJSON(w, http.StatusOK, item)

	case http.MethodPut:
		payload, startAt, endAt, err := parseAndValidateEventPayload(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var categoryName string
		if err := db.QueryRow(`SELECT name FROM event_categories WHERE id = $1`, payload.CategoryID).Scan(&categoryName); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, "category does not exist")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not validate category")
			return
		}

		var createdAt, updatedAt time.Time
		var capacity sql.NullInt64
		if payload.Capacite != nil {
			capacity = sql.NullInt64{Int64: *payload.Capacite, Valid: true}
		}

		result := db.QueryRow(`
			UPDATE events
			SET name = $1,
				description = $2,
				category_id = $3,
				type = $4,
				date_debut = $5,
				date_fin = $6,
				lieu = $7,
				capacite = $8,
				status = $9,
				intervenant = $10,
				updated_at = NOW()
			WHERE id = $11
			RETURNING created_at, updated_at
		`,
			strings.TrimSpace(payload.Name),
			strings.TrimSpace(payload.Description),
			payload.CategoryID,
			normalizeEventType(payload.Type),
			startAt,
			endAt,
			strings.TrimSpace(payload.Lieu),
			capacity,
			normalizeEventStatus(payload.Status),
			strings.TrimSpace(payload.Intervenant),
			id,
		)

		if err := result.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "event not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update event")
			return
		}

		writeJSON(w, http.StatusOK, mapEventPayload(id, payload, categoryName, startAt, endAt, createdAt, updatedAt))

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM events WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete event")
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func parseAndValidateEventPayload(r *http.Request) (eventPayload, time.Time, time.Time, error) {
	var payload eventPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("invalid JSON body")
	}

	if strings.TrimSpace(payload.Name) == "" {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("name is required")
	}
	if payload.CategoryID <= 0 {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("categoryId is required")
	}
	if normalizeEventType(payload.Type) == "" {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("invalid type")
	}
	if normalizeEventStatus(payload.Status) == "" {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("invalid status")
	}

	startAt, err := time.Parse(time.RFC3339, strings.TrimSpace(payload.DateDebut))
	if err != nil {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("invalid dateDebut")
	}
	endAt, err := time.Parse(time.RFC3339, strings.TrimSpace(payload.DateFin))
	if err != nil {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("invalid dateFin")
	}
	if endAt.Before(startAt) {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("dateFin must be after dateDebut")
	}

	if payload.Capacite != nil && *payload.Capacite < 0 {
		return payload, time.Time{}, time.Time{}, fmt.Errorf("capacite must be positive")
	}

	return payload, startAt.UTC(), endAt.UTC(), nil
}

func normalizeEventType(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "atelier" || value == "formation" || value == "evenement" || value == "conference" {
		return value
	}
	return ""
}

func normalizeEventStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "brouillon" || value == "planifie" || value == "valide" || value == "annule" || value == "termine" {
		return value
	}
	return ""
}

func mapEventPayload(id int64, payload eventPayload, categoryName string, startAt time.Time, endAt time.Time, createdAt time.Time, updatedAt time.Time) map[string]interface{} {
	data := map[string]interface{}{
		"id":          id,
		"name":        strings.TrimSpace(payload.Name),
		"description": strings.TrimSpace(payload.Description),
		"categoryId":  payload.CategoryID,
		"categoryName": categoryName,
		"type":        normalizeEventType(payload.Type),
		"dateDebut":   startAt.UTC().Format(time.RFC3339),
		"dateFin":     endAt.UTC().Format(time.RFC3339),
		"lieu":        strings.TrimSpace(payload.Lieu),
		"status":      normalizeEventStatus(payload.Status),
		"intervenant": strings.TrimSpace(payload.Intervenant),
		"createdAt":   createdAt.UTC().Format(time.RFC3339),
		"updatedAt":   updatedAt.UTC().Format(time.RFC3339),
	}

	if payload.Capacite != nil {
		data["capacite"] = *payload.Capacite
	} else {
		data["capacite"] = nil
	}

	return data
}

func scanEventRow(rows *sql.Rows) (map[string]interface{}, error) {
	var id, categoryID int64
	var name, description, categoryName, typeName, lieu, status, intervenant string
	var dateDebut, dateFin, createdAt, updatedAt time.Time
	var capacite sql.NullInt64

	err := rows.Scan(&id, &name, &description, &categoryID, &categoryName, &typeName, &dateDebut, &dateFin, &lieu, &capacite, &status, &intervenant, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	item := map[string]interface{}{
		"id":          id,
		"name":        name,
		"description": description,
		"categoryId":  categoryID,
		"categoryName": categoryName,
		"type":        typeName,
		"dateDebut":   dateDebut.UTC().Format(time.RFC3339),
		"dateFin":     dateFin.UTC().Format(time.RFC3339),
		"lieu":        lieu,
		"status":      status,
		"intervenant": intervenant,
		"createdAt":   createdAt.UTC().Format(time.RFC3339),
		"updatedAt":   updatedAt.UTC().Format(time.RFC3339),
	}

	if capacite.Valid {
		item["capacite"] = capacite.Int64
	} else {
		item["capacite"] = nil
	}

	return item, nil
}

func scanEventSingleRow(row *sql.Row) (map[string]interface{}, error) {
	var id, categoryID int64
	var name, description, categoryName, typeName, lieu, status, intervenant string
	var dateDebut, dateFin, createdAt, updatedAt time.Time
	var capacite sql.NullInt64

	err := row.Scan(&id, &name, &description, &categoryID, &categoryName, &typeName, &dateDebut, &dateFin, &lieu, &capacite, &status, &intervenant, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	item := map[string]interface{}{
		"id":          id,
		"name":        name,
		"description": description,
		"categoryId":  categoryID,
		"categoryName": categoryName,
		"type":        typeName,
		"dateDebut":   dateDebut.UTC().Format(time.RFC3339),
		"dateFin":     dateFin.UTC().Format(time.RFC3339),
		"lieu":        lieu,
		"status":      status,
		"intervenant": intervenant,
		"createdAt":   createdAt.UTC().Format(time.RFC3339),
		"updatedAt":   updatedAt.UTC().Format(time.RFC3339),
	}

	if capacite.Valid {
		item["capacite"] = capacite.Int64
	} else {
		item["capacite"] = nil
	}

	return item, nil
}

func eventCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		statusFilter := normalizeEventCategoryStatus(strings.TrimSpace(r.URL.Query().Get("status")))

		rows, err := db.Query(`
			SELECT c.id, c.name, c.description, c.status, c.created_at, c.updated_at, COUNT(e.id) AS linked_events
			FROM event_categories c
			LEFT JOIN events e ON e.category_id = c.id
			WHERE ($1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.description ILIKE '%' || $1 || '%')
			AND ($2 = '' OR c.status = $2)
			GROUP BY c.id
			ORDER BY c.created_at DESC
		`, q, statusFilter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list categories")
			return
		}
		defer rows.Close()

		items := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var name, description, status string
			var createdAt, updatedAt time.Time
			var linkedEvents int64

			if err := rows.Scan(&id, &name, &description, &status, &createdAt, &updatedAt, &linkedEvents); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse categories")
				return
			}

			items = append(items, map[string]interface{}{
				"id":           id,
				"name":         name,
				"description":  description,
				"status":       status,
				"linkedEvents": linkedEvents,
				"createdAt":    createdAt.UTC().Format(time.RFC3339),
				"updatedAt":    updatedAt.UTC().Format(time.RFC3339),
			})
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})

	case http.MethodPost:
		var payload eventCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		name := strings.TrimSpace(payload.Name)
		description := strings.TrimSpace(payload.Description)
		status := normalizeEventCategoryStatus(payload.Status)

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if status == "" {
			status = "actif"
		}

		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO event_categories (name, description, status)
			VALUES ($1, $2, $3)
			RETURNING id, created_at, updated_at
		`, name, description, status).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create category")
			return
		}

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":           id,
			"name":         name,
			"description":  description,
			"status":       status,
			"linkedEvents": 0,
			"createdAt":    createdAt.UTC().Format(time.RFC3339),
			"updatedAt":    updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func eventCategoryByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/event-categories/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var payload eventCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		name := strings.TrimSpace(payload.Name)
		description := strings.TrimSpace(payload.Description)
		status := normalizeEventCategoryStatus(payload.Status)

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if status == "" {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}

		var createdAt, updatedAt time.Time
		result := db.QueryRow(`
			UPDATE event_categories
			SET name = $1, description = $2, status = $3, updated_at = NOW()
			WHERE id = $4
			RETURNING created_at, updated_at
		`, name, description, status, id)

		if err := result.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "category not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update category")
			return
		}

		var linkedEvents int64
		_ = db.QueryRow(`SELECT COUNT(*) FROM events WHERE category_id = $1`, id).Scan(&linkedEvents)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id":           id,
			"name":         name,
			"description":  description,
			"status":       status,
			"linkedEvents": linkedEvents,
			"createdAt":    createdAt.UTC().Format(time.RFC3339),
			"updatedAt":    updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		var linkedEvents int64
		if err := db.QueryRow(`SELECT COUNT(*) FROM events WHERE category_id = $1`, id).Scan(&linkedEvents); err != nil {
			writeError(w, http.StatusInternalServerError, "could not check category relations")
			return
		}

		if linkedEvents > 0 {
			writeError(w, http.StatusConflict, "cannot delete a category with linked events")
			return
		}

		result, err := db.Exec(`DELETE FROM event_categories WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete category")
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}

		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	type loginRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email != adminEmail {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword(adminPasswordHash, []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	now := time.Now().UTC()
	expiresAt := now.Add(jwtExpiration)
	claims := jwt.MapClaims{
		"sub":   adminEmail,
		"email": adminEmail,
		"role":  "admin",
		"iat":   now.Unix(),
		"exp":   expiresAt.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token":      tokenString,
		"token_type": "Bearer",
		"expires_at": expiresAt.Format(time.RFC3339),
		"user": map[string]string{
			"email": adminEmail,
			"role":  "admin",
		},
	})
}

func meHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	claimsValue := r.Context().Value(authClaimsKey)
	claims, ok := claimsValue.(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "invalid auth context")
		return
	}

	email, _ := claims["email"].(string)
	role, _ := claims["role"].(string)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"authenticated": true,
		"user": map[string]string{
			"email": email,
			"role":  role,
		},
	})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
