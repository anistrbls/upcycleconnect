package planning

import (
	"database/sql"
	"net/http"
)

func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	h := NewHandler(repo)

	// Créneaux de service
	mux.Handle("/api/admin/service-slots", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			h.ListSlotsHandler(w, r)
		case http.MethodPost:
			h.CreateSlotHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	mux.Handle("/api/admin/service-slots/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			h.UpdateSlotHandler(w, r)
		case http.MethodDelete:
			h.DeleteSlotHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	// Indisponibilités salariés
	mux.Handle("/api/admin/employee-unavailabilities", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			h.ListUnavailabilitiesHandler(w, r)
		case http.MethodPost:
			h.CreateUnavailabilityHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	mux.Handle("/api/admin/employee-unavailabilities/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			h.UpdateUnavailabilityHandler(w, r)
		case http.MethodDelete:
			h.DeleteUnavailabilityHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	// Règles de travail (horaires standards)
	mux.Handle("/api/admin/employee-working-rules", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			h.GetWorkingRulesHandler(w, r)
		case http.MethodPost:
			h.UpdateWorkingRulesHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))
}
