package reservations

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// Handler contient toutes les fonctions HTTP pour les réservations.
type Handler struct {
	repo *Repository
}

// NewHandler crée un nouveau Handler.
func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// ListHandler gère GET /api/admin/reservations
func (h *Handler) ListHandler(w http.ResponseWriter, r *http.Request) {
	filters := ListFilters{
		Status:        NormalizeStatus(r.URL.Query().Get("status")),
		PaymentStatus: NormalizePaymentStatus(r.URL.Query().Get("paymentStatus")),
	}
	if raw := strings.TrimSpace(r.URL.Query().Get("serviceId")); raw != "" {
		if id, err := strconv.ParseInt(raw, 10, 64); err == nil && id > 0 {
			filters.ServiceID = id
		}
	}

	bookings, err := h.repo.List(filters)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list bookings")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": bookings, "total": len(bookings)})
}

// ByIDHandler gère GET /api/admin/reservations/:id
func (h *Handler) ByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := parseID(r.URL.Path, "/api/admin/reservations/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking id")
		return
	}

	booking, err := h.repo.GetByID(id)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not get booking")
		return
	}
	writeJSON(w, http.StatusOK, booking)
}

// StatusHandler gère PATCH /api/admin/reservations/:id/status
func (h *Handler) StatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cleanPath := strings.TrimSuffix(r.URL.Path, "/status")
	id, err := parseID(cleanPath+"/", "/api/admin/reservations/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking id")
		return
	}

	var payload UpdateStatusPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if payload.Status != "" && NormalizeStatus(payload.Status) == "" {
		writeError(w, http.StatusBadRequest, "invalid status (pending, confirmed, cancelled, completed)")
		return
	}
	if payload.PaymentStatus != "" && NormalizePaymentStatus(payload.PaymentStatus) == "" {
		writeError(w, http.StatusBadRequest, "invalid paymentStatus (paid, pending, refunded)")
		return
	}
	if payload.Status == "" && payload.PaymentStatus == "" {
		writeError(w, http.StatusBadRequest, "status or paymentStatus is required")
		return
	}

	booking, err := h.repo.UpdateStatus(id, payload)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update booking status")
		return
	}
	writeJSON(w, http.StatusOK, booking)
}

// AssignEmployeeHandler gère PATCH /api/admin/reservations/:id/assign
func (h *Handler) AssignEmployeeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cleanPath := strings.TrimSuffix(r.URL.Path, "/assign")
	id, err := parseID(cleanPath+"/", "/api/admin/reservations/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking id")
		return
	}

	var payload struct {
		EmployeeID int64 `json:"employeeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if payload.EmployeeID <= 0 {
		writeError(w, http.StatusBadRequest, "employeeId is required")
		return
	}

	booking, err := h.repo.AssignEmployee(id, payload.EmployeeID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not assign employee")
		return
	}
	writeJSON(w, http.StatusOK, booking)
}

// CreateHandler gère POST /api/bookings — crée une demande/réservation (utilisateur connecté)
func (h *Handler) CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := userIDFromContext(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var payload CreateBookingPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if payload.ServiceID <= 0 {
		writeError(w, http.StatusBadRequest, "serviceId is required")
		return
	}

	booking, err := h.repo.CreateBooking(userID, payload)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create booking")
		return
	}
	writeJSON(w, http.StatusCreated, booking)
}

// ListMineHandler gère GET /api/bookings/mine — historique utilisateur connecté
func (h *Handler) ListMineHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	userID := userIDFromContext(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	bookings, err := h.repo.List(ListFilters{UserID: userID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list bookings")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": bookings, "total": len(bookings)})
}

// --- Helpers locaux ---

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

// userIDFromContext extrait l'ID utilisateur depuis les claims JWT du contexte.
type contextKey string

const authClaimsContextKey contextKey = "authClaims"

func userIDFromContext(ctx context.Context) int64 {
	claims, _ := ctx.Value("authClaims").(map[string]interface{})
	if claims == nil {
		return 0
	}
	val, _ := claims["userId"].(float64)
	return int64(val)
}
