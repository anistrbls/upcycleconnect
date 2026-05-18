package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"upcycleconnect/api/items"
	"upcycleconnect/api/pricing"
	"upcycleconnect/api/projects"
	"upcycleconnect/api/planning"
	"upcycleconnect/api/reservations"
	"upcycleconnect/api/sirene"
	"upcycleconnect/api/users"
)

var db *sql.DB

const authClaimsKey = "authClaims"

var adminEmail string
var adminPasswordHash []byte
var jwtSecret []byte
var jwtExpiration time.Duration

func main() {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable client_encoding=UTF8",
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

	if err := ensurePlanningRulesSchema(); err != nil {
		log.Fatalf("Planning rules schema initialization error: %v", err)
	}
	log.Println("✓ Planning rules schema initialized")

	if err := ensureItemCategoriesSchema(); err != nil {
		log.Fatalf("Item categories schema initialization error: %v", err)
	}
	log.Println("✓ Item categories schema initialized")

	if err := ensureItemConditionsSchema(); err != nil {
		log.Fatalf("Item conditions schema initialization error: %v", err)
	}
	log.Println("✓ Item conditions schema initialized")

	if err := ensureItemMaterialsSchema(); err != nil {
		log.Fatalf("failed to init item_materials schema: %v", err)
	}
	if err := ensureItemCountriesSchema(); err != nil {
		log.Fatalf("failed to init item_countries schema: %v", err)
	}
	if err := ensureDepositPointTypesSchema(); err != nil {
		log.Fatalf("failed to init deposit_point_types schema: %v", err)
	}
	if err := ensureModerationReasonsSchema(); err != nil {
		log.Fatalf("failed to init moderation_reasons schema: %v", err)
	}
	log.Println("✓ Item materials schema initialized")

	if err := ensureCitiesSchema(); err != nil {
		log.Fatalf("failed to init cities schema: %v", err)
	}
	log.Println("✓ Cities schema initialized")

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /ping", pingHandler)
	mux.HandleFunc("GET /api/status", statusHandler)
	mux.HandleFunc("/api/auth/login", loginHandler)
	inseeClient := newInseeClient()
	mux.HandleFunc("POST /api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		handleRegister(w, r, inseeClient)
	})
	mux.HandleFunc("GET /api/siret/validate", func(w http.ResponseWriter, r *http.Request) {
		handleSiretValidate(w, r, inseeClient)
	})
	mux.Handle("/api/auth/me", authMiddleware(http.HandlerFunc(meHandler)))
	mux.Handle("/api/admin/service-categories", authMiddleware(http.HandlerFunc(serviceCategoriesHandler)))
	mux.Handle("/api/admin/service-categories/", authMiddleware(http.HandlerFunc(serviceCategoryByIDHandler)))
	mux.Handle("/api/admin/services", authMiddleware(http.HandlerFunc(servicesHandler)))
	mux.Handle("/api/admin/services/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/status") {
			serviceStatusHandler(w, r)
			return
		}
		serviceByIDHandler(w, r)
	})))
	mux.Handle("/api/admin/finances/payments", authMiddleware(http.HandlerFunc(adminFinancesPaymentsHandler)))
	mux.Handle("/api/finances/my-payments", authMiddleware(http.HandlerFunc(myFinancesPaymentsHandler)))
	mux.Handle("/api/admin/event-refund-requests", authMiddleware(http.HandlerFunc(adminEventRefundRequestsHandler)))
	mux.Handle("/api/admin/event-registrations/", authMiddleware(http.HandlerFunc(adminEventRegistrationRefundRoutes)))
	mux.Handle("/api/admin/finances/sale-commission", authMiddleware(http.HandlerFunc(adminSaleCommissionHandler)))
	mux.Handle("/api/admin/offers/overview", authMiddleware(http.HandlerFunc(offersOverviewHandler)))
	mux.Handle("/api/admin/events", authMiddleware(http.HandlerFunc(eventsHandler)))
	mux.Handle("/api/admin/events/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Handling POST actions
		if r.Method == http.MethodPost {
			if strings.HasSuffix(path, "/validate") {
				eventValidateHandler(w, r)
				return
			}
			if strings.HasSuffix(path, "/reject") {
				eventRejectHandler(w, r)
				return
			}
			if strings.HasSuffix(path, "/cancel") {
				adminEventCancelHandler(w, r)
				return
			}
			if strings.Contains(path, "/participants/") && strings.HasSuffix(path, "/absent") {
				adminEventRegistrationMarkAbsentHandler(w, r)
				return
			}
		}
		// Handling GET actions
		if r.Method == http.MethodGet {
			if strings.HasSuffix(path, "/participants") {
				eventParticipantsHandler(w, r)
				return
			}
		}
		// Default to ID handler
		eventByIDHandler(w, r)
	})))
	mux.HandleFunc("GET /api/events", publicEventsHandler)
	mux.Handle("/api/events/my-registrations", authMiddleware(http.HandlerFunc(myRegistrationsHandler)))
	mux.Handle("/api/events/confirm-payment", authMiddleware(http.HandlerFunc(eventConfirmPaymentHandler)))
	mux.Handle("/api/events/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/register") {
			eventRegisterHandler(w, r)
			return
		}
		if strings.HasSuffix(path, "/checkout") {
			eventCheckoutHandler(w, r)
			return
		}
		if strings.HasSuffix(path, "/participants") && r.Method == http.MethodGet {
			eventParticipantsHandler(w, r)
			return
		}
		if r.Method == http.MethodGet {
			eventByIDHandler(w, r)
			return
		}
		http.NotFound(w, r)
	})))

	// Item categories (catégories d'objets pour les annonces)
	mux.HandleFunc("GET /api/item-categories", itemCategoriesPublicHandler)
	mux.Handle("/api/admin/item-categories", authMiddleware(http.HandlerFunc(itemCategoriesAdminHandler)))
	mux.Handle("/api/admin/item-categories/", authMiddleware(http.HandlerFunc(itemCategoryByIDAdminHandler)))

	// Item conditions (états des objets pour les annonces)
	mux.HandleFunc("GET /api/item-conditions", itemConditionsPublicHandler)
	mux.Handle("/api/admin/item-conditions", authMiddleware(http.HandlerFunc(itemConditionsAdminHandler)))
	mux.Handle("/api/admin/item-conditions/", authMiddleware(http.HandlerFunc(itemConditionByIDAdminHandler)))

	// Item materials (matériaux des objets pour les annonces)
	mux.HandleFunc("GET /api/item-materials", itemMaterialsPublicHandler)
	mux.Handle("/api/admin/item-materials", authMiddleware(http.HandlerFunc(itemMaterialsAdminHandler)))
	mux.Handle("/api/admin/item-materials/", authMiddleware(http.HandlerFunc(itemMaterialByIDAdminHandler)))

	// === Item Countries ===
	mux.HandleFunc("GET /api/item-countries", itemCountriesPublicHandler)
	mux.Handle("/api/admin/item-countries", authMiddleware(http.HandlerFunc(itemCountriesAdminHandler)))
	mux.Handle("/api/admin/item-countries/", authMiddleware(http.HandlerFunc(itemCountryByIDAdminHandler)))

	// === Deposit Point Types ===
	mux.HandleFunc("GET /api/deposit-point-types", depositPointTypesPublicHandler)
	mux.Handle("/api/admin/deposit-point-types", authMiddleware(http.HandlerFunc(depositPointTypesAdminHandler)))
	mux.Handle("/api/admin/deposit-point-types/", authMiddleware(http.HandlerFunc(depositPointTypeByIDAdminHandler)))

	// === Moderation Reasons ===
	mux.HandleFunc("GET /api/moderation-reasons", moderationReasonsPublicHandler)
	mux.Handle("/api/admin/moderation-reasons", authMiddleware(http.HandlerFunc(moderationReasonsAdminHandler)))
	mux.Handle("/api/admin/moderation-reasons/", authMiddleware(http.HandlerFunc(moderationReasonByIDAdminHandler)))

	// === Cities Autocomplete (Public) ===
	mux.HandleFunc("GET /api/cities-search", citiesSearchHandler)

	// === Dashboard Stats (Admin) ===
	mux.Handle("/api/admin/dashboard/stats", authMiddleware(http.HandlerFunc(dashboardStatsHandler)))

	// Module users — doit etre initialise avant items (FK items.user_id -> users.id)
	users.RegisterRoutes(mux, db, authMiddleware)

	// Ensure admin user exists in database for foreign key constraints
	go func() {
		// Wait a bit for everything to be ready
		time.Sleep(2 * time.Second)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var existingAdminID int64
		err := db.QueryRowContext(ctx, "SELECT id FROM users WHERE email = $1", adminEmail).Scan(&existingAdminID)
		if err == sql.ErrNoRows {
			log.Printf("Seeding admin user in database: %s", adminEmail)
			_, err = db.ExecContext(ctx, `
				INSERT INTO users (firstname, lastname, email, password_hash, role, status)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, "Admin", "System", adminEmail, string(adminPasswordHash), "admin", "active")
			if err != nil {
				log.Printf("Warning: failed to seed admin user: %v", err)
			}
		} else if err != nil && err != context.Canceled {
			log.Printf("Warning: database error checking admin user: %v", err)
		}
	}()

	// Module items (Annonces)
	items.RegisterRoutes(mux, db, authMiddleware)

	// Module reservations (dépend de users + services, doit venir après)
	reservations.RegisterRoutes(mux, db, authMiddleware)
	planning.RegisterRoutes(mux, db, authMiddleware)

	// ── Endpoints publics prestations (catalogue utilisateur connecté) ──────────
	mux.Handle("/api/services", authMiddleware(http.HandlerFunc(publicServicesListHandler)))
	mux.Handle("/api/services/", authMiddleware(http.HandlerFunc(publicServiceByIDHandler)))

	// Module projects (projets d'upcycling professionnels)
	projects.RegisterRoutes(mux, db, authMiddleware)

	// Module pricing
	pricing.RegisterRoutes(mux, db, authMiddleware)

	// Module salarié — contenus (conseils + actualités)
	if err := ensureSalarieContentsSchema(); err != nil {
		log.Fatalf("Salarie contents schema error: %v", err)
	}
	log.Println("✓ Salarie contents schema initialized")
	mux.Handle("/api/salarie/contents", authMiddleware(http.HandlerFunc(salarieContentsHandler)))
	mux.Handle("/api/salarie/contents/feed", authMiddleware(http.HandlerFunc(salarieContentsFeedHandler)))
	mux.Handle("/api/salarie/contents/like/", authMiddleware(http.HandlerFunc(salarieContentLikeHandler)))
	mux.Handle("/api/salarie/contents/favorite/", authMiddleware(http.HandlerFunc(salarieContentFavoriteHandler)))
	mux.Handle("/api/salarie/contents/", authMiddleware(http.HandlerFunc(salarieContentByIDHandler)))
	mux.Handle("/api/admin/salarie-contents", authMiddleware(http.HandlerFunc(adminSalarieContentsHandler)))
	mux.Handle("/api/admin/salarie-contents/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/validate") && r.Method == http.MethodPost {
			adminSalarieContentValidateHandler(w, r)
			return
		}
		if strings.HasSuffix(path, "/reject") && r.Method == http.MethodPost {
			adminSalarieContentRejectHandler(w, r)
			return
		}
		switch r.Method {
		case http.MethodGet, http.MethodPut, http.MethodDelete:
			adminSalarieContentByIDHandler(w, r)
		default:
			http.NotFound(w, r)
		}
	})))

	// Module salarié — événements (mes formations)
	mux.Handle("/api/salarie/events", authMiddleware(http.HandlerFunc(salarieMemberEventsHandler)))
	mux.Handle("/api/salarie/events/", authMiddleware(http.HandlerFunc(salarieMemberEventByIDHandler)))

	// Module Forum
	if err := ensureForumSchema(); err != nil {
		log.Fatalf("Forum schema error: %v", err)
	}
	log.Println("✓ Forum schema initialized")
	mux.Handle("/api/forum/topics", authMiddleware(http.HandlerFunc(forumTopicsHandler)))
	mux.Handle("/api/forum/topics/", authMiddleware(http.HandlerFunc(forumTopicByIDHandler)))
	mux.Handle("/api/forum/replies", authMiddleware(http.HandlerFunc(forumRepliesHandler)))
	mux.Handle("/api/forum/replies/", authMiddleware(http.HandlerFunc(forumReplyByIDHandler)))
	mux.Handle("/api/forum/reports", authMiddleware(http.HandlerFunc(forumReportsHandler)))
	mux.Handle("/api/forum/reports/", authMiddleware(http.HandlerFunc(forumReportByIDHandler)))

	port := getEnv("API_PORT", "8080")

	loggerMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("Request: %s %s", r.Method, r.URL.Path)
			next.ServeHTTP(w, r)
		})
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      corsMiddleware(loggerMiddleware(mux)),
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

func newInseeClient() *sirene.Client {
	// Utilise l'API Recherche d'Entreprises (data.gouv.fr) — aucune clé requise
	return sirene.NewClient()
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

// utf8ContentTypeWriter ajoute charset=utf-8 aux réponses JSON/texte pour que navigateurs
// et intermédiaires interprètent correctement accents et emojis.
type utf8ContentTypeWriter struct {
	http.ResponseWriter
}

func (w *utf8ContentTypeWriter) normalizeContentType() {
	ct := w.Header().Get("Content-Type")
	if ct == "" {
		return
	}
	base := strings.TrimSpace(strings.Split(strings.ToLower(ct), ";")[0])
	switch base {
	case "application/json":
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
	case "text/plain":
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	}
}

func (w *utf8ContentTypeWriter) WriteHeader(code int) {
	w.normalizeContentType()
	w.ResponseWriter.WriteHeader(code)
}

func (w *utf8ContentTypeWriter) Write(b []byte) (int, error) {
	w.normalizeContentType()
	return w.ResponseWriter.Write(b)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(&utf8ContentTypeWriter{ResponseWriter: w}, r)
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

		r = r.WithContext(context.WithValue(r.Context(), "authClaims", claims))

		// Vérification de l'invalidation de session (ex: après changement de mot de passe)
		if iat, ok := claims["iat"].(float64); ok {
			userID, _ := claims["userId"].(float64)
			var invalidBefore sql.NullTime
			err := db.QueryRow("SELECT sessions_invalid_before FROM users WHERE id = $1", int64(userID)).Scan(&invalidBefore)
			if err == nil && invalidBefore.Valid && float64(invalidBefore.Time.Unix()) > iat {
				writeError(w, http.StatusUnauthorized, "session invalidated")
				return
			}
		}

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
	Name                string   `json:"name"`
	ShortDescription    string   `json:"shortDescription"`
	Description         string   `json:"description"`
	CategoryID          int64    `json:"categoryId"`
	Type                string   `json:"bookingMode"`
	Price               float64  `json:"price"`
	DurationMinutes     int      `json:"durationMinutes"`
	TargetAudience      string   `json:"targetAudience"`
	ImageURL            string   `json:"imageUrl"`
	Photos              []string `json:"photos"`
	Status              string   `json:"status"`
}

type eventPayload struct {
	Name             string  `json:"name"`
	Description      string  `json:"description"`
	CategoryID       int64   `json:"categoryId"`
	Type             string  `json:"type"`
	DateDebut        string  `json:"dateDebut"`
	DateFin          string  `json:"dateFin"`
	Lieu             string  `json:"lieu"`
	Capacite         *int64  `json:"capacite"`
	Status           string  `json:"status"`
	Intervenant      string  `json:"intervenant"`
	IntervenantID    *int64  `json:"intervenantId"`
	ValidationStatus string  `json:"validationStatus"`
	RejectionComment string  `json:"rejectionComment"`
	ImageUrl         string  `json:"imageUrl"`
	PricingType      string  `json:"pricingType"`
	Price            float64 `json:"price"`
}

type eventRejectPayload struct {
	Comment string `json:"comment"`
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
		// Migration douce : ajoute is_bookable si la colonne n'existe pas encore
		`ALTER TABLE services ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT true`,
		// Nouvelles colonnes prestations
		`ALTER TABLE services ADD COLUMN IF NOT EXISTS short_description TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE services ADD COLUMN IF NOT EXISTS detailed_description TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE services ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}'`,
		// Migration Mode de fonctionnement : request vs booking
		`DO $$ BEGIN
			IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_type_check') THEN
				ALTER TABLE services DROP CONSTRAINT services_type_check;
			END IF;
		END $$`,
		`UPDATE services SET type = 'booking' WHERE type NOT IN ('request', 'booking') AND is_bookable = true`,
		`UPDATE services SET type = 'request' WHERE type NOT IN ('request', 'booking') AND is_bookable = false`,
		`ALTER TABLE services ADD CONSTRAINT services_type_check CHECK (type IN ('request', 'booking'))`,
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
			SELECT s.id, s.name, s.short_description, s.description,
			       s.category_id, c.name, s.type, s.price, s.duration_minutes, s.target_audience,
			       s.is_bookable, s.image_url, s.photos, s.status, s.created_at, s.updated_at
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
			var name, shortDesc, description, categoryName, svcType, targetAudience, imageURL, status string
			var price float64
			var durationMinutes int
			var photos []string
			var isBookable bool
			var createdAt, updatedAt time.Time

			if err := rows.Scan(&id, &name, &shortDesc, &description, &catID, &categoryName, &svcType, &price, &durationMinutes, &targetAudience, &isBookable, &imageURL, pq.Array(&photos), &status, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse services")
				return
			}

			result = append(result, map[string]interface{}{
				"id":                  id,
				"name":                name,
				"shortDescription":    shortDesc,
				"description":         description,
				"categoryId":          catID,
				"categoryName":        categoryName,
				"type":                svcType,
				"price":               price,
				"durationMinutes":     durationMinutes,
				"targetAudience":      targetAudience,
				"isBookable":          isBookable,
				"imageUrl":            imageURL,
				"photos":              photos,
				"status":              status,
				"createdAt":           createdAt.UTC().Format(time.RFC3339),
				"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
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
		shortDesc := strings.TrimSpace(payload.ShortDescription)
		description := strings.TrimSpace(payload.Description)
		bookingMode := normalizeBookingMode(payload.Type)
		status := normalizeServiceStatus(payload.Status)
		targetAudience := payload.TargetAudience
		if targetAudience != "particulier" && targetAudience != "professionnel" && targetAudience != "tous" {
			targetAudience = "tous"
		}

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if payload.CategoryID <= 0 {
			writeError(w, http.StatusBadRequest, "categoryId is required")
			return
		}
		if bookingMode == "" {
			writeError(w, http.StatusBadRequest, "invalid booking mode")
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
			INSERT INTO services (name, short_description, description, category_id, type, price, duration_minutes, target_audience, is_bookable, image_url, photos, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			RETURNING id, created_at, updated_at
		`, name, shortDesc, description, payload.CategoryID, bookingMode, payload.Price, payload.DurationMinutes, targetAudience, bookingMode == "booking", payload.ImageURL, pq.Array(payload.Photos), status).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create service")
			return
		}

		var categoryName string
		_ = db.QueryRow(`SELECT name FROM service_categories WHERE id = $1`, payload.CategoryID).Scan(&categoryName)

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":                  id,
			"name":                name,
			"shortDescription":    shortDesc,
			"description":         description,
			"categoryId":          payload.CategoryID,
			"categoryName":        categoryName,
			"bookingMode":         bookingMode,
			"price":               payload.Price,
			"durationMinutes":     payload.DurationMinutes,
			"targetAudience":      targetAudience,
			"isBookable":          bookingMode == "booking",
			"imageUrl":            payload.ImageURL,
			"photos":              payload.Photos,
			"status":              status,
			"createdAt":           createdAt.UTC().Format(time.RFC3339),
			"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
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
		shortDesc := strings.TrimSpace(payload.ShortDescription)
		description := strings.TrimSpace(payload.Description)
		detailedDesc := strings.TrimSpace(payload.DetailedDescription)
		bookingMode := normalizeBookingMode(payload.BookingMode)
		status := normalizeServiceStatus(payload.Status)
		targetAudience := payload.TargetAudience
		if targetAudience != "particulier" && targetAudience != "professionnel" && targetAudience != "tous" {
			targetAudience = "tous"
		}

		if name == "" {
			writeError(w, http.StatusBadRequest, "name is required")
			return
		}
		if payload.CategoryID <= 0 {
			writeError(w, http.StatusBadRequest, "categoryId is required")
			return
		}
		if bookingMode == "" {
			writeError(w, http.StatusBadRequest, "invalid booking mode")
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
			SET name = $1, short_description = $2, description = $3,
			    category_id = $4, type = $5, price = $6, duration_minutes = $7,
			    target_audience = $8, is_bookable = $9, image_url = $10, photos = $11, status = $12, updated_at = NOW()
			WHERE id = $13
			RETURNING created_at, updated_at
		`, name, shortDesc, description, payload.CategoryID, bookingMode, payload.Price,
			payload.DurationMinutes, targetAudience, bookingMode == "booking", payload.ImageURL, pq.Array(payload.Photos), status, id)

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
			"id":                  id,
			"name":                name,
			"shortDescription":    shortDesc,
			"description":         description,
			"categoryId":          payload.CategoryID,
			"categoryName":        categoryName,
			"type":                bookingMode,
			"bookingMode":         bookingMode,
			"price":               payload.Price,
			"durationMinutes":     payload.DurationMinutes,
			"targetAudience":      targetAudience,
			"isBookable":          bookingMode == "booking",
			"imageUrl":            payload.ImageURL,
			"photos":              payload.Photos,
			"status":              status,
			"createdAt":           createdAt.UTC().Format(time.RFC3339),
			"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
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

// ── Handlers publics prestations ──────────────────────────────────────────────

// publicServicesListHandler gère GET /api/services (catalogue, utilisateur connecté)
func publicServicesListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	categoryRaw := strings.TrimSpace(r.URL.Query().Get("categoryId"))
	targetAudience := strings.TrimSpace(r.URL.Query().Get("targetAudience"))

	var categoryID interface{}
	if categoryRaw != "" {
		if id, err := strconv.ParseInt(categoryRaw, 10, 64); err == nil {
			categoryID = id
		}
	}
	if targetAudience != "particulier" && targetAudience != "professionnel" && targetAudience != "tous" {
		targetAudience = ""
	}

	rows, err := db.Query(`
		SELECT s.id, s.name, s.short_description, s.description,
		       s.category_id, c.name, s.type, s.price, s.duration_minutes, s.target_audience,
		       s.image_url, s.photos, s.status, s.created_at, s.updated_at
		FROM services s
		JOIN service_categories c ON c.id = s.category_id
		WHERE s.status = 'actif'
		AND ($1 = '' OR s.name ILIKE '%' || $1 || '%' OR s.short_description ILIKE '%' || $1 || '%')
		AND ($2::BIGINT IS NULL OR s.category_id = $2)
		AND ($3 = '' OR s.target_audience = $3 OR s.target_audience = 'tous')
		ORDER BY s.created_at DESC
	`, q, categoryID, targetAudience)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list services")
		return
	}
	defer rows.Close()

	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, catID int64
		var name, shortDesc, description, categoryName, svcType, status string
		var price float64
		var durationMinutes int
		var targetAud, imageURL string
		var photos []string
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&id, &name, &shortDesc, &description, &catID, &categoryName, &svcType, &price, &durationMinutes, &targetAud, &imageURL, pq.Array(&photos), &status, &createdAt, &updatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse services")
			return
		}
		result = append(result, map[string]interface{}{
			"id":                  id,
			"name":                name,
			"shortDescription":    shortDesc,
			"description":         description,
			"categoryId":          catID,
			"categoryName":        categoryName,
			"type":                svcType,
			"bookingMode":         svcType,
			"price":               price,
			"durationMinutes":     durationMinutes,
			"targetAudience":      targetAud,
			"isBookable":          svcType == "booking",
			"imageUrl":            imageURL,
			"photos":              photos,
			"status":              status,
			"createdAt":           createdAt.UTC().Format(time.RFC3339),
			"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
		})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

// publicServiceByIDHandler gère GET /api/services/:id (fiche détail)
func publicServiceByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/services/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid service id")
		return
	}
	var svcID, catID int64
	var name, shortDesc, description, detailedDesc, categoryName, svcType, status string
	var price float64
	var durationMinutes int
	var targetAudience, imageURL string
	var photos []string
	var isBookable bool
	var createdAt, updatedAt time.Time
	err = db.QueryRow(`
		SELECT s.id, s.name, s.short_description, s.description,
		       s.category_id, c.name, s.type, s.price, s.duration_minutes, s.target_audience,
		       s.image_url, s.photos, s.status, s.created_at, s.updated_at
		FROM services s
		JOIN service_categories c ON c.id = s.category_id
		WHERE s.id = $1 AND s.status = 'actif'
	`, id).Scan(&svcID, &name, &shortDesc, &description, &catID, &categoryName, &svcType, &price, &durationMinutes, &targetAudience, &imageURL, pq.Array(&photos), &status, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "service not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not get service")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":                  svcID,
		"name":                name,
		"shortDescription":    shortDesc,
		"description":         description,
		"categoryId":          catID,
		"categoryName":        categoryName,
		"type":                svcType,
		"bookingMode":         svcType,
		"price":               price,
		"durationMinutes":     durationMinutes,
		"targetAudience":      targetAudience,
		"isBookable":          svcType == "booking",
		"imageUrl":            imageURL,
		"photos":              photos,
		"status":              status,
		"createdAt":           createdAt.UTC().Format(time.RFC3339),
		"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
	})
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

// serviceStatusHandler gère PATCH /api/admin/services/:id/status
func serviceStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cleanPath := strings.TrimSuffix(r.URL.Path, "/status")
	id, err := parseIDFromPath(cleanPath+"/", "/api/admin/services/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid service id")
		return
	}

	var payload struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	status := normalizeServiceStatus(payload.Status)
	if status == "" {
		writeError(w, http.StatusBadRequest, "invalid status (actif, inactif, brouillon)")
		return
	}

	var updatedAt time.Time
	res := db.QueryRow(`
		UPDATE services SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, status, id)
	if err := res.Scan(&updatedAt); err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "service not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update service status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":        id,
		"status":    status,
		"updatedAt": updatedAt.UTC().Format(time.RFC3339),
	})
}

// offersOverviewHandler gère GET /api/admin/offers/overview
// Retourne les statistiques agrégées du module Offres & Prestations.
func offersOverviewHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var servicesTotal, servicesActive, servicesInactive int64
	_ = db.QueryRow(`SELECT COUNT(*) FROM services`).Scan(&servicesTotal)
	_ = db.QueryRow(`SELECT COUNT(*) FROM services WHERE status = 'actif'`).Scan(&servicesActive)
	_ = db.QueryRow(`SELECT COUNT(*) FROM services WHERE status = 'inactif'`).Scan(&servicesInactive)

	var categoriesTotal int64
	_ = db.QueryRow(`SELECT COUNT(*) FROM service_categories`).Scan(&categoriesTotal)

	var bookingsTotal, bookingsPending, bookingsConfirmed int64
	_ = db.QueryRow(`SELECT COUNT(*) FROM service_bookings`).Scan(&bookingsTotal)
	_ = db.QueryRow(`SELECT COUNT(*) FROM service_bookings WHERE status = 'pending'`).Scan(&bookingsPending)
	_ = db.QueryRow(`SELECT COUNT(*) FROM service_bookings WHERE status = 'confirmed'`).Scan(&bookingsConfirmed)

	// 5 réservations les plus récentes
	recentBookings := make([]map[string]interface{}, 0)
	bRows, err := db.Query(`
		SELECT sb.id, sb.status, sb.amount, sb.created_at,
		       COALESCE(u.firstname || ' ' || u.lastname, 'Utilisateur #' || sb.user_id::TEXT),
		       COALESCE(s.name, 'Prestation #' || sb.service_id::TEXT)
		FROM service_bookings sb
		LEFT JOIN users u    ON u.id = sb.user_id
		LEFT JOIN services s ON s.id = sb.service_id
		ORDER BY sb.created_at DESC LIMIT 5
	`)
	if err == nil {
		defer bRows.Close()
		for bRows.Next() {
			var bID int64
			var bStatus, bUserName, bServiceName string
			var bAmount float64
			var bCreatedAt time.Time
			if bRows.Scan(&bID, &bStatus, &bAmount, &bCreatedAt, &bUserName, &bServiceName) == nil {
				recentBookings = append(recentBookings, map[string]interface{}{
					"id": bID, "status": bStatus, "amount": bAmount,
					"userName": bUserName, "serviceName": bServiceName,
					"createdAt": bCreatedAt.UTC().Format(time.RFC3339),
				})
			}
		}
	}

	// 5 prestations les plus récentes
	recentServices := make([]map[string]interface{}, 0)
	sRows, err := db.Query(`
		SELECT s.id, s.name, s.status, s.price, s.created_at, COALESCE(c.name, '')
		FROM services s
		LEFT JOIN service_categories c ON c.id = s.category_id
		ORDER BY s.created_at DESC LIMIT 5
	`)
	if err == nil {
		defer sRows.Close()
		for sRows.Next() {
			var sID int64
			var sName, sStatus, sCatName string
			var sPrice float64
			var sCreatedAt time.Time
			if sRows.Scan(&sID, &sName, &sStatus, &sPrice, &sCreatedAt, &sCatName) == nil {
				recentServices = append(recentServices, map[string]interface{}{
					"id": sID, "name": sName, "status": sStatus,
					"price": sPrice, "categoryName": sCatName,
					"createdAt": sCreatedAt.UTC().Format(time.RFC3339),
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"servicesTotal":     servicesTotal,
		"servicesActive":    servicesActive,
		"servicesInactive":  servicesInactive,
		"categoriesTotal":   categoriesTotal,
		"bookingsTotal":     bookingsTotal,
		"bookingsPending":   bookingsPending,
		"bookingsConfirmed": bookingsConfirmed,
		"recentBookings":    recentBookings,
		"recentServices":    recentServices,
	})
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

func normalizeBookingMode(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "request" || value == "booking" {
		return value
	}
	return "request"
}

func normalizeEventCategoryStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "actif" || value == "inactif" {
		return value
	}
	return ""
}

func ensurePlanningRulesSchema() error {
	// Table des règles de travail
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS employee_working_rules (
			employee_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			mon_active BOOLEAN DEFAULT TRUE, mon_start TEXT DEFAULT '09:00', mon_end TEXT DEFAULT '18:00',
			tue_active BOOLEAN DEFAULT TRUE, tue_start TEXT DEFAULT '09:00', tue_end TEXT DEFAULT '18:00',
			wed_active BOOLEAN DEFAULT TRUE, wed_start TEXT DEFAULT '09:00', wed_end TEXT DEFAULT '18:00',
			thu_active BOOLEAN DEFAULT TRUE, thu_start TEXT DEFAULT '09:00', thu_end TEXT DEFAULT '18:00',
			fri_active BOOLEAN DEFAULT TRUE, fri_start TEXT DEFAULT '09:00', fri_end TEXT DEFAULT '18:00',
			sat_active BOOLEAN DEFAULT FALSE, sat_start TEXT DEFAULT '09:00', sat_end TEXT DEFAULT '18:00',
			sun_active BOOLEAN DEFAULT FALSE, sun_start TEXT DEFAULT '09:00', sun_end TEXT DEFAULT '18:00',
			works_public_holidays BOOLEAN DEFAULT FALSE,
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return err
	}

	// Table des créneaux de prestation (Slots)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS service_slots (
			id BIGSERIAL PRIMARY KEY,
			service_id BIGINT REFERENCES services(id) ON DELETE CASCADE,
			employee_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
			start_time TIMESTAMPTZ NOT NULL,
			end_time TIMESTAMPTZ NOT NULL,
			capacity INT NOT NULL DEFAULT 1,
			is_available BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	if err != nil {
		return err
	}

	// Table des indisponibilités
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS employee_unavailabilities (
			id BIGSERIAL PRIMARY KEY,
			employee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			start_time TIMESTAMPTZ NOT NULL,
			end_time TIMESTAMPTZ NOT NULL,
			reason TEXT NOT NULL DEFAULT 'Indisponibilité',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	return err
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
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'approved'`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_comment TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'gratuit'`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0.00`,
		`ALTER TABLE events ADD COLUMN IF NOT EXISTS participant_count BIGINT NOT NULL DEFAULT 0`,
		`DO $$ BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'events_pricing_type_check'
			) THEN
				ALTER TABLE events ADD CONSTRAINT events_pricing_type_check CHECK (pricing_type IN ('gratuit', 'payant'));
			END IF;
		END $$`,
		`CREATE TABLE IF NOT EXISTS event_registrations (
			id BIGSERIAL PRIMARY KEY,
			event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			payment_status TEXT NOT NULL DEFAULT 'gratuit',
			stripe_session_id TEXT NOT NULL DEFAULT '',
			stripe_payment_intent_id TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(event_id, user_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS is_absent BOOLEAN NOT NULL DEFAULT false`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none'`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS refund_error TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS cancelled_by TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS refund_request_reason TEXT NOT NULL DEFAULT ''`,
		`DO $$ BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'events_validation_status_check'
			) THEN
				ALTER TABLE events ADD CONSTRAINT events_validation_status_check CHECK (validation_status IN ('pending', 'approved', 'rejected'));
			END IF;
		END $$`,
		`CREATE INDEX IF NOT EXISTS idx_events_validation_status ON events(validation_status)`,
		`CREATE INDEX IF NOT EXISTS idx_events_date_debut ON events(date_debut)`,
		`CREATE INDEX IF NOT EXISTS idx_events_intervenant_id ON events(intervenant_id)`,
		`CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)`,
		`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return err
		}
	}

	return nil
}

func publicEventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	typeFilter := normalizeEventType(strings.TrimSpace(r.URL.Query().Get("type")))

	rows, err := db.Query(`
		SELECT e.id, e.name, e.description, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.intervenant_id, e.validation_status, e.rejection_comment, e.image_url, e.pricing_type, e.price, e.participant_count, e.created_at, e.updated_at
		FROM events e
		WHERE e.validation_status = 'approved'
		AND e.status = 'planifie'
		AND e.date_fin > NOW()
		AND ($1 = '' OR e.type = $1)
		ORDER BY e.date_debut ASC
	`, typeFilter)
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
}

func eventsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		statusFilter := normalizeEventStatus(strings.TrimSpace(r.URL.Query().Get("status")))
		typeFilter := normalizeEventType(strings.TrimSpace(r.URL.Query().Get("type")))

		validationStatusFilter := strings.TrimSpace(r.URL.Query().Get("validationStatus"))
		if validationStatusFilter != "pending" && validationStatusFilter != "approved" && validationStatusFilter != "rejected" {
			validationStatusFilter = ""
		}

		rows, err := db.Query(`
			SELECT e.id, e.name, e.description, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.intervenant_id, e.validation_status, e.rejection_comment, e.image_url, e.pricing_type, e.price, e.participant_count, e.created_at, e.updated_at
			FROM events e
			WHERE ($1 = '' OR e.name ILIKE '%' || $1 || '%' OR e.description ILIKE '%' || $1 || '%' OR e.lieu ILIKE '%' || $1 || '%' OR e.intervenant ILIKE '%' || $1 || '%')
			AND ($2 = '' OR e.status = $2)
			AND ($3 = '' OR e.type = $3)
			AND ($4 = '' OR e.validation_status = $4)
			AND (e.status != 'annule' OR $2 = 'annule')
			ORDER BY date_debut ASC, created_at DESC
		`, q, statusFilter, typeFilter, validationStatusFilter)
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

		if !startAt.After(time.Now().UTC()) {
			writeError(w, http.StatusBadRequest, "la date de début doit être dans le futur")
			return
		}

		var intervenantName string
		var intervenantID sql.NullInt64
		if payload.IntervenantID != nil {
			var role string
			var firstname, lastname string
			err := db.QueryRow(`SELECT role, firstname, lastname FROM users WHERE id = $1`, *payload.IntervenantID).Scan(&role, &firstname, &lastname)
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, "intervenant introuvable")
				return
			}
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not validate intervenant")
				return
			}
			if role != "salarie" {
				writeError(w, http.StatusBadRequest, "l'intervenant doit être un salarié")
				return
			}
			intervenantName = strings.TrimSpace(firstname + " " + lastname)
			intervenantID = sql.NullInt64{Int64: *payload.IntervenantID, Valid: true}
		}

		callerClaims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
		callerRole, _ := callerClaims["role"].(string)
		postValidationStatus := "approved"
		if callerRole == "salarie" {
			postValidationStatus = "pending"
		}

		var id int64
		var createdAt, updatedAt time.Time
		var capacity sql.NullInt64
		if payload.Capacite != nil {
			capacity = sql.NullInt64{Int64: *payload.Capacite, Valid: true}
		}

		err = db.QueryRow(`
			INSERT INTO events (name, description, type, date_debut, date_fin, lieu, capacite, status, intervenant, intervenant_id, validation_status, image_url, pricing_type, price)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			RETURNING id, created_at, updated_at
		`,
			strings.TrimSpace(payload.Name),
			strings.TrimSpace(payload.Description),
			normalizeEventType(payload.Type),
			startAt,
			endAt,
			strings.TrimSpace(payload.Lieu),
			capacity,
			normalizeEventStatus(payload.Status),
			intervenantName,
			intervenantID,
			postValidationStatus,
			strings.TrimSpace(payload.ImageUrl),
			payload.PricingType,
			payload.Price,
		).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create event")
			return
		}

		payload.Intervenant = intervenantName
		payload.ValidationStatus = postValidationStatus
		writeJSON(w, http.StatusCreated, mapEventPayload(id, payload, startAt, endAt, createdAt, updatedAt))

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func eventByIDHandler(w http.ResponseWriter, r *http.Request) {
	prefix := "/api/admin/events/"
	if strings.HasPrefix(r.URL.Path, "/api/events/") {
		prefix = "/api/events/"
	}
	id, err := parseIDFromPath(r.URL.Path, prefix)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	switch r.Method {
	case http.MethodGet:
		claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
		var userID int64
		if claims != nil {
			if val, ok := claims["userId"].(float64); ok {
				userID = int64(val)
			}
		}

		row := db.QueryRow(`
			SELECT e.id, e.name, e.description, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.intervenant_id, e.validation_status, e.rejection_comment, e.image_url, e.pricing_type, e.price, e.participant_count, e.created_at, e.updated_at,
			       COALESCE(NULLIF(er.stripe_payment_intent_id, ''), er.stripe_session_id) AS transaction_ref,
			       er.payment_status AS reg_payment_status
			FROM events e
			LEFT JOIN event_registrations er ON e.id = er.event_id AND er.user_id = $2
			WHERE e.id = $1
		`, id, userID)

		var transactionRef sql.NullString
		var regPaymentStatus sql.NullString
		var idVal int64
		var name, description, typeName, lieu, status, intervenant, validationStatus, rejectionComment, imageUrl, pricingType string
		var dateDebut, dateFin, createdAt, updatedAt time.Time
		var capacite sql.NullInt64
		var intervenantID sql.NullInt64
		var price float64
		var participantCount int64

		err := row.Scan(&idVal, &name, &description, &typeName, &dateDebut, &dateFin, &lieu, &capacite, &status, &intervenant, &intervenantID, &validationStatus, &rejectionComment, &imageUrl, &pricingType, &price, &participantCount, &createdAt, &updatedAt, &transactionRef, &regPaymentStatus)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "event not found")
				return
			}
			log.Printf("Error fetching event %d: %v", id, err)
			writeError(w, http.StatusInternalServerError, "could not fetch event")
			return
		}

		item := map[string]interface{}{
			"id":               idVal,
			"name":             name,
			"description":      description,
			"type":             typeName,
			"dateDebut":        dateDebut.UTC().Format(time.RFC3339),
			"dateFin":          dateFin.UTC().Format(time.RFC3339),
			"lieu":             lieu,
			"capacite":         nil,
			"status":           status,
			"intervenant":      intervenant,
			"intervenantId":    nil,
			"validationStatus": validationStatus,
			"rejectionComment": rejectionComment,
			"imageUrl":         imageUrl,
			"pricingType":      pricingType,
			"price":            price,
			"participantCount": participantCount,
			"createdAt":        createdAt.UTC().Format(time.RFC3339),
			"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
			"transactionRef":   nil,
		}
		if transactionRef.Valid {
			item["transactionRef"] = transactionRef.String
		}
		if regPaymentStatus.Valid {
			item["paymentStatus"] = regPaymentStatus.String
		}
		if capacite.Valid {
			item["capacite"] = capacite.Int64
		}
		if intervenantID.Valid {
			item["intervenantId"] = intervenantID.Int64
		}

		writeJSON(w, http.StatusOK, item)

	case http.MethodPut:
		payload, startAt, endAt, err := parseAndValidateEventPayload(r)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var intervenantName string
		var intervenantID sql.NullInt64
		if payload.IntervenantID != nil {
			var role string
			var firstname, lastname string
			err := db.QueryRow(`SELECT role, firstname, lastname FROM users WHERE id = $1`, *payload.IntervenantID).Scan(&role, &firstname, &lastname)
			if err == sql.ErrNoRows {
				writeError(w, http.StatusBadRequest, "intervenant introuvable")
				return
			}
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not validate intervenant")
				return
			}
			if role != "salarie" {
				writeError(w, http.StatusBadRequest, "l'intervenant doit être un salarié")
				return
			}
			intervenantName = strings.TrimSpace(firstname + " " + lastname)
			intervenantID = sql.NullInt64{Int64: *payload.IntervenantID, Valid: true}
		}

		putCallerClaims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
		putCallerRole, _ := putCallerClaims["role"].(string)

		var createdAt, updatedAt time.Time
		var capacity sql.NullInt64
		if payload.Capacite != nil {
			capacity = sql.NullInt64{Int64: *payload.Capacite, Valid: true}
		}

		result := db.QueryRow(`
			UPDATE events
			SET name = $1,
				description = $2,
				type = $3,
				date_debut = $4,
				date_fin = $5,
				lieu = $6,
				capacite = $7,
				status = $8,
				intervenant = $9,
				intervenant_id = $10,
				image_url = $13,
				pricing_type = $14,
				price = $15,
				validation_status = CASE WHEN $12 = 'salarie' THEN 'pending' ELSE validation_status END,
				rejection_comment = CASE WHEN $12 = 'salarie' THEN '' ELSE rejection_comment END,
				updated_at = NOW()
			WHERE id = $11
			RETURNING created_at, updated_at, validation_status, rejection_comment
		`,
			strings.TrimSpace(payload.Name),
			strings.TrimSpace(payload.Description),
			normalizeEventType(payload.Type),
			startAt,
			endAt,
			strings.TrimSpace(payload.Lieu),
			capacity,
			normalizeEventStatus(payload.Status),
			intervenantName,
			intervenantID,
			id,
			putCallerRole,
			strings.TrimSpace(payload.ImageUrl),
			payload.PricingType,
			payload.Price,
		)

		var retValidationStatus, retRejectionComment string
		if err := result.Scan(&createdAt, &updatedAt, &retValidationStatus, &retRejectionComment); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "event not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update event")
			return
		}

		payload.Intervenant = intervenantName
		payload.ValidationStatus = retValidationStatus
		payload.RejectionComment = retRejectionComment
		writeJSON(w, http.StatusOK, mapEventPayload(id, payload, startAt, endAt, createdAt, updatedAt))

	case http.MethodDelete:
		var registeredCount int64
		if err := db.QueryRow(`
			SELECT COUNT(*)
			FROM event_registrations
			WHERE event_id = $1 AND payment_status <> 'pending'
		`, id).Scan(&registeredCount); err != nil {
			writeError(w, http.StatusInternalServerError, "could not verify event registrations")
			return
		}

		if registeredCount > 0 {
			writeError(w, http.StatusConflict, "cannot delete event with registered participants; cancel it instead")
			return
		}

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

func normalizeValidationStatus(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "pending" || value == "approved" || value == "rejected" {
		return value
	}
	return "approved"
}

func mapEventPayload(id int64, payload eventPayload, startAt time.Time, endAt time.Time, createdAt time.Time, updatedAt time.Time) map[string]interface{} {
	data := map[string]interface{}{
		"id":               id,
		"name":             strings.TrimSpace(payload.Name),
		"description":      strings.TrimSpace(payload.Description),
		"type":             normalizeEventType(payload.Type),
		"dateDebut":        startAt.UTC().Format(time.RFC3339),
		"dateFin":          endAt.UTC().Format(time.RFC3339),
		"lieu":             strings.TrimSpace(payload.Lieu),
		"status":           normalizeEventStatus(payload.Status),
		"intervenant":      strings.TrimSpace(payload.Intervenant),
		"validationStatus": payload.ValidationStatus,
		"rejectionComment": payload.RejectionComment,
		"imageUrl":         payload.ImageUrl,
		"pricingType":      payload.PricingType,
		"price":            payload.Price,
		"participantCount": 0,
		"createdAt":        createdAt.UTC().Format(time.RFC3339),
		"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
	}

	if payload.IntervenantID != nil {
		data["intervenantId"] = *payload.IntervenantID
	} else {
		data["intervenantId"] = nil
	}

	if payload.Capacite != nil {
		data["capacite"] = *payload.Capacite
	} else {
		data["capacite"] = nil
	}

	return data
}

func scanEventRow(rows *sql.Rows) (map[string]interface{}, error) {
	var id int64
	var name, description, typeName, lieu, status, intervenant, validationStatus, rejectionComment, imageUrl, pricingType string
	var dateDebut, dateFin, createdAt, updatedAt time.Time
	var capacite sql.NullInt64
	var intervenantID sql.NullInt64
	var price float64
	var participantCount int64

	err := rows.Scan(&id, &name, &description, &typeName, &dateDebut, &dateFin, &lieu, &capacite, &status, &intervenant, &intervenantID, &validationStatus, &rejectionComment, &imageUrl, &pricingType, &price, &participantCount, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	item := map[string]interface{}{
		"id":               id,
		"name":             name,
		"description":      description,
		"type":             typeName,
		"dateDebut":        dateDebut.UTC().Format(time.RFC3339),
		"dateFin":          dateFin.UTC().Format(time.RFC3339),
		"lieu":             lieu,
		"capacite":         nil,
		"status":           status,
		"intervenant":      intervenant,
		"intervenantId":    nil,
		"validationStatus": validationStatus,
		"rejectionComment": rejectionComment,
		"imageUrl":         imageUrl,
		"pricingType":      pricingType,
		"price":            price,
		"participantCount": participantCount,
		"createdAt":        createdAt.UTC().Format(time.RFC3339),
		"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
	}
	if capacite.Valid {
		item["capacite"] = capacite.Int64
	}
	if intervenantID.Valid {
		item["intervenantId"] = intervenantID.Int64
	}
	return item, nil
}

func scanEventSingleRow(row *sql.Row) (map[string]interface{}, error) {
	var id int64
	var name, description, typeName, lieu, status, intervenant, validationStatus, rejectionComment, imageUrl, pricingType string
	var dateDebut, dateFin, createdAt, updatedAt time.Time
	var capacite sql.NullInt64
	var intervenantID sql.NullInt64
	var price float64
	var participantCount int64

	err := row.Scan(&id, &name, &description, &typeName, &dateDebut, &dateFin, &lieu, &capacite, &status, &intervenant, &intervenantID, &validationStatus, &rejectionComment, &imageUrl, &pricingType, &price, &participantCount, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}

	item := map[string]interface{}{
		"id":               id,
		"name":             name,
		"description":      description,
		"type":             typeName,
		"dateDebut":        dateDebut.UTC().Format(time.RFC3339),
		"dateFin":          dateFin.UTC().Format(time.RFC3339),
		"lieu":             lieu,
		"capacite":         nil,
		"status":           status,
		"intervenant":      intervenant,
		"intervenantId":    nil,
		"validationStatus": validationStatus,
		"rejectionComment": rejectionComment,
		"imageUrl":         imageUrl,
		"pricingType":      pricingType,
		"price":            price,
		"participantCount": participantCount,
		"createdAt":        createdAt.UTC().Format(time.RFC3339),
		"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
	}
	if capacite.Valid {
		item["capacite"] = capacite.Int64
	}
	if intervenantID.Valid {
		item["intervenantId"] = intervenantID.Int64
	}
	return item, nil
}

func myRegistrationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, _ := claims["userId"].(float64)
	userID := int64(userIDVal)

	rows, err := db.Query(`
		SELECT e.id, e.name, e.description, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.intervenant_id, e.validation_status, e.rejection_comment, e.image_url, e.pricing_type, e.price, e.participant_count, e.created_at, e.updated_at, er.payment_status, er.status as reg_status, er.refund_status, er.refund_amount,
		       COALESCE(NULLIF(er.stripe_payment_intent_id, ''), er.stripe_session_id) AS transaction_ref
		FROM event_registrations er
		JOIN events e ON e.id = er.event_id
		WHERE er.user_id = $1 AND er.payment_status <> 'pending'
		ORDER BY e.date_debut ASC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list registrations")
		return
	}
	defer rows.Close()

	items := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var name, description, typeName, lieu, status, intervenant, validationStatus, rejectionComment, imageUrl, pricingType string
		var dateDebut, dateFin, createdAt, updatedAt time.Time
		var capacite sql.NullInt64
		var intervenantID sql.NullInt64
		var price float64
		var participantCount int64
		var paymentStatus, regStatus, refundStatus string
		var refundAmount float64
		var transactionRef sql.NullString

		err := rows.Scan(&id, &name, &description, &typeName, &dateDebut, &dateFin, &lieu, &capacite, &status, &intervenant, &intervenantID, &validationStatus, &rejectionComment, &imageUrl, &pricingType, &price, &participantCount, &createdAt, &updatedAt, &paymentStatus, &regStatus, &refundStatus, &refundAmount, &transactionRef)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse registration")
			return
		}

		item := map[string]interface{}{
			"id":                 id,
			"name":               name,
			"description":        description,
			"type":               typeName,
			"dateDebut":          dateDebut.UTC().Format(time.RFC3339),
			"dateFin":            dateFin.UTC().Format(time.RFC3339),
			"lieu":               lieu,
			"capacite":           nil,
			"status":             status,
			"intervenant":        intervenant,
			"intervenantId":      nil,
			"validationStatus":   validationStatus,
			"rejectionComment":   rejectionComment,
			"imageUrl":           imageUrl,
			"pricingType":        pricingType,
			"price":              price,
			"participantCount":   participantCount,
			"paymentStatus":      paymentStatus,
			"registrationStatus": regStatus,
			"refundStatus":       refundStatus,
			"refundAmount":       refundAmount,
			"transactionRef":     nil,
			"createdAt":          createdAt.UTC().Format(time.RFC3339),
			"updatedAt":          updatedAt.UTC().Format(time.RFC3339),
		}
		if capacite.Valid {
			item["capacite"] = capacite.Int64
		}
		if intervenantID.Valid {
			item["intervenantId"] = intervenantID.Int64
		}
		items = append(items, item)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func eventParticipantsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	path := r.URL.Path
	prefix := "/api/events/"
	if strings.HasPrefix(path, "/api/admin/events/") {
		prefix = "/api/admin/events/"
	}
	path = strings.TrimSuffix(path, "/participants")

	id, err := parseIDFromPath(path, prefix)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	rows, err := db.Query(`
		SELECT u.id, u.firstname, u.lastname, u.email, er.created_at, er.status, er.payment_status, er.is_absent, er.refund_status, er.refund_amount, er.refund_error
		FROM users u
		JOIN event_registrations er ON er.user_id = u.id
		WHERE er.event_id = $1
		ORDER BY er.created_at ASC
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch participants")
		return
	}
	defer rows.Close()

	items := make([]map[string]interface{}, 0)
	for rows.Next() {
		var uid int64
		var fname, lname, email string
		var createdAt time.Time
		var status, paymentStatus, refundStatus, refundError string
		var isAbsent bool
		var refundAmount float64
		if err := rows.Scan(&uid, &fname, &lname, &email, &createdAt, &status, &paymentStatus, &isAbsent, &refundStatus, &refundAmount, &refundError); err != nil {
			continue
		}
		items = append(items, map[string]interface{}{
			"id":            uid,
			"firstname":     fname,
			"lastname":      lname,
			"email":         email,
			"registeredAt":  createdAt.UTC().Format(time.RFC3339),
			"status":        status,
			"paymentStatus": paymentStatus,
			"isAbsent":      isAbsent,
			"refundStatus":  refundStatus,
			"refundAmount":  refundAmount,
			"refundError":   refundError,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

// adminEventCancelHandler handles POST /api/admin/events/{id}/cancel
func adminEventCancelHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	path := strings.TrimSuffix(r.URL.Path, "/cancel")
	id, err := parseIDFromPath(path, "/api/admin/events/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	callerRole, _ := claims["role"].(string)
	if callerRole != "admin" && callerRole != "salarie" {
		writeError(w, http.StatusForbidden, "not authorized")
		return
	}

	var eDate time.Time
	err = db.QueryRow("SELECT date_debut FROM events WHERE id = $1", id).Scan(&eDate)
	if err == nil && eDate.Before(time.Now()) {
		writeError(w, http.StatusBadRequest, "cet événement est déjà passé")
		return
	}

	var ePrice float64
	var eName string
	err = db.QueryRow(`
		UPDATE events SET status = 'annule', validation_status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING price, name
	`, id).Scan(&ePrice, &eName)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not cancel event")
		return
	}

	rows, err := db.Query(`
		SELECT user_id, payment_status, stripe_session_id 
		FROM event_registrations 
		WHERE event_id = $1 AND status = 'active'
	`, id)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"cancelled": true, "refunds": 0})
		return
	}
	defer rows.Close()

	type reg struct {
		UserID    int64
		PStatus   string
		SessionID string
	}
	var regs []reg
	for rows.Next() {
		var r reg
		if rows.Scan(&r.UserID, &r.PStatus, &r.SessionID) == nil {
			regs = append(regs, r)
		}
	}

	cfg, _ := items.GetStripeConfigPublic()

	refundsCount := 0
	for _, reg := range regs {
		db.Exec(`UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'admin' WHERE event_id = $1 AND user_id = $2`, id, reg.UserID)

		if reg.PStatus == "paid" && reg.SessionID != "" && cfg != nil {
			pi, err := items.GetStripePaymentIntentFromSessionPublic(cfg, reg.SessionID)
			if err == nil && pi != "" {
				refundOpts, recordEUR := items.NewEventRefundStripeParams("admin-cancel", id, reg.UserID, pi, ePrice, nil)
				refundID, refundErr := items.RefundStripePaymentIntentPublic(r.Context(), cfg, pi, refundOpts)
				if refundErr == nil {
					db.Exec(`UPDATE event_registrations SET refund_status = 'refunded', stripe_refund_id = $1, refund_amount = $2 WHERE event_id = $3 AND user_id = $4`, refundID, recordEUR, id, reg.UserID)
					refundsCount++
				} else {
					db.Exec(`UPDATE event_registrations SET refund_status = 'failed', refund_error = $1 WHERE event_id = $2 AND user_id = $3`, refundErr.Error(), id, reg.UserID)
				}
			} else {
				if err != nil {
					db.Exec(`UPDATE event_registrations SET refund_status = 'failed', refund_error = $1 WHERE event_id = $2 AND user_id = $3`, err.Error(), id, reg.UserID)
				}
			}
		} else if reg.PStatus == "paid" {
			db.Exec(`UPDATE event_registrations SET refund_status = 'failed', refund_error = 'missing stripe configuration or session id' WHERE event_id = $1 AND user_id = $2`, id, reg.UserID)
		}
	}

	db.Exec(`UPDATE events SET participant_count = 0 WHERE id = $1`, id)

	writeJSON(w, http.StatusOK, map[string]interface{}{"cancelled": true, "refundsCount": refundsCount})
}

// adminEventRegistrationMarkAbsentHandler handles POST /api/admin/events/{id}/participants/{userId}/absent
func adminEventRegistrationMarkAbsentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 6 {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}
	idRaw := parts[4]
	userIDRaw := parts[6]

	id, err := strconv.ParseInt(idRaw, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}
	userID, err := strconv.ParseInt(userIDRaw, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	res, err := db.Exec(`UPDATE event_registrations SET is_absent = true WHERE event_id = $1 AND user_id = $2 AND status = 'active'`, id, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update registration")
		return
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		writeError(w, http.StatusNotFound, "active registration not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"absent": true})
}

func eventRegisterHandler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if strings.HasSuffix(path, "/register") {
		path = strings.TrimSuffix(path, "/register")
	}
	id, err := parseIDFromPath(path, "/api/events/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, _ := claims["userId"].(float64)
	userID := int64(userIDVal)

	switch r.Method {
	case http.MethodPost:
		// 1. Check if event is valid and has capacity
		var pricingType string
		var capacite sql.NullInt64
		var participantCount int64
		var eventDate time.Time
		err = db.QueryRow(`SELECT pricing_type, capacite, participant_count, date_debut FROM events WHERE id = $1 AND validation_status = 'approved'`, id).Scan(&pricingType, &capacite, &participantCount, &eventDate)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "event not found or not approved")
				return
			}
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}

		if eventDate.Before(time.Now()) {
			writeError(w, http.StatusBadRequest, "cet événement est déjà passé")
			return
		}

		if pricingType == "payant" {
			writeError(w, http.StatusBadRequest, "cet événement est payant, veuillez passer par le paiement")
			return
		}

		if capacite.Valid && participantCount >= capacite.Int64 {
			writeError(w, http.StatusBadRequest, "cet événement est complet")
			return
		}

		// 2. Register
		_, err = db.Exec(`
			INSERT INTO event_registrations (event_id, user_id, payment_status)
			VALUES ($1, $2, 'gratuit')
			ON CONFLICT (event_id, user_id) DO NOTHING
		`, id, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not register")
			return
		}

		// 3. Update participant count
		db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)

		writeJSON(w, http.StatusOK, map[string]bool{"registered": true})

	case http.MethodDelete:
		var paymentStatus, sessionID, currentStatus, refundStatus string
		var eventStart time.Time
		var eventEnd sql.NullTime
		var eventPrice float64
		err = db.QueryRow(`
			SELECT er.payment_status, er.stripe_session_id, er.status, er.refund_status, e.date_debut, e.date_fin, e.price
			FROM event_registrations er
			JOIN events e ON e.id = er.event_id
			WHERE er.event_id = $1 AND er.user_id = $2
		`, id, userID).Scan(&paymentStatus, &sessionID, &currentStatus, &refundStatus, &eventStart, &eventEnd, &eventPrice)
		if err != nil {
			writeError(w, http.StatusNotFound, "registration not found")
			return
		}

		now := time.Now()
		eventEndTime := eventStart
		if eventEnd.Valid {
			eventEndTime = eventEnd.Time
		}
		eventPassed := now.After(eventEndTime)

		regActive := strings.EqualFold(strings.TrimSpace(currentStatus), "active")
		refundRequested := strings.TrimSpace(refundStatus) == "requested"

		// Demande déjà enregistrée (réponse idempotente : double clic, rafraîchissement, course entre requêtes)
		if paymentStatus == "paid" && eventPassed && refundRequested {
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"unregistered":     true,
				"refundRequested":  true,
				"alreadySubmitted": true,
			})
			return
		}

		if !regActive {
			writeError(w, http.StatusBadRequest, "registration is already cancelled")
			return
		}

		if paymentStatus == "gratuit" || paymentStatus == "pending" {
			db.Exec(`UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user' WHERE event_id = $1 AND user_id = $2`, id, userID)
			db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)
			writeJSON(w, http.StatusOK, map[string]bool{"unregistered": true})
			return
		}

		if paymentStatus == "paid" && eventPassed {
			type refundReasonBody struct {
				Reason string `json:"reason"`
			}
			var body refundReasonBody
			_ = json.NewDecoder(r.Body).Decode(&body)
			reason := strings.TrimSpace(body.Reason)
			if reason == "" {
				writeError(w, http.StatusBadRequest, "le motif du remboursement est obligatoire")
				return
			}
			if len(reason) > 4000 {
				reason = reason[:4000]
			}
			resExec, err := db.Exec(`
				UPDATE event_registrations SET
					status = 'cancelled',
					cancelled_at = NOW(),
					cancelled_by = 'user',
					refund_status = 'requested',
					refund_request_reason = $1
				WHERE event_id = $2 AND user_id = $3 AND LOWER(TRIM(status)) = 'active'
			`, reason, id, userID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "database error")
				return
			}
			n, _ := resExec.RowsAffected()
			if n == 0 {
				var rs string
				_ = db.QueryRow(`SELECT refund_status FROM event_registrations WHERE event_id = $1 AND user_id = $2`, id, userID).Scan(&rs)
				if strings.TrimSpace(rs) == "requested" {
					writeJSON(w, http.StatusOK, map[string]interface{}{
						"unregistered":     true,
						"refundRequested":  true,
						"alreadySubmitted": true,
					})
					return
				}
				writeError(w, http.StatusBadRequest, "registration is already cancelled")
				return
			}
			db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)
			writeJSON(w, http.StatusOK, map[string]interface{}{"unregistered": true, "refundRequested": true})
			return
		}

		if paymentStatus != "paid" {
			writeError(w, http.StatusBadRequest, "désinscription impossible pour ce statut de paiement")
			return
		}

		nowUTC := time.Now().UTC()
		diff := eventStart.Sub(nowUTC)

		if diff.Hours() < 24 {
			db.Exec(`UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'non_refundable' WHERE event_id = $1 AND user_id = $2`, id, userID)
			db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)
			writeJSON(w, http.StatusOK, map[string]interface{}{"unregistered": true, "refunded": false, "reason": "less than 24h before event"})
			return
		}

		cfg, err := items.GetStripeConfigPublic()
		if err != nil {
			db.Exec(`UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'failed', refund_error = $1 WHERE event_id = $2 AND user_id = $3`, err.Error(), id, userID)
			db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)
			writeError(w, http.StatusInternalServerError, "stripe not configured, cancellation saved but refund failed")
			return
		}

		paymentIntentID, err := items.GetStripePaymentIntentFromSessionPublic(cfg, sessionID)
		var refundID string
		var recordEUR float64
		if err == nil && paymentIntentID != "" {
			refundOpts, rec := items.NewEventRefundStripeParams("user-unregister", id, userID, paymentIntentID, eventPrice, nil)
			recordEUR = rec
			refundID, err = items.RefundStripePaymentIntentPublic(r.Context(), cfg, paymentIntentID, refundOpts)
		}

		if err != nil {
			db.Exec(`UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'failed', refund_error = $1 WHERE event_id = $2 AND user_id = $3`, err.Error(), id, userID)
			db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)
			writeError(w, http.StatusInternalServerError, "refund failed: "+err.Error())
			return
		}

		db.Exec(`
			UPDATE event_registrations 
			SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'refunded', stripe_refund_id = $1, refund_amount = $2 
			WHERE event_id = $3 AND user_id = $4`, refundID, recordEUR, id, userID)

		db.Exec(`UPDATE events SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND status = 'active') WHERE id = $1`, id)

		writeJSON(w, http.StatusOK, map[string]interface{}{"unregistered": true, "refunded": true, "refundAmount": recordEUR})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func eventCheckoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	path := strings.TrimSuffix(r.URL.Path, "/checkout")
	id, err := parseIDFromPath(path, "/api/events/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, _ := claims["userId"].(float64)
	userID := int64(userIDVal)

	var name, pricingType string
	var price float64
	var capacite sql.NullInt64
	var participantCount int64

	err = db.QueryRow(`SELECT name, pricing_type, price, capacite, participant_count FROM events WHERE id = $1 AND validation_status = 'approved'`, id).Scan(&name, &pricingType, &price, &capacite, &participantCount)
	if err != nil {
		writeError(w, http.StatusNotFound, "event not found")
		return
	}

	if pricingType != "payant" || price <= 0 {
		writeError(w, http.StatusBadRequest, "this event is not paid")
		return
	}

	if capacite.Valid && participantCount >= capacite.Int64 {
		writeError(w, http.StatusBadRequest, "this event is full")
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "stripe not configured")
		return
	}

	frontendBase := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if frontendBase == "" {
		frontendBase = "http://localhost:3000"
	}
	frontendBase = strings.TrimRight(frontendBase, "/")
	cfg.SuccessURL = fmt.Sprintf("%s/evenements/activites?id=%d&stripe=success&session_id={CHECKOUT_SESSION_ID}", frontendBase, id)
	cfg.CancelURL = fmt.Sprintf("%s/evenements/activites?id=%d&stripe=cancel", frontendBase, id)

	amountCents := int64(price * 100)
	session, err := items.CreateStripeEventCheckoutSessionPublic(cfg, id, userID, "Inscription : "+name, amountCents)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create stripe session")
		return
	}

	// Pré-enregistrer avec statut pending
	_, _ = db.Exec(`
		INSERT INTO event_registrations (event_id, user_id, payment_status, stripe_session_id)
		VALUES ($1, $2, 'pending', $3)
		ON CONFLICT (event_id, user_id) DO UPDATE SET stripe_session_id = $3, payment_status = 'pending'
	`, id, userID, session.ID)

	writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

func eventConfirmPaymentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "session_id is required")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, _ := claims["userId"].(float64)
	userID := int64(userIDVal)

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "stripe not configured")
		return
	}

	sessionDetails, err := items.RetrieveStripeEventSessionDetails(cfg.SecretKey, sessionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not verify stripe session")
		return
	}
	paymentStatus := strings.TrimSpace(sessionDetails.PaymentStatus)
	metadataEventID := sessionDetails.EventID
	metadataUserID := sessionDetails.UserID

	if metadataUserID > 0 && metadataUserID != userID {
		writeError(w, http.StatusForbidden, "session does not belong to current user")
		return
	}

	var eventID int64
	var registrationStatus string
	err = db.QueryRow(`
		SELECT event_id, payment_status
		FROM event_registrations
		WHERE user_id = $1 AND stripe_session_id = $2
	`, userID, sessionID).Scan(&eventID, &registrationStatus)
	if err != nil {
		if err != sql.ErrNoRows {
			writeError(w, http.StatusInternalServerError, "could not load registration")
			return
		}

		if metadataEventID <= 0 {
			writeError(w, http.StatusNotFound, "registration not found")
			return
		}

		eventID = metadataEventID
		err = db.QueryRow(`
			SELECT payment_status
			FROM event_registrations
			WHERE user_id = $1 AND event_id = $2
		`, userID, eventID).Scan(&registrationStatus)
		if err != nil {
			if err == sql.ErrNoRows {
				_, err = db.Exec(`
					INSERT INTO event_registrations (event_id, user_id, payment_status, stripe_session_id)
					VALUES ($1, $2, 'pending', $3)
				`, eventID, userID, sessionID)
				if err != nil {
					writeError(w, http.StatusInternalServerError, "could not create registration")
					return
				}
				registrationStatus = "pending"
			} else {
				writeError(w, http.StatusInternalServerError, "could not load registration")
				return
			}
		} else {
			_, _ = db.Exec(`
				UPDATE event_registrations
				SET stripe_session_id = $3
				WHERE event_id = $1 AND user_id = $2
			`, eventID, userID, sessionID)
		}
	}

	if paymentStatus != "paid" {
		writeError(w, http.StatusBadRequest, "payment not completed")
		return
	}

	if registrationStatus != "paid" {
		_, err = db.Exec(`
			UPDATE event_registrations
			SET payment_status = 'paid', stripe_session_id = $3, stripe_payment_intent_id = $4
			WHERE user_id = $1 AND event_id = $2
		`, userID, eventID, sessionID, sessionDetails.PaymentIntent)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update registration status")
			return
		}
	}

	_, _ = db.Exec(`
		UPDATE events
		SET participant_count = (SELECT COUNT(*) FROM event_registrations WHERE event_id = $1 AND payment_status <> 'pending' AND status = 'active')
		WHERE id = $1
	`, eventID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":            true,
		"eventId":       eventID,
		"registered":    true,
		"paymentStatus": "paid",
	})
}

func eventValidateHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseAdminEventActionID(r.URL.Path, "validate")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var updatedAt time.Time
	err = db.QueryRow(`
		UPDATE events
		SET validation_status = 'approved', rejection_comment = '', status = 'planifie', updated_at = NOW()
		WHERE id = $1 AND status != 'annule'
		RETURNING updated_at
	`, id).Scan(&updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not validate event")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":               id,
		"validationStatus": "approved",
		"status":           "planifie",
		"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
	})
}

func eventRejectHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseAdminEventActionID(r.URL.Path, "reject")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var rejectPayload eventRejectPayload
	if err := json.NewDecoder(r.Body).Decode(&rejectPayload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	var eDate time.Time
	err = db.QueryRow("SELECT date_debut FROM events WHERE id = $1", id).Scan(&eDate)
	if err == nil && eDate.Before(time.Now()) {
		writeError(w, http.StatusBadRequest, "cet événement est déjà passé")
		return
	}

	comment := strings.TrimSpace(rejectPayload.Comment)
	var updatedAt time.Time
	err = db.QueryRow(`
		UPDATE events
		SET validation_status = 'rejected', rejection_comment = $1, updated_at = NOW()
		WHERE id = $2 AND status != 'annule'
		RETURNING updated_at
	`, comment, id).Scan(&updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not reject event")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":               id,
		"validationStatus": "rejected",
		"rejectionComment": comment,
		"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
	})
}

func eventCancelHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseAdminEventActionID(r.URL.Path, "cancel")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid event id")
		return
	}

	var payload eventRejectPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	comment := strings.TrimSpace(payload.Comment)
	if comment == "" {
		writeError(w, http.StatusBadRequest, "cancellation comment is required")
		return
	}

	var updatedAt time.Time
	err = db.QueryRow(`
		UPDATE events
		SET status = 'annule', rejection_comment = $1, validation_status = 'rejected', updated_at = NOW()
		WHERE id = $2
		RETURNING updated_at
	`, comment, id).Scan(&updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not cancel event")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":                  id,
		"status":              "annule",
		"cancellationComment": comment,
		"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
	})
}

func parseAdminEventActionID(path string, action string) (int64, error) {
	trimmedPath := strings.TrimSpace(path)
	suffix := "/" + strings.Trim(strings.TrimSpace(action), "/")
	trimmedPath = strings.TrimSuffix(trimmedPath, suffix)
	trimmedPath = strings.Trim(trimmedPath, "/")
	parts := strings.Split(trimmedPath, "/")
	if len(parts) == 0 {
		return 0, fmt.Errorf("missing id")
	}
	rawID := strings.TrimSpace(parts[len(parts)-1])
	if rawID == "" {
		return 0, fmt.Errorf("missing id")
	}
	id, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid id")
	}
	return id, nil
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
		writeError(w, http.StatusBadRequest, "Corps JSON invalide")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	var userID int64
	var userEmail, userRole, passwordHash, status, firstname, lastname string
	// 1. Vérifier si c'est le super-admin (env)
	if email == adminEmail {
		userEmail = adminEmail
		userRole = "admin"
		passwordHash = string(adminPasswordHash)
		status = "active"
		// Récupérer l'ID et noms de l'admin en base
		_ = db.QueryRow("SELECT id, firstname, lastname FROM users WHERE email = $1", adminEmail).Scan(&userID, &firstname, &lastname)
	} else {
		// 2. Sinon, chercher en base de données
		err := db.QueryRow(`
			SELECT id, email, role, password_hash, status, firstname, lastname
			FROM users
			WHERE email = $1
		`, email).Scan(&userID, &userEmail, &userRole, &passwordHash, &status, &firstname, &lastname)

		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusUnauthorized, "Identifiants invalides")
				return
			}
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
	}

	// 3. Comparer le mot de passe (avant le statut pour ne pas divulguer l'état du compte sans mot de passe valide)
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "Identifiants invalides")
		return
	}

	// 4. Vérifier le statut (seuls les 'active' peuvent se connecter)
	if status != "active" {
		msg := "Votre compte n'est pas encore actif."
		switch status {
		case "pending":
			msg = "Votre compte est en attente de validation par l'équipe UpcycleConnect."
		case "suspended":
			msg = "Votre compte est suspendu. Contactez le support."
		}
		writeError(w, http.StatusForbidden, msg)
		return
	}

	now := time.Now().UTC()
	expiresAt := now.Add(jwtExpiration)
	claims := jwt.MapClaims{
		"sub":    userEmail,
		"userId": userID,
		"email":  userEmail,
		"role":   userRole,
		"iat":    now.Unix(),
		"exp":    expiresAt.Unix(),
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
			"email":     userEmail,
			"role":      userRole,
			"firstname": firstname,
			"lastname":  lastname,
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

	var idVal any
	idVal = claims["userId"]
	if idVal == nil {
		// Fallback for old tokens
		email, _ := claims["sub"].(string)
		var dbID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&dbID)
		if err == nil {
			idVal = dbID
		}
	}

	var id int64
	if v, ok := idVal.(float64); ok {
		id = int64(v)
	} else if v, ok := idVal.(int64); ok {
		id = v
	}

	var firstname, lastname string
	err := db.QueryRow("SELECT firstname, lastname FROM users WHERE id = $1", id).Scan(&firstname, &lastname)
	if err != nil {
		firstname = ""
		lastname = ""
	}

	role, _ := claims["role"].(string)
	userPayload := map[string]any{
		"id":        id,
		"email":     claims["email"],
		"role":      role,
		"firstname": firstname,
		"lastname":  lastname,
	}
	if role == "professionnel" && id > 0 {
		prepo := projects.NewRepository(db)
		if sc, err := prepo.GetProUCConnectScore(id); err == nil {
			userPayload["upcycleConnectScore"] = sc
		} else {
			userPayload["upcycleConnectScore"] = 0.0
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"user":          userPayload,
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

// ─────────────────────────────────────────────────────────────────────────────
// Salarié — contenus (conseils + actualités)
// ─────────────────────────────────────────────────────────────────────────────

func ensureSalarieContentsSchema() error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS salarie_contents (
		id         BIGSERIAL PRIMARY KEY,
		user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		type       TEXT NOT NULL,
		title      TEXT NOT NULL,
		body       TEXT NOT NULL DEFAULT '',
		status     TEXT NOT NULL DEFAULT 'brouillon',
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		CONSTRAINT salarie_contents_type_check CHECK (type IN ('conseil', 'actualite')),
		CONSTRAINT salarie_contents_status_check CHECK (status IN ('brouillon', 'publie', 'archive', 'en_attente'))
	)`)
	if err != nil {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS rejection_comment TEXT NOT NULL DEFAULT ''`); err != nil {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`); err != nil {
		return err
	}
	if _, err = db.Exec(`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE`); err != nil {
		return err
	}
	if _, err = db.Exec(`CREATE TABLE IF NOT EXISTS conseil_likes (
		user_id    BIGINT NOT NULL,
		content_id BIGINT NOT NULL,
		PRIMARY KEY (user_id, content_id)
	)`); err != nil {
		return err
	}
	if _, err = db.Exec(`CREATE TABLE IF NOT EXISTS conseil_favorites (
		user_id    BIGINT NOT NULL,
		content_id BIGINT NOT NULL,
		PRIMARY KEY (user_id, content_id)
	)`); err != nil {
		return err
	}
	return nil
}

func salarieContentsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getClaims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
		getEmail, _ := getClaims["sub"].(string)
		var getCallerID int64
		if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, getEmail).Scan(&getCallerID); err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		rows, err := db.Query(`
			SELECT id, user_id, type, title, body, status, rejection_comment, image_url, created_at, updated_at
			FROM salarie_contents
			WHERE user_id = $1
			ORDER BY created_at DESC
		`, getCallerID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list contents")
			return
		}
		defer rows.Close()
		items := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id, userID int64
			var contentType, title, body, status, rejectionComment, imageURL string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &userID, &contentType, &title, &body, &status, &rejectionComment, &imageURL, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse content")
				return
			}
			items = append(items, map[string]interface{}{
				"id": id, "userId": userID, "type": contentType, "title": title,
				"body": body, "status": status, "rejectionComment": rejectionComment,
				"imageUrl":  imageURL,
				"createdAt": createdAt.UTC().Format(time.RFC3339),
				"updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})

	case http.MethodPost:
		claims := r.Context().Value("authClaims")
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		authClaims, assertOk := claims.(jwt.MapClaims)
		if !assertOk {
			writeError(w, http.StatusUnauthorized, "invalid claims")
			return
		}
		email, _ := authClaims["sub"].(string)
		var userID int64
		if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&userID); err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		var payload struct {
			Type     string `json:"type"`
			Title    string `json:"title"`
			Body     string `json:"body"`
			Status   string `json:"status"`
			ImageUrl string `json:"imageUrl"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if payload.Type != "conseil" && payload.Type != "actualite" {
			writeError(w, http.StatusBadRequest, "type must be 'conseil' or 'actualite'")
			return
		}
		if strings.TrimSpace(payload.Title) == "" {
			writeError(w, http.StatusBadRequest, "title is required")
			return
		}
		validStatuses := map[string]bool{"brouillon": true, "publie": true, "archive": true, "en_attente": true}
		if payload.Status == "" {
			payload.Status = "brouillon"
		}
		if !validStatuses[payload.Status] {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}

		var id int64
		var createdAt, updatedAt time.Time
		// Un salarié ne peut pas publier directement : force en_attente si le statut demandé est publie
		postStatus := payload.Status
		if postStatus == "publie" {
			postStatus = "en_attente"
		}
		err := db.QueryRow(`
			INSERT INTO salarie_contents (user_id, type, title, body, status, image_url)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, created_at, updated_at
		`, userID, payload.Type, strings.TrimSpace(payload.Title), strings.TrimSpace(payload.Body), postStatus, strings.TrimSpace(payload.ImageUrl)).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create content")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "userId": userID, "type": payload.Type,
			"title": strings.TrimSpace(payload.Title), "body": strings.TrimSpace(payload.Body),
			"imageUrl":  strings.TrimSpace(payload.ImageUrl),
			"status":    postStatus,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func salarieContentsFeedHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	// Identifier l'utilisateur courant
	var callerUserID int64
	if claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims); ok {
		email, _ := claims["sub"].(string)
		db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&callerUserID)
	}

	favoritesOnly := r.URL.Query().Get("favorites") == "true"

	var query string
	var args []interface{}
	if favoritesOnly && callerUserID != 0 {
		query = `
			SELECT sc.id, sc.user_id, u.firstname, u.lastname, sc.title, sc.body, sc.image_url, sc.is_pinned, sc.created_at,
			       (SELECT COUNT(*) FROM conseil_likes cl WHERE cl.content_id = sc.id) AS like_count,
			       (SELECT COUNT(*) FROM conseil_favorites cf WHERE cf.content_id = sc.id) AS favorite_count,
			       EXISTS(SELECT 1 FROM conseil_likes cl2 WHERE cl2.content_id = sc.id AND cl2.user_id = $1) AS liked_by_me,
			       TRUE AS favorited_by_me
			FROM salarie_contents sc
			JOIN users u ON u.id = sc.user_id
			JOIN conseil_favorites fav ON fav.content_id = sc.id AND fav.user_id = $1
			WHERE sc.type = 'conseil' AND sc.status = 'publie'
			ORDER BY sc.is_pinned DESC, sc.created_at DESC
		`
		args = []interface{}{callerUserID}
	} else {
		query = `
			SELECT sc.id, sc.user_id, u.firstname, u.lastname, sc.title, sc.body, sc.image_url, sc.is_pinned, sc.created_at,
			       (SELECT COUNT(*) FROM conseil_likes cl WHERE cl.content_id = sc.id) AS like_count,
			       (SELECT COUNT(*) FROM conseil_favorites cf WHERE cf.content_id = sc.id) AS favorite_count,
			       COALESCE((SELECT TRUE FROM conseil_likes cl2 WHERE cl2.content_id = sc.id AND cl2.user_id = $1), FALSE) AS liked_by_me,
			       COALESCE((SELECT TRUE FROM conseil_favorites cf2 WHERE cf2.content_id = sc.id AND cf2.user_id = $1), FALSE) AS favorited_by_me
			FROM salarie_contents sc
			JOIN users u ON u.id = sc.user_id
			WHERE sc.type = 'conseil' AND sc.status = 'publie'
			ORDER BY sc.is_pinned DESC, sc.created_at DESC
		`
		args = []interface{}{callerUserID}
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load feed")
		return
	}
	defer rows.Close()
	items := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id, userID int64
		var firstname, lastname, title, body, imageURL string
		var isPinned, likedByMe, favoritedByMe bool
		var likeCount, favoriteCount int64
		var createdAt time.Time
		if err := rows.Scan(&id, &userID, &firstname, &lastname, &title, &body, &imageURL, &isPinned, &createdAt,
			&likeCount, &favoriteCount, &likedByMe, &favoritedByMe); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse feed item")
			return
		}
		items = append(items, map[string]interface{}{
			"id":            id,
			"userId":        userID,
			"authorName":    strings.TrimSpace(firstname + " " + lastname),
			"title":         title,
			"body":          body,
			"imageUrl":      imageURL,
			"isPinned":      isPinned,
			"isOwn":         userID == callerUserID,
			"likeCount":     likeCount,
			"favoriteCount": favoriteCount,
			"likedByMe":     likedByMe,
			"favoritedByMe": favoritedByMe,
			"createdAt":     createdAt.UTC().Format(time.RFC3339),
		})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func salarieContentLikeHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/salarie/contents/like/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	email, _ := claims["sub"].(string)
	var callerID int64
	if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&callerID); err != nil {
		writeError(w, http.StatusInternalServerError, "user not found")
		return
	}
	switch r.Method {
	case http.MethodPost:
		_, err = db.Exec(`INSERT INTO conseil_likes (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, callerID, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not like")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"liked": true})
	case http.MethodDelete:
		_, err = db.Exec(`DELETE FROM conseil_likes WHERE user_id = $1 AND content_id = $2`, callerID, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not unlike")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"liked": false})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func salarieContentFavoriteHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/salarie/contents/favorite/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	email, _ := claims["sub"].(string)
	var callerID int64
	if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&callerID); err != nil {
		writeError(w, http.StatusInternalServerError, "user not found")
		return
	}
	switch r.Method {
	case http.MethodPost:
		_, err = db.Exec(`INSERT INTO conseil_favorites (user_id, content_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, callerID, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not favorite")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"favorited": true})
	case http.MethodDelete:
		_, err = db.Exec(`DELETE FROM conseil_favorites WHERE user_id = $1 AND content_id = $2`, callerID, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not unfavorite")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"favorited": false})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func salarieContentByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/salarie/contents/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var payload struct {
			Title    string `json:"title"`
			Body     string `json:"body"`
			Status   string `json:"status"`
			Type     string `json:"type"`
			ImageUrl string `json:"imageUrl"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		validStatuses := map[string]bool{"brouillon": true, "publie": true, "archive": true, "en_attente": true}
		if !validStatuses[payload.Status] {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}
		// Un salarié ne peut pas se publier lui-même
		putClaims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
		putRole, _ := putClaims["role"].(string)
		if putRole == "salarie" && payload.Status == "publie" {
			payload.Status = "en_attente"
		}
		var updatedAt time.Time
		res := db.QueryRow(`
			UPDATE salarie_contents SET title = $1, body = $2, status = $3, image_url = $4, rejection_comment = CASE WHEN $3 = 'en_attente' THEN '' ELSE rejection_comment END, updated_at = NOW()
			WHERE id = $5 RETURNING updated_at
		`, strings.TrimSpace(payload.Title), strings.TrimSpace(payload.Body), payload.Status, strings.TrimSpace(payload.ImageUrl), id)
		if err := res.Scan(&updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "content not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update content")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"id": id, "status": payload.Status, "updatedAt": updatedAt.UTC().Format(time.RFC3339)})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM salarie_contents WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete content")
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "content not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin — modération des contenus salarié
// ─────────────────────────────────────────────────────────────────────────────

func adminSalarieContentsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		statusFilter := strings.TrimSpace(r.URL.Query().Get("status"))
		typeFilter := strings.TrimSpace(r.URL.Query().Get("type"))

		rows, err := db.Query(`
			SELECT sc.id, sc.user_id, u.firstname, u.lastname, sc.type, sc.title, sc.body, sc.status, sc.rejection_comment, sc.image_url, sc.is_pinned, sc.created_at, sc.updated_at,
			       (SELECT COUNT(*) FROM conseil_likes cl WHERE cl.content_id = sc.id) AS like_count,
			       (SELECT COUNT(*) FROM conseil_favorites cf WHERE cf.content_id = sc.id) AS favorite_count
			FROM salarie_contents sc
			JOIN users u ON u.id = sc.user_id
			WHERE ($1 = '' OR sc.status = $1)
			AND ($2 = '' OR sc.type = $2)
			ORDER BY sc.is_pinned DESC, sc.created_at DESC
		`, statusFilter, typeFilter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list contents")
			return
		}
		defer rows.Close()

		items := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id, userID int64
			var firstname, lastname, contentType, title, body, status, rejectionComment, imageURL string
			var isPinned bool
			var likeCount, favoriteCount int64
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &userID, &firstname, &lastname, &contentType, &title, &body, &status, &rejectionComment, &imageURL, &isPinned, &createdAt, &updatedAt, &likeCount, &favoriteCount); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse content")
				return
			}
			items = append(items, map[string]interface{}{
				"id": id, "userId": userID,
				"authorName":       strings.TrimSpace(firstname + " " + lastname),
				"type":             contentType,
				"title":            title,
				"body":             body,
				"status":           status,
				"rejectionComment": rejectionComment,
				"imageUrl":         imageURL,
				"isPinned":         isPinned,
				"likeCount":        likeCount,
				"favoriteCount":    favoriteCount,
				"createdAt":        createdAt.UTC().Format(time.RFC3339),
				"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})

	case http.MethodPost:
		// L'admin peut créer un conseil directement et le publier
		claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
		email, _ := claims["sub"].(string)
		var adminUserID int64
		if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&adminUserID); err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		var payload struct {
			Type     string `json:"type"`
			Title    string `json:"title"`
			Body     string `json:"body"`
			Status   string `json:"status"`
			ImageURL string `json:"imageUrl"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if payload.Type == "" {
			payload.Type = "conseil"
		}
		if payload.Type != "conseil" && payload.Type != "actualite" {
			writeError(w, http.StatusBadRequest, "type must be 'conseil' or 'actualite'")
			return
		}
		if strings.TrimSpace(payload.Title) == "" {
			writeError(w, http.StatusBadRequest, "title is required")
			return
		}
		validStatuses := map[string]bool{"brouillon": true, "publie": true, "archive": true, "en_attente": true}
		if payload.Status == "" {
			payload.Status = "brouillon"
		}
		if !validStatuses[payload.Status] {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}
		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO salarie_contents (user_id, type, title, body, status, image_url)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, created_at, updated_at
		`, adminUserID, payload.Type, strings.TrimSpace(payload.Title), strings.TrimSpace(payload.Body), payload.Status, strings.TrimSpace(payload.ImageURL)).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create content")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "userId": adminUserID, "type": payload.Type,
			"title": strings.TrimSpace(payload.Title), "body": strings.TrimSpace(payload.Body),
			"status": payload.Status, "imageUrl": strings.TrimSpace(payload.ImageURL),
			"isPinned":  false,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func adminSalarieContentByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/salarie-contents/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	switch r.Method {
	case http.MethodGet:
		var itemID, userID int64
		var firstname, lastname, contentType, title, body, status, rejectionComment, imageURL string
		var isPinned bool
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			SELECT sc.id, sc.user_id, u.firstname, u.lastname, sc.type, sc.title, sc.body, sc.status, sc.rejection_comment, sc.image_url, sc.is_pinned, sc.created_at, sc.updated_at
			FROM salarie_contents sc
			JOIN users u ON u.id = sc.user_id
			WHERE sc.id = $1
		`, id).Scan(&itemID, &userID, &firstname, &lastname, &contentType, &title, &body, &status, &rejectionComment, &imageURL, &isPinned, &createdAt, &updatedAt)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "content not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not fetch content")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": itemID, "userId": userID,
			"authorName":       strings.TrimSpace(firstname + " " + lastname),
			"type":             contentType,
			"title":            title,
			"body":             body,
			"status":           status,
			"rejectionComment": rejectionComment,
			"imageUrl":         imageURL,
			"isPinned":         isPinned,
			"createdAt":        createdAt.UTC().Format(time.RFC3339),
			"updatedAt":        updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodPut:
		var payload struct {
			Title    string `json:"title"`
			Body     string `json:"body"`
			Status   string `json:"status"`
			ImageURL string `json:"imageUrl"`
			IsPinned *bool  `json:"isPinned"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if strings.TrimSpace(payload.Title) == "" {
			writeError(w, http.StatusBadRequest, "title is required")
			return
		}
		validStatuses := map[string]bool{"brouillon": true, "publie": true, "archive": true, "en_attente": true}
		if !validStatuses[payload.Status] {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}
		pinned := false
		if payload.IsPinned != nil {
			pinned = *payload.IsPinned
		}
		var updatedAt time.Time
		queryErr := db.QueryRow(`
			UPDATE salarie_contents
			SET title = $1, body = $2, status = $3, image_url = $4, is_pinned = $5,
			    rejection_comment = CASE WHEN $3 IN ('publie', 'en_attente') THEN '' ELSE rejection_comment END,
			    updated_at = NOW()
			WHERE id = $6
			RETURNING updated_at
		`, strings.TrimSpace(payload.Title), strings.TrimSpace(payload.Body), payload.Status, strings.TrimSpace(payload.ImageURL), pinned, id).Scan(&updatedAt)
		if queryErr != nil {
			if queryErr == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "content not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update content")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "status": payload.Status, "isPinned": pinned,
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM salarie_contents WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete content")
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "content not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func adminSalarieContentValidateHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/validate")
	id, err := parseIDFromPath(path, "/api/admin/salarie-contents/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var updatedAt time.Time
	err = db.QueryRow(`
		UPDATE salarie_contents SET status = 'publie', rejection_comment = '', updated_at = NOW()
		WHERE id = $1 RETURNING updated_at
	`, id).Scan(&updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "content not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not validate content")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"id": id, "status": "publie", "updatedAt": updatedAt.UTC().Format(time.RFC3339)})
}

func adminSalarieContentRejectHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/reject")
	id, err := parseIDFromPath(path, "/api/admin/salarie-contents/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body struct {
		Comment string `json:"comment"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	comment := strings.TrimSpace(body.Comment)
	var updatedAt time.Time
	err = db.QueryRow(`
		UPDATE salarie_contents SET status = 'brouillon', rejection_comment = $1, updated_at = NOW()
		WHERE id = $2 RETURNING updated_at
	`, comment, id).Scan(&updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "content not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not reject content")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"id": id, "status": "brouillon", "rejectionComment": comment, "updatedAt": updatedAt.UTC().Format(time.RFC3339)})
}

// ─────────────────────────────────────────────────────────────────────────────
// Moderation Reasons — motifs de refus/desactivation
// ─────────────────────────────────────────────────────────────────────────────

type moderationReasonPayload struct {
	Label string `json:"label"`
}

func ensureModerationReasonsSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS moderation_reasons (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_moderation_reasons_position ON moderation_reasons(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM moderation_reasons`).Scan(&count); err != nil {
		return err
	}

	if count == 0 {
		defaults := []string{
			"Contenu non conforme a la charte",
			"Description ou titre trompeur",
			"Objet interdit ou non autorise",
			"Informations de contact non autorisees",
			"Annonce en doublon",
		}
		for i, label := range defaults {
			if _, err := db.Exec(`INSERT INTO moderation_reasons (label, position) VALUES ($1, $2)`, label, i); err != nil {
				return err
			}
		}
	}

	return nil
}

func moderationReasonsPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, label FROM moderation_reasons ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list moderation reasons")
		return
	}
	defer rows.Close()

	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label string
		if err := rows.Scan(&id, &label); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse moderation reason")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func moderationReasonsAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}

	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, position, created_at, updated_at FROM moderation_reasons ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list moderation reasons")
			return
		}
		defer rows.Close()

		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var label string
			var pos int
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse moderation reason")
				return
			}
			result = append(result, map[string]interface{}{
				"id":        id,
				"label":     label,
				"position":  pos,
				"createdAt": createdAt.UTC().Format(time.RFC3339),
				"updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload moderationReasonPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}

		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO moderation_reasons (label, position)
			VALUES ($1, (SELECT COALESCE(MAX(position), -1) + 1 FROM moderation_reasons))
			RETURNING id, created_at, updated_at
		`, label).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "moderation reason label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create moderation reason")
			return
		}

		var pos int
		_ = db.QueryRow(`SELECT position FROM moderation_reasons WHERE id = $1`, id).Scan(&pos)

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":        id,
			"label":     label,
			"position":  pos,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func moderationReasonByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}

	id, err := parseIDFromPath(r.URL.Path, "/api/admin/moderation-reasons/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid reason id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var payload moderationReasonPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}

		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE moderation_reasons SET label = $1, updated_at = NOW()
			WHERE id = $2 RETURNING created_at, updated_at
		`, label, id)
		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "reason not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "moderation reason label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update moderation reason")
			return
		}

		var pos int
		_ = db.QueryRow(`SELECT position FROM moderation_reasons WHERE id = $1`, id).Scan(&pos)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id":        id,
			"label":     label,
			"position":  pos,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM moderation_reasons WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete moderation reason")
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "reason not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Deposit Point Types — types de points de dépôt
// ─────────────────────────────────────────────────────────────────────────────

type depositPointTypePayload struct {
	Label string `json:"label"`
}

func ensureDepositPointTypesSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS deposit_point_types (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_deposit_point_types_position ON deposit_point_types(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM deposit_point_types`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		defaults := []string{"Conteneur", "Box", "Local", "Boutique partenaire", "Déchèterie"}
		for i, label := range defaults {
			if _, err := db.Exec(
				`INSERT INTO deposit_point_types (label, position) VALUES ($1, $2)`,
				label, i,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func depositPointTypesPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, label FROM deposit_point_types ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list deposit point types")
		return
	}
	defer rows.Close()
	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label string
		if err := rows.Scan(&id, &label); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse deposit point type")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func depositPointTypesAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, position, created_at, updated_at FROM deposit_point_types ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list deposit point types")
			return
		}
		defer rows.Close()
		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var pos int
			var label string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse deposit point type")
				return
			}
			result = append(result, map[string]interface{}{
				"id": id, "label": label,
				"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload depositPointTypePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO deposit_point_types (label, position)
			VALUES ($1, (SELECT COALESCE(MAX(position), -1) + 1 FROM deposit_point_types))
			RETURNING id, created_at, updated_at
		`, label).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "type label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create deposit point type")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM deposit_point_types WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "label": label,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func depositPointTypeByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/deposit-point-types/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid type id")
		return
	}
	switch r.Method {
	case http.MethodPut:
		var payload depositPointTypePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE deposit_point_types SET label = $1, updated_at = NOW()
			WHERE id = $2 RETURNING created_at, updated_at
		`, label, id)
		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "type not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "type label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update deposit point type")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM deposit_point_types WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "label": label,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM deposit_point_types WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete deposit point type")
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "type not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Item Categories — catégories d'objets pour le formulaire d'annonce
// ─────────────────────────────────────────────────────────────────────────────

type itemCategoryPayload struct {
	Label string `json:"label"`
	Emoji string `json:"emoji"`
}

func ensureItemCategoriesSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS item_categories (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			emoji      TEXT NOT NULL DEFAULT '📦',
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_item_categories_position ON item_categories(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item_categories`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		type seed struct{ label, emoji string }
		defaults := []seed{
			{"Mobilier", "🪑"},
			{"Décoration", "🖼️"},
			{"Électroménager", "⚡"},
			{"Jardinage", "🌱"},
		}
		for i, d := range defaults {
			if _, err := db.Exec(
				`INSERT INTO item_categories (label, emoji, position) VALUES ($1, $2, $3)`,
				d.label, d.emoji, i,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func itemCategoriesPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, label, emoji FROM item_categories ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list item categories")
		return
	}
	defer rows.Close()
	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label, emoji string
		if err := rows.Scan(&id, &label, &emoji); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse item category")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label, "emoji": emoji})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func itemCategoriesAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, emoji, position, created_at, updated_at FROM item_categories ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list item categories")
			return
		}
		defer rows.Close()
		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var pos int
			var label, emoji string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &emoji, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse item category")
				return
			}
			result = append(result, map[string]interface{}{
				"id": id, "label": label, "emoji": emoji,
				"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload itemCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		emoji := strings.TrimSpace(payload.Emoji)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		if emoji == "" {
			emoji = "📦"
		}
		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO item_categories (label, emoji, position)
			VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM item_categories))
			RETURNING id, created_at, updated_at
		`, label, emoji).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create item category")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_categories WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "label": label, "emoji": emoji,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func itemCategoryByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/item-categories/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category id")
		return
	}
	switch r.Method {
	case http.MethodPut:
		var payload itemCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		emoji := strings.TrimSpace(payload.Emoji)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		if emoji == "" {
			emoji = "📦"
		}
		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE item_categories SET label = $1, emoji = $2, updated_at = NOW()
			WHERE id = $3 RETURNING created_at, updated_at
		`, label, emoji, id)
		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "category not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update item category")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_categories WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "label": label, "emoji": emoji,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM item_categories WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete item category")
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

// ─────────────────────────────────────────────────────────────────────────────
// Item Conditions — états des objets pour le formulaire d'annonce
// ─────────────────────────────────────────────────────────────────────────────

type itemConditionPayload struct {
	Label string `json:"label"`
}

func ensureItemConditionsSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS item_conditions (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_item_conditions_position ON item_conditions(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item_conditions`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		type seed struct{ label string }
		defaults := []seed{
			{"Neuf"},
			{"Très bon état"},
			{"Bon état"},
			{"Traces d'usure"},
			{"À restaurer"},
		}
		for i, d := range defaults {
			if _, err := db.Exec(
				`INSERT INTO item_conditions (label, position) VALUES ($1, $2)`,
				d.label, i,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func itemConditionsPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, label FROM item_conditions ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list item conditions")
		return
	}
	defer rows.Close()
	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label string
		if err := rows.Scan(&id, &label); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse item condition")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func itemConditionsAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, position, created_at, updated_at FROM item_conditions ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list item conditions")
			return
		}
		defer rows.Close()
		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var pos int
			var label string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse item condition")
				return
			}
			result = append(result, map[string]interface{}{
				"id": id, "label": label,
				"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload itemConditionPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO item_conditions (label, position)
			VALUES ($1, (SELECT COALESCE(MAX(position), -1) + 1 FROM item_conditions))
			RETURNING id, created_at, updated_at
		`, label).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "condition label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create item condition")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_conditions WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "label": label,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func itemConditionByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/item-conditions/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid condition id")
		return
	}
	switch r.Method {
	case http.MethodPut:
		var payload itemConditionPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE item_conditions SET label = $1, updated_at = NOW()
			WHERE id = $2 RETURNING created_at, updated_at
		`, label, id)
		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "condition not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "condition label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update item condition")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_conditions WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "label": label,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM item_conditions WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete item condition")
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "condition not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Item Materials — matériaux des objets pour le formulaire d'annonce
// ─────────────────────────────────────────────────────────────────────────────

type itemMaterialPayload struct {
	Label             string   `json:"label"`
	ImpactCoefficient *float64 `json:"impactCoefficient"`
}

const (
	defaultMaterialImpactCoefficient = 1.0
	maxMaterialImpactCoefficient     = 1000.0
)

func normalizeMaterialImpactCoefficient(v *float64) (float64, error) {
	if v == nil {
		return defaultMaterialImpactCoefficient, nil
	}
	if math.IsNaN(*v) || math.IsInf(*v, 0) {
		return 0, fmt.Errorf("impactCoefficient must be numeric")
	}
	if *v <= 0 {
		return 0, fmt.Errorf("impactCoefficient must be greater than 0")
	}
	if *v > maxMaterialImpactCoefficient {
		return 0, fmt.Errorf("impactCoefficient exceeds maximum allowed")
	}
	return *v, nil
}

func ensureItemMaterialsSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS item_materials (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			impact_coefficient NUMERIC(10,3) NOT NULL DEFAULT 1,
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE item_materials ADD COLUMN IF NOT EXISTS impact_coefficient NUMERIC(10,3) NOT NULL DEFAULT 1`,
		`UPDATE item_materials SET impact_coefficient = 1 WHERE impact_coefficient IS NULL OR impact_coefficient <= 0`,
		`CREATE INDEX IF NOT EXISTS idx_item_materials_position ON item_materials(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item_materials`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		type seed struct {
			label       string
			coefficient float64
		}
		defaults := []seed{
			{"Bois", 10},
			{"Métal", 15},
			{"Verre", 8},
			{"Plastique", 6},
			{"Tissu", 5},
			{"Céramique", 7},
			{"Pierre", 9},
			{"Cuir", 6},
		}
		for i, d := range defaults {
			if _, err := db.Exec(
				`INSERT INTO item_materials (label, impact_coefficient, position) VALUES ($1, $2, $3)`,
				d.label, d.coefficient, i,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func itemMaterialsPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, label, impact_coefficient FROM item_materials ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list item materials")
		return
	}
	defer rows.Close()
	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label string
		var impactCoefficient float64
		if err := rows.Scan(&id, &label, &impactCoefficient); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse item material")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label, "impactCoefficient": impactCoefficient})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func itemMaterialsAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, impact_coefficient, position, created_at, updated_at FROM item_materials ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list item materials")
			return
		}
		defer rows.Close()
		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var pos int
			var label string
			var impactCoefficient float64
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &impactCoefficient, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse item material")
				return
			}
			result = append(result, map[string]interface{}{
				"id": id, "label": label,
				"impactCoefficient": impactCoefficient,
				"position":          pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload itemMaterialPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		impactCoefficient, err := normalizeMaterialImpactCoefficient(payload.ImpactCoefficient)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		var id int64
		var createdAt, updatedAt time.Time
		err = db.QueryRow(`
			INSERT INTO item_materials (label, impact_coefficient, position)
			VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM item_materials))
			RETURNING id, created_at, updated_at
		`, label, impactCoefficient).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "material label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create item material")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_materials WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "label": label,
			"impactCoefficient": impactCoefficient,
			"position":          pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func itemMaterialByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/item-materials/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid material id")
		return
	}
	switch r.Method {
	case http.MethodPut:
		var payload itemMaterialPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		impactCoefficient, err := normalizeMaterialImpactCoefficient(payload.ImpactCoefficient)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE item_materials SET label = $1, impact_coefficient = $2, updated_at = NOW()
			WHERE id = $3 RETURNING created_at, updated_at
		`, label, impactCoefficient, id)
		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "material not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "material label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update item material")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_materials WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "label": label,
			"impactCoefficient": impactCoefficient,
			"position":          pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM item_materials WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete item material")
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeError(w, http.StatusNotFound, "material not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Item Countries — pays pour le formulaire d'annonce
// ─────────────────────────────────────────────────────────────────────────────

type itemCountryPayload struct {
	Label     string `json:"label"`
	Emoji     string `json:"emoji"`
	ZipLength int    `json:"zip_length"`
}

func ensureItemCountriesSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS item_countries (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			emoji      TEXT NOT NULL DEFAULT '',
			zip_length INT NOT NULL DEFAULT 5,
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_item_countries_position ON item_countries(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM item_countries`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		type seed struct {
			label     string
			emoji     string
			zipLength int
		}
		defaults := []seed{
			{"France", "🇫🇷", 5},
			{"Suisse", "🇨🇭", 4},
			{"Belgique", "🇧🇪", 4},
		}
		for i, d := range defaults {
			if _, err := db.Exec(
				`INSERT INTO item_countries (label, emoji, zip_length, position) VALUES ($1, $2, $3, $4)`,
				d.label, d.emoji, d.zipLength, i,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func itemCountriesPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT id, label, emoji, zip_length FROM item_countries ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list item countries")
		return
	}
	defer rows.Close()
	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label, emoji string
		var zipLength int
		if err := rows.Scan(&id, &label, &emoji, &zipLength); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse item country")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label, "emoji": emoji, "zip_length": zipLength})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func itemCountriesAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "requires admin role")
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, emoji, zip_length, position, created_at, updated_at FROM item_countries ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list item countries")
			return
		}
		defer rows.Close()
		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var pos, zipLength int
			var label, emoji string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &emoji, &zipLength, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse item country")
				return
			}
			result = append(result, map[string]interface{}{
				"id": id, "label": label, "emoji": emoji, "zip_length": zipLength,
				"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload itemCountryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		emoji := strings.TrimSpace(payload.Emoji)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		if payload.ZipLength <= 0 {
			payload.ZipLength = 5
		}
		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO item_countries (label, emoji, zip_length, position)
			VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), -1) + 1 FROM item_countries))
			RETURNING id, created_at, updated_at
		`, label, emoji, payload.ZipLength).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "country label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create item country")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_countries WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "label": label, "emoji": emoji, "zip_length": payload.ZipLength,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func itemCountryByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "requires admin role")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/item-countries/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid ID")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var payload itemCountryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		emoji := strings.TrimSpace(payload.Emoji)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		if payload.ZipLength <= 0 {
			payload.ZipLength = 5
		}
		var createdAt, updatedAt time.Time
		res := db.QueryRow(`
			UPDATE item_countries SET label = $1, emoji = $2, zip_length = $3, updated_at = NOW()
			WHERE id = $4 RETURNING created_at, updated_at
		`, label, emoji, payload.ZipLength, id)
		if err := res.Scan(&createdAt, &updatedAt); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "country not found")
				return
			}
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "country label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update item country")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM item_countries WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "label": label, "emoji": emoji, "zip_length": payload.ZipLength,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM item_countries WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete country")
			return
		}
		rowsAff, _ := result.RowsAffected()
		if rowsAff == 0 {
			writeError(w, http.StatusNotFound, "country not found")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func salarieMemberEventsHandler(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, _ := claims["userId"].(float64)
	userID := int64(userIDVal)

	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`
			SELECT e.id, e.name, e.description, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.intervenant_id, e.validation_status, e.rejection_comment, e.image_url, e.pricing_type, e.price, e.participant_count, e.created_at, e.updated_at
			FROM events e
			WHERE e.intervenant_id = $1
			ORDER BY e.date_debut ASC
		`, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list your events")
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

		var firstname, lastname string
		_ = db.QueryRow(`SELECT firstname, lastname FROM users WHERE id = $1`, userID).Scan(&firstname, &lastname)
		intervenantName := strings.TrimSpace(firstname + " " + lastname)

		var id int64
		var createdAt, updatedAt time.Time
		capacity := sql.NullInt64{}
		if payload.Capacite != nil {
			capacity = sql.NullInt64{Int64: *payload.Capacite, Valid: true}
		}

		err = db.QueryRow(`
			INSERT INTO events (name, description, type, date_debut, date_fin, lieu, capacite, status, intervenant, intervenant_id, validation_status, image_url, pricing_type, price)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			RETURNING id, created_at, updated_at
		`,
			strings.TrimSpace(payload.Name), strings.TrimSpace(payload.Description),
			normalizeEventType(payload.Type), startAt, endAt, strings.TrimSpace(payload.Lieu),
			capacity, normalizeEventStatus(payload.Status), intervenantName, userID,
			"pending", strings.TrimSpace(payload.ImageUrl), payload.PricingType, payload.Price,
		).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			log.Printf("Error creating event: %v", err)
			writeError(w, http.StatusInternalServerError, "could not create event")
			return
		}
		payload.Intervenant = intervenantName
		payload.ValidationStatus = "pending"
		writeJSON(w, http.StatusCreated, mapEventPayload(id, payload, startAt, endAt, createdAt, updatedAt))

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func salarieMemberEventByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDFromPath(r.URL.Path, "/api/salarie/events/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, _ := claims["userId"].(float64)
	userID := int64(userIDVal)

	// Check ownership
	var ownerID int64
	err = db.QueryRow(`SELECT intervenant_id FROM events WHERE id = $1`, id).Scan(&ownerID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "event not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if ownerID != userID {
		writeError(w, http.StatusForbidden, "not your event")
		return
	}

	switch r.Method {
	case http.MethodGet:
		row := db.QueryRow(`
			SELECT e.id, e.name, e.description, e.type, e.date_debut, e.date_fin, e.lieu, e.capacite, e.status, e.intervenant, e.intervenant_id, e.validation_status, e.rejection_comment, e.image_url, e.pricing_type, e.price, e.participant_count, e.created_at, e.updated_at
			FROM events e
			WHERE e.id = $1
		`, id)
		item, err := scanEventSingleRow(row)
		if err != nil {
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

		capacity := sql.NullInt64{}
		if payload.Capacite != nil {
			capacity = sql.NullInt64{Int64: *payload.Capacite, Valid: true}
		}

		var updatedAt time.Time
		err = db.QueryRow(`
			UPDATE events SET name=$1, description=$2, type=$3, date_debut=$4, date_fin=$5, lieu=$6, capacite=$7, status=$8, image_url=$9, pricing_type=$10, price=$11, validation_status='pending', rejection_comment='', updated_at=NOW()
			WHERE id=$12 RETURNING updated_at
		`, strings.TrimSpace(payload.Name), strings.TrimSpace(payload.Description),
			normalizeEventType(payload.Type), startAt, endAt, strings.TrimSpace(payload.Lieu),
			capacity, normalizeEventStatus(payload.Status), strings.TrimSpace(payload.ImageUrl),
			payload.PricingType, payload.Price, id,
		).Scan(&updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update event")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"id": id, "updatedAt": updatedAt.UTC().Format(time.RFC3339)})

	case http.MethodDelete:
		_, err = db.Exec(`DELETE FROM events WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete event")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func adminEventRegistrationRefundRoutes(w http.ResponseWriter, r *http.Request) {
	prefix := "/api/admin/event-registrations/"
	if !strings.HasPrefix(r.URL.Path, prefix) {
		http.NotFound(w, r)
		return
	}
	rest := strings.TrimPrefix(r.URL.Path, prefix)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) != 2 || parts[1] != "refund-decision" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	regID, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil || regID < 1 {
		writeError(w, http.StatusBadRequest, "invalid registration id")
		return
	}
	adminEventRegistrationRefundDecisionHandler(w, r, regID)
}

func adminEventRegistrationRefundDecisionHandler(w http.ResponseWriter, r *http.Request, registrationID int64) {
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	role, _ := claims["role"].(string)
	if role != "admin" && role != "salarie" {
		writeError(w, http.StatusForbidden, "not authorized")
		return
	}

	var body struct {
		Decision    string `json:"decision"`
		AmountCents *int64 `json:"amountCents"`
		Note        string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}
	decision := strings.ToLower(strings.TrimSpace(body.Decision))
	if decision != "approve" && decision != "reject" {
		writeError(w, http.StatusBadRequest, "decision must be approve or reject")
		return
	}

	if decision == "reject" {
		note := strings.TrimSpace(body.Note)
		if len(note) > 2000 {
			note = note[:2000]
		}
		msg := note
		if msg == "" {
			msg = "Demande de remboursement refusée"
		}
		res, err := db.Exec(`
			UPDATE event_registrations
			SET refund_status = 'non_refundable', refund_error = $1
			WHERE id = $2 AND refund_status = 'requested' AND payment_status = 'paid'
		`, msg, registrationID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		naff, _ := res.RowsAffected()
		if naff == 0 {
			writeError(w, http.StatusConflict, "demande introuvable ou déjà traitée")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "rejected": true})
		return
	}

	var eventID, userID int64
	var eventPrice float64
	var refundSt, paySt, piDB, sessionID string
	err := db.QueryRow(`
		SELECT er.event_id, er.user_id, e.price, er.refund_status, er.payment_status,
		       COALESCE(TRIM(er.stripe_payment_intent_id),''), COALESCE(TRIM(er.stripe_session_id),'')
		FROM event_registrations er
		JOIN events e ON e.id = er.event_id
		WHERE er.id = $1
	`, registrationID).Scan(&eventID, &userID, &eventPrice, &refundSt, &paySt, &piDB, &sessionID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "inscription introuvable")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if strings.TrimSpace(refundSt) != "requested" || strings.TrimSpace(paySt) != "paid" {
		writeError(w, http.StatusConflict, "cette inscription n'est pas en attente de remboursement")
		return
	}

	maxCents := items.RefundEURToAmountCents(eventPrice)
	if maxCents < 1 {
		writeError(w, http.StatusBadRequest, "montant d'événement invalide pour un remboursement")
		return
	}

	var reqCents int64
	if body.AmountCents != nil && *body.AmountCents > 0 {
		reqCents = *body.AmountCents
	} else {
		reqCents = maxCents
	}
	if reqCents < 1 {
		writeError(w, http.StatusBadRequest, "montant de remboursement invalide")
		return
	}
	if reqCents > maxCents {
		writeError(w, http.StatusBadRequest, "montant supérieur au prix du billet")
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "stripe non configuré")
		return
	}

	pi := strings.TrimSpace(piDB)
	if pi == "" && strings.TrimSpace(sessionID) != "" {
		var ferr error
		pi, ferr = items.GetStripePaymentIntentFromSessionPublic(cfg, strings.TrimSpace(sessionID))
		if ferr != nil {
			writeError(w, http.StatusBadGateway, "impossible de résoudre le paiement Stripe: "+ferr.Error())
			return
		}
	}
	if pi == "" {
		writeError(w, http.StatusBadRequest, "aucun paiement Stripe associé")
		return
	}

	var partial *int64
	if reqCents < maxCents {
		c := reqCents
		partial = &c
	}
	opts, recordEUR := items.NewEventRefundStripeParams("admin-ops-refund", eventID, userID, pi, eventPrice, partial)

	refundID, rerr := items.RefundStripePaymentIntentPublic(r.Context(), cfg, pi, opts)
	if rerr != nil {
		_, _ = db.Exec(`UPDATE event_registrations SET refund_status = 'failed', refund_error = $1 WHERE id = $2`, rerr.Error(), registrationID)
		writeError(w, http.StatusBadGateway, "remboursement Stripe: "+rerr.Error())
		return
	}

	res, err := db.Exec(`
		UPDATE event_registrations
		SET refund_status = 'refunded',
		    stripe_refund_id = $1,
		    refund_amount = $2,
		    refund_error = ''
		WHERE id = $3 AND refund_status = 'requested' AND payment_status = 'paid'
	`, refundID, recordEUR, registrationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeError(w, http.StatusConflict, "impossible de mettre à jour l'inscription (état changé)")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":             true,
		"refunded":       true,
		"refundAmount":   recordEUR,
		"stripeRefundId": refundID,
	})
}

type PaymentTransaction struct {
	Source           string    `json:"source"`
	SourceID         int64     `json:"sourceId"`
	EventID          int64     `json:"eventId,omitempty"`
	UserID           int64     `json:"userId"`
	UserName         string    `json:"userName"`
	EntityName       string    `json:"entityName"`
	Date             time.Time `json:"date"`
	Amount           float64   `json:"amount"`
	Status           string    `json:"status"`
	TransactionRef   string    `json:"transactionRef"`
	RefundAmount       float64   `json:"refundAmount"`
	StripeRefundID     string    `json:"stripeRefundId"`
	RefundError        string    `json:"refundError"`
}

func adminEventRefundRequestsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	role, _ := claims["role"].(string)
	if role != "admin" && role != "salarie" {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	rows, err := db.Query(`
		SELECT er.id, e.id, e.name, e.date_debut, e.date_fin, e.lieu, e.price,
		       u.id,
		       COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), u.email) AS user_name,
		       u.email,
		       er.created_at, er.cancelled_at, er.refund_request_reason,
		       COALESCE(NULLIF(er.stripe_payment_intent_id, ''), er.stripe_session_id) AS tx_ref,
		       er.refund_status, er.payment_status
		FROM event_registrations er
		JOIN events e ON e.id = er.event_id
		JOIN users u ON u.id = er.user_id
		WHERE er.refund_status = 'requested'
		ORDER BY er.cancelled_at DESC NULLS LAST, er.id DESC
	`)
	if err != nil {
		log.Printf("[Admin] event refund requests: %v", err)
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type rowItem struct {
		RegistrationID int64     `json:"registrationId"`
		EventID          int64     `json:"eventId"`
		EventName        string    `json:"eventName"`
		DateDebut        string    `json:"dateDebut"`
		DateFin          string    `json:"dateFin"`
		Lieu             string    `json:"lieu"`
		Price            float64   `json:"price"`
		UserID           int64     `json:"userId"`
		UserName         string    `json:"userName"`
		UserEmail        string    `json:"userEmail"`
		RegisteredAt     string    `json:"registeredAt"`
		CancelledAt      string    `json:"cancelledAt"`
		Reason           string    `json:"reason"`
		TransactionRef   string    `json:"transactionRef"`
		RefundStatus     string    `json:"refundStatus"`
		PaymentStatus    string    `json:"paymentStatus"`
	}
	items := []rowItem{}
	for rows.Next() {
		var it rowItem
		var dateDebut, dateFin, createdAt time.Time
		var cancelledAt sql.NullTime
		if err := rows.Scan(&it.RegistrationID, &it.EventID, &it.EventName, &dateDebut, &dateFin, &it.Lieu, &it.Price,
			&it.UserID, &it.UserName, &it.UserEmail, &createdAt, &cancelledAt, &it.Reason, &it.TransactionRef, &it.RefundStatus, &it.PaymentStatus); err != nil {
			log.Printf("[Admin] scan refund request: %v", err)
			continue
		}
		it.DateDebut = dateDebut.UTC().Format(time.RFC3339)
		it.DateFin = dateFin.UTC().Format(time.RFC3339)
		it.RegisteredAt = createdAt.UTC().Format(time.RFC3339)
		if cancelledAt.Valid {
			it.CancelledAt = cancelledAt.Time.UTC().Format(time.RFC3339)
		}
		items = append(items, it)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func adminFinancesPaymentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	role, _ := claims["role"].(string)
	if role != "admin" {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	query := `
		SELECT 'Inscription événement' AS source, er.id AS source_id, e.id AS event_id, u.id AS user_id, 
		       COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), u.email) AS user_name, 
		       e.name AS entity_name, er.created_at AS date, e.price AS amount, 
		       CASE
		           WHEN er.refund_status = 'requested' THEN 'refund_requested'
		           WHEN er.refund_status = 'refunded' THEN 'refunded'
		           WHEN er.refund_status = 'non_refundable' THEN 'non_refundable'
		           WHEN er.refund_status = 'failed' THEN 'refund_failed'
		           ELSE er.payment_status
		       END AS status,
		       COALESCE(NULLIF(er.stripe_payment_intent_id, ''), er.stripe_session_id) AS transaction_ref,
		       COALESCE(er.refund_amount, 0)::double precision AS refund_amount,
		       COALESCE(TRIM(er.stripe_refund_id), '') AS stripe_refund_id,
		       COALESCE(TRIM(er.refund_error), '') AS refund_error
		FROM event_registrations er
		JOIN events e ON er.event_id = e.id
		JOIN users u ON er.user_id = u.id
		WHERE e.price > 0
		
		UNION ALL
		
		SELECT 'Vente annonce' AS source, i.id AS source_id, CAST(0 AS BIGINT) AS event_id, COALESCE(u.id, i.user_id) AS user_id, 
		       COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), u.email, 'Client') AS user_name, 
		       i.title AS entity_name, COALESCE(il.stripe_paid_at, il.updated_at, i.updated_at) AS date, 
		       (COALESCE(NULLIF(il.stripe_amount_cents, 0), CAST(ROUND(i.price * 100) AS BIGINT))::double precision / 100.0) AS amount, 
		       CASE 
		           WHEN il.stripe_payment_status IN ('paid', 'succeeded') THEN 'paid'
		           WHEN il.stripe_payment_status = 'refunded' THEN 'refunded'
		           WHEN i.status IN ('vendu', 'vendue') THEN 'paid'
		           ELSE COALESCE(NULLIF(il.stripe_payment_status, ''), 'pending')
		       END AS status, 
		       COALESCE(il.stripe_payment_intent_id, il.stripe_checkout_session_id, '') AS transaction_ref,
		       0::double precision AS refund_amount,
		       '' AS stripe_refund_id,
		       '' AS refund_error
		FROM items i
		LEFT JOIN item_logistics il ON il.item_id = i.id
		LEFT JOIN users u ON il.reserved_by_user_id = u.id
		WHERE (i.status IN ('vendu', 'vendue') OR COALESCE(il.stripe_payment_status, '') IN ('paid', 'succeeded'))
		
		UNION ALL
		
		SELECT 'Réservation service' AS source, sb.id AS source_id, CAST(0 AS BIGINT) AS event_id, u.id AS user_id, 
		       COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), u.email) AS user_name, 
		       s.name AS entity_name, sb.created_at AS date, sb.amount AS amount, 
		       sb.payment_status AS status, '' AS transaction_ref,
		       0::double precision AS refund_amount,
		       '' AS stripe_refund_id,
		       '' AS refund_error
		FROM service_bookings sb
		JOIN services s ON sb.service_id = s.id
		JOIN users u ON sb.user_id = u.id
		WHERE sb.amount > 0
		
		ORDER BY date DESC;
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("[Finances] Error querying payments: %v", err)
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	transactions := []PaymentTransaction{}
	for rows.Next() {
		var t PaymentTransaction
		var date sql.NullTime
		if err := rows.Scan(&t.Source, &t.SourceID, &t.EventID, &t.UserID, &t.UserName, &t.EntityName, &date, &t.Amount, &t.Status, &t.TransactionRef, &t.RefundAmount, &t.StripeRefundID, &t.RefundError); err != nil {
			log.Printf("[Finances] Error scanning payment row: %v", err)
			continue
		}
		if date.Valid {
			t.Date = date.Time
		}
		transactions = append(transactions, t)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": transactions})
}

// myFinancesPaymentsHandler — GET /api/finances/my-payments — historique des paiements pour l’utilisateur connecté (particulier, pro, salarié, admin).
func myFinancesPaymentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	userIDVal, ok := claims["userId"].(float64)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID := int64(userIDVal)

	query := `
		SELECT 'Inscription événement' AS source, er.id AS source_id, e.id AS event_id, er.user_id AS user_id,
		       COALESCE(NULLIF(TRIM(e.intervenant), ''), '—') AS user_name,
		       e.name AS entity_name, er.created_at AS date, e.price AS amount,
		       CASE
		           WHEN er.refund_status = 'requested' THEN 'refund_requested'
		           WHEN er.refund_status = 'refunded' THEN 'refunded'
		           WHEN er.refund_status = 'non_refundable' THEN 'non_refundable'
		           WHEN er.refund_status = 'failed' THEN 'refund_failed'
		           ELSE er.payment_status
		       END AS status,
		       COALESCE(NULLIF(er.stripe_payment_intent_id, ''), er.stripe_session_id) AS transaction_ref,
		       COALESCE(er.refund_amount, 0)::double precision AS refund_amount,
		       COALESCE(TRIM(er.stripe_refund_id), '') AS stripe_refund_id,
		       COALESCE(TRIM(er.refund_error), '') AS refund_error
		FROM event_registrations er
		JOIN events e ON er.event_id = e.id
		WHERE er.user_id = $1
		  AND er.payment_status <> 'pending'
		  AND (e.price > 0 OR er.payment_status IN ('paid', 'gratuit'))

		UNION ALL

		SELECT 'Achat annonce' AS source, i.id AS source_id, CAST(0 AS BIGINT) AS event_id, COALESCE(u.id, il.reserved_by_user_id) AS user_id,
		       COALESCE(NULLIF(TRIM(COALESCE(sel.firstname, '') || ' ' || COALESCE(sel.lastname, '')), ''), sel.email, 'Vendeur') AS user_name,
		       i.title AS entity_name, COALESCE(il.stripe_paid_at, il.updated_at, i.updated_at) AS date,
		       (COALESCE(NULLIF(il.stripe_amount_cents, 0), CAST(ROUND(i.price * 100) AS BIGINT))::double precision / 100.0) AS amount,
		       CASE
		           WHEN il.stripe_payment_status IN ('paid', 'succeeded') THEN 'paid'
		           WHEN il.stripe_payment_status = 'refunded' THEN 'refunded'
		           WHEN i.status IN ('vendu', 'vendue') THEN 'paid'
		           ELSE COALESCE(NULLIF(il.stripe_payment_status, ''), 'pending')
		       END AS status,
		       COALESCE(il.stripe_payment_intent_id, il.stripe_checkout_session_id, '') AS transaction_ref,
		       0::double precision AS refund_amount,
		       '' AS stripe_refund_id,
		       '' AS refund_error
		FROM items i
		JOIN item_logistics il ON il.item_id = i.id
		LEFT JOIN users u ON u.id = il.reserved_by_user_id
		JOIN users sel ON sel.id = i.user_id
		WHERE il.reserved_by_user_id = $1
		  AND (i.status IN ('vendu', 'vendue') OR COALESCE(il.stripe_payment_status, '') IN ('paid', 'succeeded', 'pending', 'processing'))

		UNION ALL

		SELECT 'Vente annonce' AS source, i.id AS source_id, CAST(0 AS BIGINT) AS event_id, i.user_id AS user_id,
		       COALESCE(NULLIF(TRIM(COALESCE(buy.firstname, '') || ' ' || COALESCE(buy.lastname, '')), ''), buy.email, 'Acheteur') AS user_name,
		       i.title AS entity_name, COALESCE(il.stripe_paid_at, il.updated_at, i.updated_at) AS date,
		       (COALESCE(NULLIF(il.stripe_amount_cents, 0), CAST(ROUND(i.price * 100) AS BIGINT))::double precision / 100.0) AS amount,
		       CASE
		           WHEN il.stripe_payment_status IN ('paid', 'succeeded') THEN 'paid'
		           WHEN il.stripe_payment_status = 'refunded' THEN 'refunded'
		           WHEN i.status IN ('vendu', 'vendue') THEN 'paid'
		           ELSE COALESCE(NULLIF(il.stripe_payment_status, ''), 'pending')
		       END AS status,
		       COALESCE(il.stripe_payment_intent_id, il.stripe_checkout_session_id, '') AS transaction_ref,
		       0::double precision AS refund_amount,
		       '' AS stripe_refund_id,
		       '' AS refund_error
		FROM items i
		JOIN item_logistics il ON il.item_id = i.id
		LEFT JOIN users buy ON buy.id = il.reserved_by_user_id
		WHERE i.user_id = $1
		  AND il.reserved_by_user_id IS NOT NULL
		  AND il.reserved_by_user_id <> i.user_id
		  AND (i.status IN ('vendu', 'vendue') OR COALESCE(il.stripe_payment_status, '') IN ('paid', 'succeeded', 'pending', 'processing'))

		UNION ALL

		SELECT 'Réservation service' AS source, sb.id AS source_id, CAST(0 AS BIGINT) AS event_id, u.id AS user_id,
		       COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), u.email) AS user_name,
		       s.name AS entity_name, sb.created_at AS date, sb.amount AS amount,
		       sb.payment_status AS status, '' AS transaction_ref,
		       0::double precision AS refund_amount,
		       '' AS stripe_refund_id,
		       '' AS refund_error
		FROM service_bookings sb
		JOIN services s ON sb.service_id = s.id
		JOIN users u ON sb.user_id = u.id
		WHERE sb.user_id = $1 AND sb.amount > 0

		ORDER BY date DESC
	`

	rows, err := db.Query(query, userID)
	if err != nil {
		log.Printf("[Finances] my-payments: %v", err)
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	transactions := []PaymentTransaction{}
	for rows.Next() {
		var t PaymentTransaction
		var date sql.NullTime
		if err := rows.Scan(&t.Source, &t.SourceID, &t.EventID, &t.UserID, &t.UserName, &t.EntityName, &date, &t.Amount, &t.Status, &t.TransactionRef, &t.RefundAmount, &t.StripeRefundID, &t.RefundError); err != nil {
			log.Printf("[Finances] my-payments scan: %v", err)
			continue
		}
		if date.Valid {
			t.Date = date.Time
		}
		transactions = append(transactions, t)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": transactions})
}

func adminSaleCommissionHandler(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	role, _ := claims["role"].(string)
	if role != "admin" {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var mode sql.NullString
		var pct sql.NullFloat64
		err := db.QueryRow(`SELECT mode, percent FROM sale_commission_config WHERE id = 1`).Scan(&mode, &pct)
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusOK, map[string]any{"percent": 0.0, "mode": "deducted"})
			return
		}
		if err != nil {
			log.Printf("[Finances] sale-commission get: %v", err)
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		m := strings.TrimSpace(strings.ToLower(mode.String))
		if m != "added" {
			m = "deducted"
		}
		v := 0.0
		if pct.Valid {
			v = pct.Float64
		}
		writeJSON(w, http.StatusOK, map[string]any{"percent": v, "mode": m})
	case http.MethodPut, http.MethodPatch:
		var body struct {
			Percent float64 `json:"percent"`
			Mode    string  `json:"mode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if body.Percent < 0 || body.Percent > 100 {
			writeError(w, http.StatusBadRequest, "percent must be between 0 and 100")
			return
		}
		m := strings.TrimSpace(strings.ToLower(body.Mode))
		if m != "added" {
			m = "deducted"
		}
		if _, err := db.Exec(
			`INSERT INTO sale_commission_config (id, percent, mode) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET percent = EXCLUDED.percent, mode = EXCLUDED.mode`,
			body.Percent, m,
		); err != nil {
			log.Printf("[Finances] sale-commission put: %v", err)
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"percent": body.Percent, "mode": m})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// ─── FORUM ────────────────────────────────────────────────────────────────────

func ensureForumSchema() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS forum_topics (
			id         BIGSERIAL PRIMARY KEY,
			user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title      TEXT NOT NULL,
			content    TEXT NOT NULL DEFAULT '',
			status     TEXT NOT NULL DEFAULT 'open',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT forum_topics_status_check CHECK (status IN ('open','closed','hidden'))
		)`,
		`CREATE TABLE IF NOT EXISTS forum_replies (
			id         BIGSERIAL PRIMARY KEY,
			topic_id   BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
			user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			content    TEXT NOT NULL,
			status     TEXT NOT NULL DEFAULT 'visible',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT forum_replies_status_check CHECK (status IN ('visible','reported','hidden','deleted'))
		)`,
		`CREATE TABLE IF NOT EXISTS forum_reports (
			id          BIGSERIAL PRIMARY KEY,
			topic_id    BIGINT REFERENCES forum_topics(id) ON DELETE CASCADE,
			reply_id    BIGINT REFERENCES forum_replies(id) ON DELETE CASCADE,
			reported_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			reason      TEXT NOT NULL DEFAULT '',
			status      TEXT NOT NULL DEFAULT 'pending',
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT forum_reports_status_check CHECK (status IN ('pending','resolved','ignored'))
		)`,
		`CREATE TABLE IF NOT EXISTS forum_reply_likes (
			user_id  BIGINT NOT NULL,
			reply_id BIGINT NOT NULL,
			PRIMARY KEY (user_id, reply_id)
		)`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return err
		}
	}
	return nil
}

func forumCallerID(r *http.Request) (int64, string, error) {
	claims, _ := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	email, _ := claims["sub"].(string)
	role, _ := claims["role"].(string)
	var id int64
	if err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, email).Scan(&id); err != nil {
		return 0, "", err
	}
	return id, role, nil
}

// GET /api/forum/topics          — liste
// POST /api/forum/topics         — créer un sujet
func forumTopicsHandler(w http.ResponseWriter, r *http.Request) {
	callerID, callerRole, err := forumCallerID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	switch r.Method {
	case http.MethodGet:
		statusFilter := r.URL.Query().Get("status") // "" = tous visibles
		var rows *sql.Rows
		if callerRole == "admin" || callerRole == "salarie" {
			if statusFilter != "" {
				rows, err = db.Query(`
					SELECT t.id, t.user_id, u.firstname, u.lastname, t.title, t.content, t.status, t.created_at, t.updated_at,
					       (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id AND r.status != 'deleted') AS reply_count
					FROM forum_topics t JOIN users u ON u.id = t.user_id
					WHERE t.status = $1 ORDER BY t.created_at DESC
				`, statusFilter)
			} else {
				rows, err = db.Query(`
					SELECT t.id, t.user_id, u.firstname, u.lastname, t.title, t.content, t.status, t.created_at, t.updated_at,
					       (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id AND r.status != 'deleted') AS reply_count
					FROM forum_topics t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC
				`)
			}
		} else {
			rows, err = db.Query(`
				SELECT t.id, t.user_id, u.firstname, u.lastname, t.title, t.content, t.status, t.created_at, t.updated_at,
				       (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id AND r.status != 'deleted') AS reply_count
				FROM forum_topics t JOIN users u ON u.id = t.user_id
				WHERE t.status IN ('open','closed') ORDER BY t.created_at DESC
			`)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list topics")
			return
		}
		defer rows.Close()
		items := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id, userID, replyCount int64
			var fn, ln, title, content, status string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &userID, &fn, &ln, &title, &content, &status, &createdAt, &updatedAt, &replyCount); err != nil {
				continue
			}
			items = append(items, map[string]interface{}{
				"id": id, "userId": userID,
				"authorName": strings.TrimSpace(fn + " " + ln),
				"title":      title, "content": content, "status": status,
				"replyCount": replyCount,
				"isOwn":      userID == callerID,
				"createdAt":  createdAt.UTC().Format(time.RFC3339),
				"updatedAt":  updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})

	case http.MethodPost:
		var p struct {
			Title   string `json:"title"`
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil || strings.TrimSpace(p.Title) == "" {
			writeError(w, http.StatusBadRequest, "title required")
			return
		}
		var id int64
		var createdAt, updatedAt time.Time
		err = db.QueryRow(`INSERT INTO forum_topics (user_id, title, content) VALUES ($1,$2,$3) RETURNING id, created_at, updated_at`,
			callerID, strings.TrimSpace(p.Title), strings.TrimSpace(p.Content)).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create topic")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "userId": callerID, "title": p.Title, "content": p.Content,
			"status": "open", "replyCount": 0,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// GET /api/forum/topics/{id}     — détail + replies
// PUT /api/forum/topics/{id}     — modifier (owner ou admin/salarié)
// DELETE /api/forum/topics/{id}  — supprimer (owner ou admin)
// PATCH /api/forum/topics/{id}   — changer le statut (admin/salarié)
func forumTopicByIDHandler(w http.ResponseWriter, r *http.Request) {
	topicID, err := parseIDFromPath(r.URL.Path, "/api/forum/topics/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	callerID, callerRole, err := forumCallerID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	switch r.Method {
	case http.MethodGet:
		var topicUserID int64
		var fn, ln, title, content, status string
		var createdAt, updatedAt time.Time
		if err := db.QueryRow(`
			SELECT t.user_id, u.firstname, u.lastname, t.title, t.content, t.status, t.created_at, t.updated_at
			FROM forum_topics t JOIN users u ON u.id = t.user_id WHERE t.id = $1
		`, topicID).Scan(&topicUserID, &fn, &ln, &title, &content, &status, &createdAt, &updatedAt); err != nil {
			writeError(w, http.StatusNotFound, "topic not found")
			return
		}
		if status == "hidden" && callerRole != "admin" && callerRole != "salarie" {
			writeError(w, http.StatusForbidden, "topic not accessible")
			return
		}
		// replies
		replyRows, err := db.Query(`
			SELECT r.id, r.user_id, u.firstname, u.lastname, r.content, r.status, r.created_at, r.updated_at,
			       (SELECT COUNT(*) FROM forum_reply_likes l WHERE l.reply_id = r.id) AS like_count,
			       EXISTS(SELECT 1 FROM forum_reply_likes l2 WHERE l2.reply_id = r.id AND l2.user_id = $2) AS liked_by_me
			FROM forum_replies r JOIN users u ON u.id = r.user_id
			WHERE r.topic_id = $1 AND r.status != 'deleted'
			ORDER BY r.created_at ASC
		`, topicID, callerID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load replies")
			return
		}
		defer replyRows.Close()
		replies := make([]map[string]interface{}, 0)
		for replyRows.Next() {
			var rid, ruID, lc int64
			var rfn, rln, rc, rs string
			var rca, rua time.Time
			var likedByMe bool
			if err := replyRows.Scan(&rid, &ruID, &rfn, &rln, &rc, &rs, &rca, &rua, &lc, &likedByMe); err != nil {
				continue
			}
			if rs == "hidden" && callerRole != "admin" && callerRole != "salarie" {
				continue
			}
			replies = append(replies, map[string]interface{}{
				"id": rid, "userId": ruID,
				"authorName": strings.TrimSpace(rfn + " " + rln),
				"content":    rc, "status": rs,
				"likeCount": lc, "likedByMe": likedByMe,
				"isOwn":     ruID == callerID,
				"createdAt": rca.UTC().Format(time.RFC3339),
				"updatedAt": rua.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": topicID, "userId": topicUserID,
			"authorName": strings.TrimSpace(fn + " " + ln),
			"title":      title, "content": content, "status": status,
			"isOwn":     topicUserID == callerID,
			"replies":   replies,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodPut:
		var p struct {
			Title   string `json:"title"`
			Content string `json:"content"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		var ownerID int64
		db.QueryRow(`SELECT user_id FROM forum_topics WHERE id = $1`, topicID).Scan(&ownerID)
		if ownerID != callerID && callerRole != "admin" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		if _, err := db.Exec(`UPDATE forum_topics SET title=$1, content=$2, updated_at=NOW() WHERE id=$3`,
			strings.TrimSpace(p.Title), strings.TrimSpace(p.Content), topicID); err != nil {
			writeError(w, http.StatusInternalServerError, "could not update topic")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})

	case http.MethodPatch:
		if callerRole != "admin" && callerRole != "salarie" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		var p struct {
			Status string `json:"status"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		allowed := map[string]bool{"open": true, "closed": true, "hidden": true}
		if !allowed[p.Status] {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}
		if _, err := db.Exec(`UPDATE forum_topics SET status=$1, updated_at=NOW() WHERE id=$2`, p.Status, topicID); err != nil {
			writeError(w, http.StatusInternalServerError, "could not update status")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})

	case http.MethodDelete:
		var ownerID int64
		db.QueryRow(`SELECT user_id FROM forum_topics WHERE id = $1`, topicID).Scan(&ownerID)
		if ownerID != callerID && callerRole != "admin" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		db.Exec(`DELETE FROM forum_topics WHERE id = $1`, topicID)
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// POST /api/forum/replies        — créer une réponse
func forumRepliesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	callerID, _, err := forumCallerID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var p struct {
		TopicID int64  `json:"topicId"`
		Content string `json:"content"`
	}
	json.NewDecoder(r.Body).Decode(&p)
	if p.TopicID == 0 || strings.TrimSpace(p.Content) == "" {
		writeError(w, http.StatusBadRequest, "topicId and content required")
		return
	}
	// vérifier que le sujet est ouvert
	var topicStatus string
	db.QueryRow(`SELECT status FROM forum_topics WHERE id = $1`, p.TopicID).Scan(&topicStatus)
	if topicStatus != "open" {
		writeError(w, http.StatusBadRequest, "topic is closed")
		return
	}
	var id int64
	var createdAt time.Time
	err = db.QueryRow(`INSERT INTO forum_replies (topic_id, user_id, content) VALUES ($1,$2,$3) RETURNING id, created_at`,
		p.TopicID, callerID, strings.TrimSpace(p.Content)).Scan(&id, &createdAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create reply")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id": id, "topicId": p.TopicID, "userId": callerID,
		"content": p.Content, "status": "visible", "likeCount": 0, "likedByMe": false,
		"isOwn": true, "createdAt": createdAt.UTC().Format(time.RFC3339),
	})
}

// PUT    /api/forum/replies/{id}        — modifier son propre message
// DELETE /api/forum/replies/{id}        — supprimer (owner ou admin/salarié)
// PATCH  /api/forum/replies/{id}        — changer statut (admin/salarié)
// POST   /api/forum/replies/{id}/like   — liker
// DELETE /api/forum/replies/{id}/like   — unliker
func forumReplyByIDHandler(w http.ResponseWriter, r *http.Request) {
	callerID, callerRole, err := forumCallerID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := r.URL.Path

	// Like / unlike
	if strings.HasSuffix(path, "/like") {
		replyID, err := parseIDFromPath(strings.TrimSuffix(path, "/like"), "/api/forum/replies/")
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		switch r.Method {
		case http.MethodPost:
			db.Exec(`INSERT INTO forum_reply_likes (user_id, reply_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, callerID, replyID)
			writeJSON(w, http.StatusOK, map[string]interface{}{"liked": true})
		case http.MethodDelete:
			db.Exec(`DELETE FROM forum_reply_likes WHERE user_id=$1 AND reply_id=$2`, callerID, replyID)
			writeJSON(w, http.StatusOK, map[string]interface{}{"liked": false})
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
		return
	}

	replyID, err := parseIDFromPath(path, "/api/forum/replies/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodPut:
		var p struct {
			Content string `json:"content"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		var ownerID int64
		db.QueryRow(`SELECT user_id FROM forum_replies WHERE id = $1`, replyID).Scan(&ownerID)
		if ownerID != callerID && callerRole != "admin" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		db.Exec(`UPDATE forum_replies SET content=$1, updated_at=NOW() WHERE id=$2`, strings.TrimSpace(p.Content), replyID)
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})

	case http.MethodPatch:
		if callerRole != "admin" && callerRole != "salarie" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		var p struct {
			Status string `json:"status"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		allowed := map[string]bool{"visible": true, "hidden": true, "deleted": true}
		if !allowed[p.Status] {
			writeError(w, http.StatusBadRequest, "invalid status")
			return
		}
		db.Exec(`UPDATE forum_replies SET status=$1, updated_at=NOW() WHERE id=$2`, p.Status, replyID)
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})

	case http.MethodDelete:
		var ownerID int64
		db.QueryRow(`SELECT user_id FROM forum_replies WHERE id = $1`, replyID).Scan(&ownerID)
		if ownerID != callerID && callerRole != "admin" && callerRole != "salarie" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		db.Exec(`UPDATE forum_replies SET status='deleted', updated_at=NOW() WHERE id=$1`, replyID)
		writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// POST /api/forum/reports        — signaler
// GET  /api/forum/reports        — liste signalements (admin/salarié)
func forumReportsHandler(w http.ResponseWriter, r *http.Request) {
	callerID, callerRole, err := forumCallerID(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	switch r.Method {
	case http.MethodPost:
		var p struct {
			TopicID *int64 `json:"topicId"`
			ReplyID *int64 `json:"replyId"`
			Reason  string `json:"reason"`
		}
		json.NewDecoder(r.Body).Decode(&p)
		if p.TopicID == nil && p.ReplyID == nil {
			writeError(w, http.StatusBadRequest, "topicId or replyId required")
			return
		}
		var topicIDVal, replyIDVal interface{}
		if p.TopicID != nil {
			topicIDVal = *p.TopicID
		}
		if p.ReplyID != nil {
			replyIDVal = *p.ReplyID
		}
		if _, err := db.Exec(`INSERT INTO forum_reports (topic_id, reply_id, reported_by, reason) VALUES ($1,$2,$3,$4)`,
			topicIDVal, replyIDVal, callerID, strings.TrimSpace(p.Reason)); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create report")
			return
		}
		// marquer la réponse comme reported
		if p.ReplyID != nil {
			db.Exec(`UPDATE forum_replies SET status='reported' WHERE id=$1 AND status='visible'`, *p.ReplyID)
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"success": true})

	case http.MethodGet:
		if callerRole != "admin" && callerRole != "salarie" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		statusFilter := r.URL.Query().Get("status")
		var rows *sql.Rows
		if statusFilter != "" {
			rows, err = db.Query(`
				SELECT rp.id, rp.topic_id, rp.reply_id, rp.reported_by, u.firstname, u.lastname, rp.reason, rp.status, rp.created_at,
				       COALESCE(r.content, t.content, '') AS content,
				       COALESCE(au.firstname||' '||au.lastname, '') AS author_name
				FROM forum_reports rp
				JOIN users u ON u.id = rp.reported_by
				LEFT JOIN forum_replies r ON r.id = rp.reply_id
				LEFT JOIN forum_topics t ON t.id = rp.topic_id
				LEFT JOIN users au ON au.id = COALESCE(r.user_id, t.user_id)
				WHERE rp.status = $1 ORDER BY rp.created_at DESC
			`, statusFilter)
		} else {
			rows, err = db.Query(`
				SELECT rp.id, rp.topic_id, rp.reply_id, rp.reported_by, u.firstname, u.lastname, rp.reason, rp.status, rp.created_at,
				       COALESCE(r.content, t.content, '') AS content,
				       COALESCE(au.firstname||' '||au.lastname, '') AS author_name
				FROM forum_reports rp
				JOIN users u ON u.id = rp.reported_by
				LEFT JOIN forum_replies r ON r.id = rp.reply_id
				LEFT JOIN forum_topics t ON t.id = rp.topic_id
				LEFT JOIN users au ON au.id = COALESCE(r.user_id, t.user_id)
				ORDER BY rp.created_at DESC
			`)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load reports")
			return
		}
		defer rows.Close()
		items := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id, reportedBy int64
			var topicIDn, replyIDn sql.NullInt64
			var fn, ln, reason, status, content, authorName string
			var createdAt time.Time
			if err := rows.Scan(&id, &topicIDn, &replyIDn, &reportedBy, &fn, &ln, &reason, &status, &createdAt, &content, &authorName); err != nil {
				continue
			}
			item := map[string]interface{}{
				"id": id, "reportedBy": reportedBy,
				"reporterName": strings.TrimSpace(fn + " " + ln),
				"authorName":   strings.TrimSpace(authorName),
				"reason":       reason, "status": status, "content": content,
				"createdAt": createdAt.UTC().Format(time.RFC3339),
			}
			if topicIDn.Valid {
				item["topicId"] = topicIDn.Int64
			}
			if replyIDn.Valid {
				item["replyId"] = replyIDn.Int64
			}
			items = append(items, item)
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// PATCH /api/forum/reports/{id}  — résoudre ou ignorer un signalement
func forumReportByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	_, callerRole, err := forumCallerID(r)
	if err != nil || (callerRole != "admin" && callerRole != "salarie") {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}
	reportID, err := parseIDFromPath(r.URL.Path, "/api/forum/reports/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var p struct {
		Status string `json:"status"`
	}
	json.NewDecoder(r.Body).Decode(&p)
	allowed := map[string]bool{"resolved": true, "ignored": true}
	if !allowed[p.Status] {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}
	db.Exec(`UPDATE forum_reports SET status=$1 WHERE id=$2`, p.Status, reportID)
	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

func dashboardStatsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var totalUsers int
	_ = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&totalUsers)

	var particuliers int
	_ = db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'particulier'").Scan(&particuliers)

	var pros int
	_ = db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'pro'").Scan(&pros)

	var salaries int
	_ = db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'salarie'").Scan(&salaries)

	var pendingItems int
	_ = db.QueryRow("SELECT COUNT(*) FROM items WHERE status = 'en attente'").Scan(&pendingItems)

	var itemsInContainers int
	_ = db.QueryRow("SELECT COUNT(*) FROM items WHERE container_id IS NOT NULL AND status = 'actif'").Scan(&itemsInContainers)

	var donItems int
	_ = db.QueryRow("SELECT COUNT(*) FROM items WHERE type = 'don' AND status = 'actif'").Scan(&donItems)

	var venteItems int
	_ = db.QueryRow("SELECT COUNT(*) FROM items WHERE type = 'vente' AND status = 'actif'").Scan(&venteItems)

	var upcyclingProjects int
	_ = db.QueryRow("SELECT COUNT(*) FROM upcycling_projects").Scan(&upcyclingProjects)

	stats := map[string]interface{}{
		"totalUsers": totalUsers,
		"particuliers": particuliers,
		"pros": pros,
		"salaries": salaries,
		"pendingItems": pendingItems,
		"itemsInContainers": itemsInContainers,
		"donItems": donItems,
		"venteItems": venteItems,
		"upcyclingProjects": upcyclingProjects,
	}

	writeJSON(w, http.StatusOK, stats)
}
