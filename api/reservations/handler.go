package reservations

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"upcycleconnect/api/items"
	"upcycleconnect/api/planning"
	"upcycleconnect/api/servicecatalog"
)

const authClaimsContextKey = "authClaims"

// Handler contient toutes les fonctions HTTP pour les réservations.
type Handler struct {
	repo *Repository
	db   *sql.DB
}

// NewHandler crée un nouveau Handler.
func NewHandler(repo *Repository, db *sql.DB) *Handler {
	return &Handler{repo: repo, db: db}
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
	if raw := strings.TrimSpace(r.URL.Query().Get("employeeId")); raw != "" {
		if id, err := strconv.ParseInt(raw, 10, 64); err == nil && id > 0 {
			filters.EmployeeID = id
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

// DeleteHandler gère DELETE /api/admin/reservations/:id
func (h *Handler) DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := parseID(r.URL.Path, "/api/admin/reservations/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking id")
		return
	}

	if err := h.repo.Delete(id); err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete booking")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
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

	callerRole := ""
	if claims, ok := r.Context().Value(authClaimsContextKey).(jwt.MapClaims); ok {
		callerRole, _ = claims["role"].(string)
	}
	if err := servicecatalog.AssertAccessible(h.db, payload.ServiceID, callerRole); err != nil {
		if errors.Is(err, servicecatalog.ErrServiceNotFound) || errors.Is(err, servicecatalog.ErrServiceNotAccessible) {
			writeError(w, http.StatusNotFound, "service not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not verify service")
		return
	}

	btype := NormalizeBookingType(payload.BookingType)
	var bookingDate time.Time

	if btype == BookingTypeBooking {
		raw := strings.TrimSpace(payload.ScheduledAt)
		if raw == "" {
			writeError(w, http.StatusBadRequest, "scheduledAt is required")
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
		if payload.EmployeeID == nil || *payload.EmployeeID <= 0 {
			writeError(w, http.StatusBadRequest, "employeeId is required")
			return
		}
		if err := planning.ValidateBookingSlot(h.db, payload.ServiceID, *payload.EmployeeID, start); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		bookingDate = start
	}

	booking, err := h.repo.CreateBooking(userID, payload, bookingDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create booking")
		return
	}

	requiresPayment := booking.Amount > 0 && booking.PaymentStatus == PaymentPending
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"booking":         booking,
		"requiresPayment": requiresPayment,
	})
}

// CheckoutHandler POST /api/bookings/:id/checkout — lance Stripe Checkout pour une réservation payante.
func (h *Handler) CheckoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	cleanPath := strings.TrimSuffix(r.URL.Path, "/checkout")
	id, err := parseID(cleanPath+"/", "/api/bookings/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking id")
		return
	}

	userID := userIDFromContext(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	booking, err := h.repo.GetBookingForCheckout(id, userID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load booking")
		return
	}
	if booking.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "this booking is free")
		return
	}
	if booking.PaymentStatus == PaymentPaid {
		writeError(w, http.StatusBadRequest, "booking already paid")
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		return
	}

	frontendBase := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if frontendBase == "" {
		frontendBase = "http://localhost:3000"
	}
	frontendBase = strings.TrimRight(frontendBase, "/")
	cfg.SuccessURL = fmt.Sprintf("%s/prestations/catalogue/%d/reserver?stripe=success&session_id={CHECKOUT_SESSION_ID}", frontendBase, booking.ServiceID)
	cfg.CancelURL = fmt.Sprintf("%s/prestations/catalogue/%d/reserver?stripe=cancel", frontendBase, booking.ServiceID)

	amountCents := int64(booking.Amount * 100)
	title := "Réservation : " + booking.ServiceName
	session, err := items.CreateStripeBookingCheckoutSessionPublic(cfg, booking.ID, userID, title, amountCents)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not create checkout session")
		return
	}

	if err := h.repo.SaveStripeSession(booking.ID, session.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save checkout session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

// ConfirmPaymentHandler GET /api/bookings/confirm-payment?session_id=
func (h *Handler) ConfirmPaymentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "session_id is required")
		return
	}

	userID := userIDFromContext(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		return
	}

	details, err := items.RetrieveStripeBookingSessionDetails(cfg.SecretKey, sessionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not verify stripe session")
		return
	}
	if details.UserID > 0 && details.UserID != userID {
		writeError(w, http.StatusForbidden, "session does not belong to current user")
		return
	}
	if strings.TrimSpace(details.PaymentStatus) != "paid" {
		writeError(w, http.StatusBadRequest, "payment not completed")
		return
	}

	bookingID := details.BookingID
	if bookingID <= 0 {
		_ = h.db.QueryRow(`
			SELECT id FROM service_bookings WHERE user_id = $1 AND stripe_session_id = $2
		`, userID, sessionID).Scan(&bookingID)
	}
	if bookingID <= 0 {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}

	booking, err := h.repo.ConfirmPayment(bookingID, sessionID, details.PaymentIntent)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not confirm payment")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ok":      true,
		"booking": booking,
	})
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
	idPart := strings.Split(trimmed, "/")[0]
	id, err := strconv.ParseInt(idPart, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid id")
	}
	return id, nil
}

func bookingIDFromRequest(r *http.Request) (int64, error) {
	if id := strings.TrimSpace(r.PathValue("id")); id != "" {
		n, err := strconv.ParseInt(id, 10, 64)
		if err != nil || n <= 0 {
			return 0, fmt.Errorf("invalid id")
		}
		return n, nil
	}
	return parseID(r.URL.Path, "/api/bookings/")
}

// userIDFromContext extrait l'ID utilisateur depuis les claims JWT du contexte.
func userIDFromContext(ctx context.Context) int64 {
	claims, ok := ctx.Value("authClaims").(jwt.MapClaims)
	if !ok || claims == nil {
		return 0
	}
	switch v := claims["userId"].(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	case json.Number:
		n, _ := v.Int64()
		return n
	}
	return 0
}
