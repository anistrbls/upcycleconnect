package reservations

import (
	"database/sql"
	"log"
	"net/http"
	"strings"
)

// RegisterRoutes enregistre toutes les routes du module reservations dans le mux.
// authMiddleware est reçu en paramètre pour éviter toute dépendance circulaire.
func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	h := NewHandler(repo)

	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Reservations schema initialization error: %v", err)
	}
	log.Println("✓ Reservations schema initialized")

	// GET /api/admin/reservations — liste des réservations
	mux.Handle("/api/admin/reservations", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		h.ListHandler(w, r)
	})))

	// GET /api/admin/reservations/:id
	// PATCH /api/admin/reservations/:id/status
	mux.Handle("/api/admin/reservations/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/status") {
			h.StatusHandler(w, r)
			return
		}
		h.ByIDHandler(w, r)
	})))
}
