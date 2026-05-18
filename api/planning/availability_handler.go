package planning

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"upcycleconnect/api/servicecatalog"
)

// ServiceAvailabilityHandler GET /api/services/:id/availability?scheduledAt=RFC3339
func ServiceAvailabilityHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/services/")
		path = strings.TrimSuffix(path, "/availability")
		path = strings.Trim(path, "/")
		serviceID, err := strconv.ParseInt(path, 10, 64)
		if err != nil || serviceID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid service id")
			return
		}
		if err := servicecatalog.AssertAccessible(db, serviceID, callerRoleFromRequest(r)); err != nil {
			if errors.Is(err, servicecatalog.ErrServiceNotFound) || errors.Is(err, servicecatalog.ErrServiceNotAccessible) {
				writeError(w, http.StatusNotFound, "service not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not load service")
			return
		}

		raw := strings.TrimSpace(r.URL.Query().Get("scheduledAt"))
		if raw == "" {
			writeError(w, http.StatusBadRequest, "scheduledAt is required (RFC3339)")
			return
		}
		start, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid scheduledAt format")
			return
		}
		if start.Before(time.Now().Add(-5 * time.Minute)) {
			writeError(w, http.StatusBadRequest, "la date doit être dans le futur")
			return
		}

		var svcType string
		var duration int
		var status string
		err = db.QueryRow(`SELECT type, duration_minutes, status FROM services WHERE id = $1`, serviceID).
			Scan(&svcType, &duration, &status)
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "service not found")
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load service")
			return
		}
		if status != "actif" {
			writeError(w, http.StatusBadRequest, "prestation non disponible")
			return
		}
		if duration <= 0 {
			duration = 60
		}
		end := start.Add(time.Duration(duration) * time.Minute)

		providers, err := ListServiceProviders(db, serviceID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list providers")
			return
		}
		available, err := ListAvailableProviders(db, serviceID, start, end)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not compute availability")
			return
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"serviceId":      serviceID,
			"scheduledAt":    start.UTC().Format(time.RFC3339),
			"endAt":          end.UTC().Format(time.RFC3339),
			"durationMinutes": duration,
			"bookingMode":    svcType,
			"providers":      providers,
			"available":      available,
		})
	}
}
