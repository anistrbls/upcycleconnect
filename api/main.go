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

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /ping", pingHandler)
	mux.HandleFunc("GET /api/status", statusHandler)
	mux.HandleFunc("POST /api/auth/login", loginHandler)
	mux.Handle("GET /api/auth/me", authMiddleware(http.HandlerFunc(meHandler)))

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

func loginHandler(w http.ResponseWriter, r *http.Request) {
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
