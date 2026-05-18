package pricing

import (
	"database/sql"
	"log"
	"net/http"
)

// RegisterRoutes enregistre toutes les routes du module pricing dans le mux.
func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	h := NewHandler(repo)

	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Pricing schema initialization error: %v", err)
	}
	log.Println("✓ Pricing schema initialized")

	// GET  /api/admin/pricing — liste des règles
	// POST /api/admin/pricing — créer une règle
	mux.Handle("/api/admin/pricing", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			h.ListHandler(w, r)
		case http.MethodPost:
			h.CreateHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	// PUT /api/admin/pricing/:id — modifier une règle
	mux.Handle("/api/admin/pricing/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			h.UpdateHandler(w, r)
		case http.MethodDelete:
			h.DeleteHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))
}
