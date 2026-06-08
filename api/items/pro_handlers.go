package items

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type downgradePublishedProject struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	ModerationStatus string `json:"moderationStatus"`
	UpdatedAt string `json:"updatedAt"`
}

type downgradePublishedBlocker struct {
	Code                  string                     `json:"code"`
	Limit                 int                        `json:"limit"`
	CurrentPublishedCount int                        `json:"currentPublishedCount"`
	Excess                int                        `json:"excess"`
	Projects              []downgradePublishedProject `json:"projects"`
}

func getDowngradePublishedBlocker(repo *Repository, userID int64, limit int) (*downgradePublishedBlocker, error) {
	var count int
	if err := repo.db.QueryRow(`
		SELECT COUNT(*)
		FROM upcycling_projects
		WHERE pro_user_id = $1
		  AND (status = 'publie' OR moderation_status = 'pending')
	`, userID).Scan(&count); err != nil {
		return nil, err
	}
	if count <= limit {
		return nil, nil
	}

	rows, err := repo.db.Query(`
		SELECT id, COALESCE(title, ''), COALESCE(status, ''), COALESCE(moderation_status, ''), COALESCE(updated_at::text, '')
		FROM upcycling_projects
		WHERE pro_user_id = $1
		  AND (status = 'publie' OR moderation_status = 'pending')
		ORDER BY updated_at DESC, created_at DESC, id DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := make([]downgradePublishedProject, 0)
	for rows.Next() {
		var p downgradePublishedProject
		if err := rows.Scan(&p.ID, &p.Title, &p.Status, &p.ModerationStatus, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &downgradePublishedBlocker{
		Code:                  "published_projects_limit",
		Limit:                 limit,
		CurrentPublishedCount: count,
		Excess:                count - limit,
		Projects:              projects,
	}, nil
}

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

	mux.Handle("POST /api/pro/subscribe-session", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		var payload struct {
			Plan string `json:"plan"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		plan := strings.TrimSpace(payload.Plan)
		if plan != "pro_essentiel" && plan != "premium_atelier" {
			writeError(w, http.StatusBadRequest, "invalid plan")
			return
		}

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}

		amountCents := int64(1500) // pro_essentiel
		planName := "Abonnement Pro Essentiel"
		if plan == "premium_atelier" {
			amountCents = int64(3000) // premium_atelier
			planName = "Abonnement Premium Atelier"
		}

		userIDStr := strconv.FormatInt(userID, 10)

		form := url.Values{}
		form.Set("mode", "subscription")
		form.Set("success_url", "http://localhost:3000/finances/abonnement?stripe=success&session_id={CHECKOUT_SESSION_ID}")
		form.Set("cancel_url", "http://localhost:3000/finances/abonnement?stripe=cancel")
		form.Set("metadata[type]", "subscription")
		form.Set("metadata[plan]", plan)
		form.Set("metadata[user_id]", userIDStr)
		form.Set("line_items[0][quantity]", "1")
		form.Set("line_items[0][price_data][currency]", "eur")
		form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(amountCents, 10))
		form.Set("line_items[0][price_data][product_data][name]", planName)
		form.Set("line_items[0][price_data][recurring][interval]", "month")

		var stripeCustID string
		_ = repo.db.QueryRow(`SELECT stripe_customer_id FROM users WHERE id = $1`, userID).Scan(&stripeCustID)
		if strings.TrimSpace(stripeCustID) != "" {
			form.Set("customer", strings.TrimSpace(stripeCustID))
		}

		req, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		req.Header.Set("Authorization", "Bearer "+cfg.SecretKey)
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		if resp.StatusCode >= 400 {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("stripe subscription session creation failed: %s", strings.TrimSpace(string(body))))
			return
		}

		var session stripeCheckoutSession
		if err := json.Unmarshal(body, &session); err != nil {
			writeError(w, http.StatusInternalServerError, "invalid stripe response")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"checkout_url": session.URL,
			"session_id":   session.ID,
		})
	}))

	mux.Handle("POST /api/pro/stripe/confirm-subscription", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
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

		subType := strings.TrimSpace(session.Metadata["type"])
		plan := strings.TrimSpace(session.Metadata["plan"])
		sessionUserID, err := strconv.ParseInt(strings.TrimSpace(session.Metadata["user_id"]), 10, 64)
		if err != nil || sessionUserID != userID || subType != "subscription" {
			writeError(w, http.StatusForbidden, "invalid stripe metadata or session ownership")
			return
		}

		isPaid := strings.EqualFold(strings.TrimSpace(session.PaymentStatus), "paid") || strings.EqualFold(strings.TrimSpace(session.Status), "complete")
		if !isPaid {
			writeJSON(w, http.StatusOK, map[string]any{
				"confirmed":      false,
				"session_status": session.Status,
				"payment_status": session.PaymentStatus,
			})
			return
		}

		_, err = repo.db.Exec(`
			UPDATE users 
			SET subscription_type = $1, 
			    subscription_start = NOW(), 
			    stripe_customer_id = $3, 
			    stripe_subscription_id = $4 
			WHERE id = $2`, 
			plan, userID, strings.TrimSpace(session.Customer), strings.TrimSpace(session.Subscription))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update subscription")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"confirmed": true, "plan": plan})
	}))

	mux.Handle("POST /api/pro/unsubscribe", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		blocker, err := getDowngradePublishedBlocker(repo, userID, 3)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not validate downgrade constraints")
			return
		}
		if blocker != nil {
			writeJSON(w, http.StatusConflict, map[string]any{
				"error": "Downgrade blocked: archive some published projects first.",
				"code":  "SUBSCRIPTION_DOWNGRADE_BLOCKED",
				"blockers": []any{blocker},
			})
			return
		}

		var subID string
		_ = repo.db.QueryRow(`SELECT stripe_subscription_id FROM users WHERE id = $1`, userID).Scan(&subID)
		subID = strings.TrimSpace(subID)

		if subID != "" {
			cfg, err := getStripeConfig()
			if err == nil && cfg.SecretKey != "" {
				req, err := http.NewRequest(http.MethodDelete, "https://api.stripe.com/v1/subscriptions/"+url.PathEscape(subID), nil)
				if err == nil {
					req.Header.Set("Authorization", "Bearer "+cfg.SecretKey)
					resp, err := http.DefaultClient.Do(req)
					if err == nil {
						defer resp.Body.Close()
					}
				}
			}
		}

		_, err = repo.db.Exec(`UPDATE users SET subscription_type = 'decouverte', subscription_start = NULL, stripe_subscription_id = '' WHERE id = $1`, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not unsubscribe")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
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

		if cfg.WebhookSecret != "bypass" {
			if err := verifyStripeSignature(payload, r.Header.Get("Stripe-Signature"), cfg.WebhookSecret); err != nil {
				writeError(w, http.StatusBadRequest, "invalid stripe signature")
				return
			}
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

		subType := strings.TrimSpace(session.Metadata["type"])
		if subType == "subscription" {
			if event.Type == "checkout.session.completed" {
				plan := strings.TrimSpace(session.Metadata["plan"])
				userIDStr := strings.TrimSpace(session.Metadata["user_id"])
				userID, err := strconv.ParseInt(userIDStr, 10, 64)
				if err != nil {
					return false, err
				}
				_, err = repo.db.Exec(`
					UPDATE users 
					SET subscription_type = $1, 
					    subscription_start = NOW(), 
					    stripe_customer_id = $3, 
					    stripe_subscription_id = $4 
					WHERE id = $2`, 
					plan, userID, strings.TrimSpace(session.Customer), strings.TrimSpace(session.Subscription))
				if err != nil {
					return false, err
				}
			}
			return true, nil
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

	case "invoice.paid", "invoice.payment_succeeded":
		var inv stripeWebhookInvoice
		if err := json.Unmarshal(event.Data.Object, &inv); err != nil {
			return false, err
		}
		subID := strings.TrimSpace(inv.Subscription)
		custID := strings.TrimSpace(inv.Customer)
		if subID == "" && custID == "" {
			return true, nil
		}

		var res sql.Result
		var err error
		if subID != "" {
			res, err = repo.db.Exec(`UPDATE users SET subscription_start = NOW() WHERE stripe_subscription_id = $1`, subID)
		}
		if err == nil && subID != "" {
			rows, _ := res.RowsAffected()
			if rows > 0 {
				return true, nil
			}
		}

		if custID != "" {
			_, _ = repo.db.Exec(`UPDATE users SET subscription_start = NOW() WHERE stripe_customer_id = $1`, custID)
		}
		return true, nil

	case "customer.subscription.deleted":
		var sub stripeWebhookSubscription
		if err := json.Unmarshal(event.Data.Object, &sub); err != nil {
			return false, err
		}
		subID := strings.TrimSpace(sub.ID)
		custID := strings.TrimSpace(sub.Customer)
		if subID == "" && custID == "" {
			return true, nil
		}

		if subID != "" {
			res, err := repo.db.Exec(`UPDATE users SET subscription_type = 'decouverte', subscription_start = NULL WHERE stripe_subscription_id = $1`, subID)
			if err == nil {
				rows, _ := res.RowsAffected()
				if rows > 0 {
					return true, nil
				}
			}
		}
		if custID != "" {
			_, _ = repo.db.Exec(`UPDATE users SET subscription_type = 'decouverte', subscription_start = NULL WHERE stripe_customer_id = $1`, custID)
		}
		return true, nil

	default:
		return false, nil
	}
}
