package reservations

import (
	"database/sql"
	"log"
	"net/http"
	"strings"
)

// RegisterRoutes enregistre toutes les routes du module reservations dans le mux.
func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	h := NewHandler(repo, db)

	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Reservations schema initialization error: %v", err)
	}
	log.Println("✓ Reservations schema initialized")

	// ── Routes Admin (auth requise) ───────────────────────────────────────────

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
	// PATCH /api/admin/reservations/:id/assign
	mux.Handle("/api/admin/reservations/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/status") {
			h.StatusHandler(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/assign") {
			h.AssignEmployeeHandler(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			h.DeleteHandler(w, r)
			return
		}
		h.ByIDHandler(w, r)
	})))

	// ── Routes Utilisateur (auth requise, tous rôles) ─────────────────────────

	// POST /api/bookings — créer une demande/réservation
	mux.Handle("/api/bookings", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.CreateHandler(w, r)
	})))

	// GET /api/bookings/mine — mes réservations
	mux.Handle("/api/bookings/mine", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.ListMineHandler(w, r)
	})))

	// GET /api/bookings/confirm-payment?session_id=
	mux.Handle("/api/bookings/confirm-payment", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.ConfirmPaymentHandler(w, r)
	})))

	// POST /api/bookings/{id}/cancel — annulation (évite conflit mux avec /api/bookings/mine)
	mux.Handle("POST /api/bookings/{id}/cancel", authMiddleware(http.HandlerFunc(h.CancelHandler)))

	// POST /api/bookings/:id/checkout
	mux.Handle("/api/bookings/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/checkout") && r.Method == http.MethodPost {
			h.CheckoutHandler(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/cancel") && r.Method == http.MethodPost {
			h.CancelHandler(w, r)
			return
		}
		writeError(w, http.StatusNotFound, "not found")
	})))
}
