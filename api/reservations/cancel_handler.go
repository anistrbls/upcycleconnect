package reservations

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"upcycleconnect/api/items"
)

func bookingAppointmentEnd(c CancelContext) time.Time {
	mins := c.DurationMinutes
	if mins <= 0 {
		mins = 60
	}
	return c.BookingDate.Add(time.Duration(mins) * time.Minute)
}

// CancelHandler POST /api/bookings/{id}/cancel — annulation (même logique que les événements).
func (h *Handler) CancelHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := bookingIDFromRequest(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid booking id")
		return
	}

	userID := userIDFromContext(r.Context())
	if userID == 0 {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	ctx, err := h.repo.GetCancelContext(id, userID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load booking")
		return
	}

	status := strings.ToLower(strings.TrimSpace(ctx.Status))
	if status == BookingCancelled {
		writeError(w, http.StatusBadRequest, "booking is already cancelled")
		return
	}
	if status == BookingCompleted {
		writeError(w, http.StatusBadRequest, "cannot cancel a completed booking")
		return
	}

	refundStatus := strings.TrimSpace(ctx.RefundStatus)
	appointmentPassed := time.Now().After(bookingAppointmentEnd(ctx))
	paymentStatus := strings.TrimSpace(ctx.PaymentStatus)

	// Demande de remboursement déjà enregistrée (idempotent)
	if paymentStatus == PaymentPaid && appointmentPassed && refundStatus == "requested" {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"cancelled":        true,
			"refundRequested":  true,
			"alreadySubmitted": true,
		})
		return
	}

	// Demande simple (sans créneau payant) ou gratuit
	if ctx.BookingType != BookingTypeBooking || ctx.Amount <= 0 || paymentStatus != PaymentPaid {
		if paymentStatus == PaymentPending {
			_, err = h.db.Exec(`
				UPDATE service_bookings
				SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', payment_status = 'pending'
				WHERE id = $1 AND user_id = $2
			`, id, userID)
		} else {
			_, err = h.db.Exec(`
				UPDATE service_bookings
				SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user'
				WHERE id = $1 AND user_id = $2
			`, id, userID)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not cancel booking")
			return
		}
		h.notifyCancellationToProviderAndAdmins(r, id)
		writeJSON(w, http.StatusOK, map[string]interface{}{"cancelled": true, "refunded": false})
		return
	}

	// Prestation passée + payée → demande de remboursement
	if appointmentPassed {
		var body struct {
			Reason string `json:"reason"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		reason := strings.TrimSpace(body.Reason)
		if reason == "" {
			writeError(w, http.StatusBadRequest, "le motif du remboursement est obligatoire")
			return
		}
		if len(reason) > 4000 {
			reason = reason[:4000]
		}
		res, err := h.db.Exec(`
			UPDATE service_bookings SET
				status = 'cancelled',
				cancelled_at = NOW(),
				cancelled_by = 'user',
				refund_status = 'requested',
				refund_request_reason = $1
			WHERE id = $2 AND user_id = $3 AND status IN ('pending', 'confirmed')
		`, reason, id, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "database error")
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			var rs string
			_ = h.db.QueryRow(`SELECT COALESCE(refund_status, 'none') FROM service_bookings WHERE id = $1`, id).Scan(&rs)
			if strings.TrimSpace(rs) == "requested" {
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"cancelled":        true,
					"refundRequested":  true,
					"alreadySubmitted": true,
				})
				return
			}
			writeError(w, http.StatusBadRequest, "booking is already cancelled")
			return
		}
		h.notifyCancellationToProviderAndAdmins(r, id)
		writeJSON(w, http.StatusOK, map[string]interface{}{"cancelled": true, "refundRequested": true})
		return
	}

	if paymentStatus != PaymentPaid {
		writeError(w, http.StatusBadRequest, "annulation impossible pour ce statut de paiement")
		return
	}

	nowUTC := time.Now().UTC()
	diff := ctx.BookingDate.Sub(nowUTC)
	if diff.Hours() < 24 {
		_, _ = h.db.Exec(`
			UPDATE service_bookings
			SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'non_refundable'
			WHERE id = $1 AND user_id = $2
		`, id, userID)
		h.notifyCancellationToProviderAndAdmins(r, id)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"cancelled": true,
			"refunded":  false,
			"reason":    "less than 24h before appointment",
		})
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		_, _ = h.db.Exec(`
			UPDATE service_bookings
			SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'failed', refund_error = $1
			WHERE id = $2 AND user_id = $3
		`, err.Error(), id, userID)
		writeError(w, http.StatusInternalServerError, "stripe not configured, cancellation saved but refund failed")
		return
	}

	paymentIntentID := strings.TrimSpace(ctx.StripePaymentIntentID)
	if paymentIntentID == "" && strings.TrimSpace(ctx.StripeSessionID) != "" {
		paymentIntentID, _ = items.GetStripePaymentIntentFromSessionPublic(cfg, ctx.StripeSessionID)
	}

	var refundID string
	var recordEUR float64
	var refundErr error
	if paymentIntentID != "" {
		refundOpts, rec := items.NewBookingRefundStripeParams("user-cancel", id, userID, paymentIntentID, ctx.Amount, nil)
		recordEUR = rec
		refundID, refundErr = items.RefundStripePaymentIntentPublic(r.Context(), cfg, paymentIntentID, refundOpts)
	} else {
		refundErr = sql.ErrNoRows
	}

	if refundErr != nil {
		msg := refundErr.Error()
		if refundErr == sql.ErrNoRows {
			msg = "missing stripe payment intent"
		}
		_, _ = h.db.Exec(`
			UPDATE service_bookings
			SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = 'user', refund_status = 'failed', refund_error = $1
			WHERE id = $2 AND user_id = $3
		`, msg, id, userID)
		writeError(w, http.StatusInternalServerError, "refund failed: "+msg)
		return
	}

	_, _ = h.db.Exec(`
		UPDATE service_bookings
		SET status = 'cancelled',
		    cancelled_at = NOW(),
		    cancelled_by = 'user',
		    refund_status = 'refunded',
		    stripe_refund_id = $1,
		    refund_amount = $2,
		    payment_status = 'refunded'
		WHERE id = $3 AND user_id = $4
	`, refundID, recordEUR, id, userID)

	h.notifyCancellationToProviderAndAdmins(r, id)
	h.repo.createFinanceNotification(
		r.Context(),
		userID,
		"Remboursement effectué",
		fmt.Sprintf("Le remboursement de votre réservation a été effectué (%.2f EUR).", recordEUR),
		"finance_refund_issued",
	)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"cancelled":    true,
		"refunded":     true,
		"refundAmount": recordEUR,
	})
}

func (h *Handler) notifyCancellationToProviderAndAdmins(r *http.Request, id int64) {
	booking, err := h.repo.GetByID(id)
	if err != nil {
		return
	}
	ctx := r.Context()
	dateStr := booking.BookingDate.Format("02/01/2006 à 15h04")
	msg := fmt.Sprintf("La réservation de %s pour \"%s\" le %s a été annulée.", booking.UserName, booking.ServiceName, dateStr)

	if booking.EmployeeID != nil && *booking.EmployeeID > 0 {
		_ = items.CreateNotification(ctx, h.db, *booking.EmployeeID, "Réservation annulée", msg, "prestation_booking_cancelled")
	}

	if admins, errAdmins := h.repo.GetAdminIDs(ctx); errAdmins == nil {
		for _, adminID := range admins {
			if booking.EmployeeID == nil || adminID != *booking.EmployeeID {
				_ = items.CreateNotification(ctx, h.db, adminID, "Réservation annulée", msg, "prestation_booking_cancelled")
			}
		}
	}
}
