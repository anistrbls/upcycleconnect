package items

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func RegisterProfessionalRoutes(mux *http.ServeMux, repo *Repository, authMiddleware func(http.Handler) http.Handler) {
	professionalOnly := func(next http.HandlerFunc) http.Handler {
		return authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := r.Context().Value("authClaims").(jwt.MapClaims)
			if claims["role"] != "professionnel" {
				writeError(w, http.StatusForbidden, "professionnel only")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}

	getProfessionalUser := func(r *http.Request) (int64, string, string, error) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)
		var userID int64
		var displayName string
		var companyName string
		err := repo.db.QueryRow(
			"SELECT id, TRIM(COALESCE(firstname, '') || ' ' || COALESCE(lastname, '')), TRIM(COALESCE(company_name, '')) FROM users WHERE email = $1",
			email,
		).Scan(&userID, &displayName, &companyName)
		return userID, displayName, companyName, err
	}

	mux.Handle("GET /api/pro/items", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		items, err := repo.ListProfessionalAvailableItems(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list available items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	}))

	mux.Handle("GET /api/pro/items/{item_id}", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		it, err := repo.GetProfessionalItemDetail(r.Context(), itemID, userID)
		if err != nil {
			writeError(w, http.StatusNotFound, "item not available")
			return
		}
		writeJSON(w, http.StatusOK, it)
	}))

	mux.Handle("POST /api/pro/items/{item_id}/reserve", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		userID, displayName, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		payload := ReservePayload{ReservedByName: displayName, ReservedByUserID: &userID}
		pickupCode, err := repo.ReserveItem(r.Context(), itemID, payload)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, map[string]any{
			"pickup_code": pickupCode,
			"logistics":   l,
		})
	}))

	mux.Handle("POST /api/pro/items/{item_id}/checkout-session", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}

		checkoutData, err := repo.GetStripeCheckoutReservation(r.Context(), itemID, userID)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		feeLine := int64(0)
		if checkoutData.CommissionMode == SaleCommissionModeAdded && checkoutData.PlatformFeeCents > 0 {
			feeLine = checkoutData.PlatformFeeCents
		}
		session, err := createStripeCheckoutSession(
			cfg,
			checkoutData.ItemID,
			userID,
			checkoutData.ItemTitle,
			checkoutData.BaseCents,
			feeLine,
			checkoutData.Currency,
		)
		if err != nil {
			writeError(w, http.StatusBadGateway, "could not create checkout session")
			return
		}

		paymentIntentID := strings.TrimSpace(session.PaymentIntent)
		if err := repo.SaveStripeCheckoutSession(r.Context(), itemID, userID, session.ID, paymentIntentID); err != nil {
			writeError(w, http.StatusConflict, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"checkout_url": session.URL,
			"session_id":   session.ID,
		})
	}))

	mux.Handle("POST /api/pro/stripe/confirm-session", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		var payload struct {
			SessionID string `json:"session_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if strings.TrimSpace(payload.SessionID) == "" {
			writeError(w, http.StatusBadRequest, "session_id is required")
			return
		}

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}

		session, err := fetchStripeCheckoutSession(cfg, payload.SessionID)
		if err != nil {
			writeError(w, http.StatusBadGateway, "could not fetch checkout session")
			return
		}

		itemID, err := strconv.ParseInt(strings.TrimSpace(session.Metadata["item_id"]), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid stripe metadata")
			return
		}
		sessionUserID, err := strconv.ParseInt(strings.TrimSpace(session.Metadata["user_id"]), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid stripe metadata")
			return
		}
		if sessionUserID != userID {
			writeError(w, http.StatusForbidden, "reservation does not belong to this user")
			return
		}

		isPaid := strings.EqualFold(strings.TrimSpace(session.PaymentStatus), "paid") || strings.EqualFold(strings.TrimSpace(session.Status), "complete")
		if !isPaid {
			writeJSON(w, http.StatusAccepted, map[string]any{
				"confirmed":      false,
				"session_status": session.Status,
				"payment_status": session.PaymentStatus,
			})
			return
		}

		_, err = repo.ValidateStripePaymentByProfessional(r.Context(), itemID, userID, strings.TrimSpace(session.PaymentIntent), strings.TrimSpace(session.ID))
		if err != nil {
			if err == sql.ErrNoRows || strings.Contains(err.Error(), `cannot validate payment from status "reserved"`) || strings.Contains(err.Error(), `cannot validate payment from status "picked_up"`) {
				writeJSON(w, http.StatusOK, map[string]any{"confirmed": true, "already_confirmed": true})
				return
			}
			writeError(w, http.StatusConflict, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"confirmed": true})
	}))

	mux.Handle("POST /api/pro/items/{item_id}/pay", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusGone, "endpoint removed: use checkout-session")
	}))

	mux.Handle("GET /api/pro/my-reservations", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		userID, displayName, companyName, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		items, err := repo.GetProfessionalReservations(r.Context(), userID, displayName, companyName)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list reservations")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	}))

	mux.Handle("POST /api/pro/items/{item_id}/rate-seller", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		userID, displayName, companyName, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		var body struct {
			Stars int `json:"stars"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if err := repo.UpsertProfessionalSellerRating(r.Context(), itemID, userID, body.Stars, displayName, companyName); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "cannot rate: reservation not eligible")
				return
			}
			if strings.Contains(err.Error(), "cannot rate own listing") {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			if strings.Contains(err.Error(), "stars must be") {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeError(w, http.StatusInternalServerError, "could not save rating")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}))

	mux.Handle("GET /api/pro/watchlist", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		ids, err := repo.ListProfessionalWatchlistItemIDs(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load watchlist")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"item_ids": ids})
	}))

	mux.Handle("POST /api/pro/items/{item_id}/watchlist", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		if err := repo.AddProfessionalWatchlistItem(r.Context(), userID, itemID); err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "item not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not add watchlist item")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}))

	mux.Handle("DELETE /api/pro/items/{item_id}/watchlist", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}
		if err := repo.RemoveProfessionalWatchlistItem(r.Context(), userID, itemID); err != nil {
			writeError(w, http.StatusInternalServerError, "could not remove watchlist item")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}))

	mux.HandleFunc("POST /api/webhooks/stripe", func(w http.ResponseWriter, r *http.Request) {
		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}
		if strings.TrimSpace(cfg.WebhookSecret) == "" {
			writeError(w, http.StatusServiceUnavailable, "stripe webhook secret is not configured")
			return
		}

		payload, err := io.ReadAll(r.Body)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		if err := verifyStripeSignature(payload, r.Header.Get("Stripe-Signature"), cfg.WebhookSecret); err != nil {
			writeError(w, http.StatusBadRequest, "invalid stripe signature")
			return
		}

		var event stripeWebhookEvent
		err = json.Unmarshal(payload, &event)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid stripe payload")
			return
		}
		if strings.TrimSpace(event.ID) == "" || strings.TrimSpace(event.Type) == "" {
			writeError(w, http.StatusBadRequest, "invalid stripe event")
			return
		}

		alreadyProcessed, err := repo.IsStripeWebhookProcessed(r.Context(), event.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not verify webhook event")
			return
		}
		if alreadyProcessed {
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "duplicate": true})
			return
		}

		handled, processErr := handleStripeEvent(r, repo, event)
		if processErr != nil {
			writeError(w, http.StatusBadRequest, processErr.Error())
			return
		}
		if handled {
			if err := repo.MarkStripeWebhookProcessed(r.Context(), event.ID, event.Type); err != nil {
				writeError(w, http.StatusInternalServerError, "could not mark webhook event")
				return
			}
		}

		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "handled": handled})
	})
}

func handleStripeEvent(r *http.Request, repo *Repository, event stripeWebhookEvent) (bool, error) {
	ctx := r.Context()

	switch event.Type {
	case "refund.created", "refund.updated":
		var obj stripeWebhookRefund
		if err := json.Unmarshal(event.Data.Object, &obj); err != nil {
			return false, err
		}
		pi := ParseStripeWebhookPaymentIntentField(obj.PaymentIntent)
		if pi == "" {
			return true, nil
		}
		if err := repo.SyncRefundFromStripeWebhook(ctx, pi, obj.ID, obj.Amount, obj.Status); err != nil {
			return false, err
		}
		return true, nil
	case "charge.refunded":
		var ch stripeWebhookCharge
		if err := json.Unmarshal(event.Data.Object, &ch); err != nil {
			return false, err
		}
		pi := ParseStripeWebhookPaymentIntentField(ch.PaymentIntent)
		if pi == "" {
			return true, nil
		}
		if err := repo.SyncRefundFromStripeWebhook(ctx, pi, "", ch.AmountRefunded, "succeeded"); err != nil {
			return false, err
		}
		return true, nil
	case "checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_failed":
		var session stripeWebhookCheckoutSession
		if err := json.Unmarshal(event.Data.Object, &session); err != nil {
			return false, err
		}

		itemIDStr := strings.TrimSpace(session.Metadata["item_id"])
		userIDStr := strings.TrimSpace(session.Metadata["user_id"])
		if itemIDStr == "" || userIDStr == "" {
			return false, nil
		}

		itemID, err := strconv.ParseInt(itemIDStr, 10, 64)
		if err != nil {
			return false, err
		}
		userID, err := strconv.ParseInt(userIDStr, 10, 64)
		if err != nil {
			return false, err
		}

		paymentIntentID := strings.TrimSpace(session.PaymentIntent)

		switch event.Type {
		case "checkout.session.completed":
			if _, err := repo.ValidateStripePaymentByProfessional(ctx, itemID, userID, paymentIntentID, session.ID); err != nil {
				if err == sql.ErrNoRows {
					return false, nil
				}
				return false, err
			}
			return true, nil
		case "checkout.session.expired", "checkout.session.async_payment_failed":
			reason := "Paiement Stripe echoue ou session expiree"
			if err := repo.FailStripePaymentByProfessional(ctx, itemID, userID, reason, paymentIntentID, session.ID); err != nil {
				if strings.Contains(err.Error(), "cannot fail payment") {
					return false, nil
				}
				return false, err
			}
			return true, nil
		default:
			return false, nil
		}
	default:
		return false, nil
	}
}
