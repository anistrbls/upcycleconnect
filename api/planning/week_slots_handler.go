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

// ServiceWeekSlotsHandler GET /api/services/:id/week-slots?weekStart=YYYY-MM-DD
func ServiceWeekSlotsHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/services/")
		path = strings.TrimSuffix(path, "/week-slots")
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

		raw := strings.TrimSpace(r.URL.Query().Get("weekStart"))
		if raw == "" {
			writeError(w, http.StatusBadRequest, "weekStart is required (YYYY-MM-DD, lundi de la semaine)")
			return
		}
		weekStart, err := time.ParseInLocation("2006-01-02", raw, businessLocation())
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid weekStart format")
			return
		}

		slots, duration, providerCount, err := ListWeekSlots(db, serviceID, weekStart)
		if err != nil {
			if err.Error() == "service not found" {
				writeError(w, http.StatusNotFound, err.Error())
				return
			}
			if err.Error() == "prestation non disponible" {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeError(w, http.StatusInternalServerError, "could not compute week slots")
			return
		}

		weekEnd := weekStart.AddDate(0, 0, 6)
		hint := ""
		if providerCount == 0 {
			hint = "Aucun salarié n'est assigné à cette prestation. Contactez l'équipe ou modifiez la prestation en administration."
		} else if len(slots) == 0 {
			hint = "Aucun créneau libre sur cette semaine. Utilisez les flèches pour consulter les semaines suivantes."
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"serviceId":              serviceID,
			"weekStart":              weekStart.Format("2006-01-02"),
			"weekEnd":                weekEnd.Format("2006-01-02"),
			"durationMinutes":        duration,
			"assignedProviderCount":  providerCount,
			"slots":                  slots,
			"hint":                   hint,
		})
	}
}
