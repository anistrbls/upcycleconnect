package planning

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) ListSlotsHandler(w http.ResponseWriter, r *http.Request) {
	employeeID, _ := strconv.ParseInt(r.URL.Query().Get("employeeId"), 10, 64)
	serviceID, _ := strconv.ParseInt(r.URL.Query().Get("serviceId"), 10, 64)
	
	var start, end time.Time
	if s := r.URL.Query().Get("start"); s != "" {
		start, _ = time.Parse(time.RFC3339, s)
	}
	if e := r.URL.Query().Get("end"); e != "" {
		end, _ = time.Parse(time.RFC3339, e)
	}

	slots, err := h.repo.ListSlots(employeeID, serviceID, start, end)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list slots")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": slots})
}

func (h *Handler) CreateSlotHandler(w http.ResponseWriter, r *http.Request) {
	var p CreateSlotPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if p.EndTime.Before(p.StartTime) {
		writeError(w, http.StatusBadRequest, "end time must be after start time")
		return
	}

	slot, err := h.repo.CreateSlot(p)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, slot)
}

func (h *Handler) UpdateSlotHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path, "/api/admin/service-slots/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var p CreateSlotPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := h.repo.UpdateSlot(id, p); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update slot")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

func (h *Handler) ListUnavailabilitiesHandler(w http.ResponseWriter, r *http.Request) {
	employeeID, _ := strconv.ParseInt(r.URL.Query().Get("employeeId"), 10, 64)
	list, err := h.repo.ListUnavailabilities(employeeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list unavailabilities")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": list})
}

func (h *Handler) CreateUnavailabilityHandler(w http.ResponseWriter, r *http.Request) {
	var p CreateUnavailabilityPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if p.EndTime.Before(p.StartTime) {
		writeError(w, http.StatusBadRequest, "end time must be after start time")
		return
	}

	item, err := h.repo.CreateUnavailability(p)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create unavailability")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *Handler) UpdateUnavailabilityHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path, "/api/admin/employee-unavailabilities/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var p CreateUnavailabilityPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	if err := h.repo.UpdateUnavailability(id, p); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update unavailability")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

func (h *Handler) DeleteSlotHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path, "/api/admin/service-slots/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.repo.DeleteSlot(id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete slot")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (h *Handler) DeleteUnavailabilityHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path, "/api/admin/employee-unavailabilities/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.repo.DeleteUnavailability(id); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete unavailability")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (h *Handler) GetWorkingRulesHandler(w http.ResponseWriter, r *http.Request) {
	employeeID, _ := strconv.ParseInt(r.URL.Query().Get("employeeId"), 10, 64)
	if employeeID == 0 {
		writeError(w, http.StatusBadRequest, "missing employeeId")
		return
	}
	wr, err := h.repo.GetWorkingRules(employeeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not get working rules")
		return
	}
	writeJSON(w, http.StatusOK, wr)
}

func (h *Handler) UpdateWorkingRulesHandler(w http.ResponseWriter, r *http.Request) {
	var wr WorkingRules
	if err := json.NewDecoder(r.Body).Decode(&wr); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if wr.EmployeeID == 0 {
		writeError(w, http.StatusBadRequest, "missing employeeId")
		return
	}
	if err := h.repo.UpdateWorkingRules(wr); err != nil {
		fmt.Printf("[Planning] UpdateWorkingRules error: %v\n", err)
		writeError(w, http.StatusInternalServerError, "could not update working rules: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// Helpers
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func parseID(path, prefix string) (int64, error) {
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
