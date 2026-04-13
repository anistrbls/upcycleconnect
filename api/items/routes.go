package items

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)


func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Items schema error: %v", err)
	}
	if err := repo.EnsureLogisticsSchema(); err != nil {
		log.Fatalf("Logistics schema error: %v", err)
	}

	// GET /api/items (public viewing of active items)
	mux.HandleFunc("GET /api/items", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		items, err := repo.List(StatusActive, query)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})

	// GET /api/items/{id} (public detail)
	mux.HandleFunc("GET /api/items/", func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/items/")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		item, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, "item not found")
			return
		}
		writeJSON(w, http.StatusOK, item)
	})

	// Protected routes
	// POST /api/items (create item)
	mux.Handle("POST /api/items", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		// Get user ID from email (since we don't have it in claims yet)
		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		var payload CreatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		item, err := repo.Create(userID, payload)
		if err != nil {
			log.Printf("Error creating item: %v", err)
			writeError(w, http.StatusInternalServerError, "could not create item")
			return
		}
		writeJSON(w, http.StatusCreated, item)
	})))

	// PUT /api/admin/items/{id} (update item)
	mux.Handle("PUT /api/admin/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/admin/items/")
		itemID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		var payload CreatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		item, err := repo.Update(userID, itemID, payload)
		if err != nil {
			log.Printf("Error updating item: %v", err)
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "item not found or unauthorized")
			} else {
				writeError(w, http.StatusInternalServerError, "could not update item")
			}
			return
		}
		writeJSON(w, http.StatusOK, item)
	})))

	// GET /api/my-items (user's ads)
	mux.Handle("GET /api/my-items", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		items, err := repo.ListByUser(userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list your items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})))

	// Moderation routes (Admin only)
	// GET /api/admin/items (moderation list)
	mux.Handle("GET /api/admin/items", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if claims["role"] != "admin" {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}

		status := r.URL.Query().Get("status")
		query := r.URL.Query().Get("q")

		log.Printf("Admin items list request: status=%s, query=%s", status, query)

		items, err := repo.List(status, query)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})))

	// PATCH /api/admin/items/{id}/status (moderate)
	mux.Handle("PATCH /api/admin/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if claims["role"] != "admin" {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/admin/items/")
		idStr = strings.TrimSuffix(idStr, "/status")
		id, _ := strconv.ParseInt(idStr, 10, 64)

		var p UpdateStatusPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		err := repo.UpdateStatus(id, p.Status)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update status")
			return
		}

		// When an item is approved (actif), create a logistics entry
		if p.Status == StatusActive {
			if _, logErr := repo.CreateLogistics(r.Context(), id); logErr != nil {
				log.Printf("Warning: could not create logistics for item %d: %v", id, logErr)
			}
		}

		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	})))

	// Deposit Points Routes
	RegisterDepositRoutes(mux, repo, authMiddleware)

	// Logistics Workflow Routes
	RegisterLogisticsRoutes(mux, repo, authMiddleware)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
