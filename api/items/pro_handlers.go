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
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type downgradePublishedProject struct {
	ID               int64  `json:"id"`
	Title            string `json:"title"`
	Status           string `json:"status"`
	ModerationStatus string `json:"moderationStatus"`
	UpdatedAt        string `json:"updatedAt"`
}

type downgradePublishedBlocker struct {
	Code                  string                      `json:"code"`
	Limit                 int                         `json:"limit"`
	CurrentPublishedCount int                         `json:"currentPublishedCount"`
	Excess                int                         `json:"excess"`
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

func timeOrNilArg(t *time.Time) any {
	if t == nil {
		return nil
	}
	return t.UTC()
}

func estimatedSubscriptionPeriodEnd(start, currentPeriodEnd sql.NullTime, billingCycle string) time.Time {
	now := time.Now().UTC()
	if currentPeriodEnd.Valid && currentPeriodEnd.Time.After(now) {
		return currentPeriodEnd.Time.UTC()
	}

	periodEnd := now
	if start.Valid && !start.Time.IsZero() {
		periodEnd = start.Time.UTC()
	}
	for !periodEnd.After(now) {
		if NormalizeSubscriptionBillingCycle(billingCycle) == SubscriptionBillingCycleYear {
			periodEnd = periodEnd.AddDate(1, 0, 0)
		} else {
			periodEnd = periodEnd.AddDate(0, 1, 0)
		}
	}
	return periodEnd.UTC()
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
			Plan         string `json:"plan"`
			BillingCycle string `json:"billing_cycle"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}

		plan := NormalizeSubscriptionPlanKey(payload.Plan)
		if IsFreeSubscriptionPlanKey(plan) {
			writeError(w, http.StatusBadRequest, "invalid plan")
			return
		}
		billingCycle := NormalizeSubscriptionBillingCycle(payload.BillingCycle)

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}

		subscriptionPlan, err := repo.GetSubscriptionPlan(r.Context(), plan)
		if err != nil {
			writeError(w, http.StatusNotFound, "subscription plan not found")
			return
		}
		if subscriptionPlan.PriceEuro <= 0 {
			writeError(w, http.StatusBadRequest, "invalid subscription plan price")
			return
		}

		amountCents := int64(subscriptionPlan.PriceEuroForBillingCycle(billingCycle) * 100)
		planName := "Abonnement " + subscriptionPlan.Name
		if billingCycle == SubscriptionBillingCycleYear {
			planName += " annuel"
		} else {
			planName += " mensuel"
		}
		userIDStr := strconv.FormatInt(userID, 10)

		form := url.Values{}
		form.Set("mode", "subscription")
		form.Set("success_url", "http://localhost:3000/finances/abonnement?stripe=success&session_id={CHECKOUT_SESSION_ID}")
		form.Set("cancel_url", "http://localhost:3000/finances/abonnement?stripe=cancel")
		form.Set("metadata[type]", "subscription")
		form.Set("metadata[plan]", plan)
		form.Set("metadata[billing_cycle]", billingCycle)
		form.Set("metadata[user_id]", userIDStr)
		form.Set("line_items[0][quantity]", "1")
		form.Set("line_items[0][price_data][currency]", "eur")
		form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(amountCents, 10))
		form.Set("line_items[0][price_data][product_data][name]", planName)
		form.Set("line_items[0][price_data][recurring][interval]", billingCycle)

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
		billingCycle := NormalizeSubscriptionBillingCycle(session.Metadata["billing_cycle"])
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

		subscriptionID := strings.TrimSpace(session.Subscription)
		var currentPeriodEnd *time.Time
		if subscriptionID != "" {
			if sub, fetchErr := fetchStripeSubscription(cfg, subscriptionID); fetchErr == nil {
				currentPeriodEnd = stripeSubscriptionPeriodEnd(sub.CurrentPeriodEnd)
			}
		}
		if currentPeriodEnd == nil {
			estimated := estimatedSubscriptionPeriodEnd(sql.NullTime{Time: time.Now().UTC(), Valid: true}, sql.NullTime{}, billingCycle)
			currentPeriodEnd = &estimated
		}

		_, err = repo.db.Exec(`
			UPDATE users 
			SET subscription_type = $1, 
			    subscription_start = NOW(), 
			    stripe_customer_id = $3, 
			    stripe_subscription_id = $4,
			    subscription_billing_cycle = $5,
			    subscription_current_period_end = $6,
			    subscription_cancel_at_period_end = false
			WHERE id = $2`,
			plan, userID, strings.TrimSpace(session.Customer), subscriptionID, billingCycle, timeOrNilArg(currentPeriodEnd))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update subscription")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"confirmed": true, "plan": plan, "billing_cycle": billingCycle})
	}))

	mux.Handle("POST /api/pro/unsubscribe", professionalOnly(func(w http.ResponseWriter, r *http.Request) {
		userID, _, _, err := getProfessionalUser(r)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		var subID, billingCycle sql.NullString
		var subscriptionStart, currentPeriodEnd sql.NullTime
		var cancelAtPeriodEnd bool
		err = repo.db.QueryRow(`
			SELECT stripe_subscription_id,
			       subscription_billing_cycle,
			       subscription_start,
			       subscription_current_period_end,
			       subscription_cancel_at_period_end
			FROM users
			WHERE id = $1
		`, userID).Scan(&subID, &billingCycle, &subscriptionStart, &currentPeriodEnd, &cancelAtPeriodEnd)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load subscription")
			return
		}

		cycle := NormalizeSubscriptionBillingCycle(billingCycle.String)
		subscriptionID := strings.TrimSpace(subID.String)
		var periodEnd time.Time

		if cancelAtPeriodEnd {
			if currentPeriodEnd.Valid {
				periodEnd = currentPeriodEnd.Time.UTC()
			} else {
				periodEnd = estimatedSubscriptionPeriodEnd(subscriptionStart, currentPeriodEnd, cycle)
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"ok":                   true,
				"scheduled":            true,
				"already_scheduled":    true,
				"current_period_end":   periodEnd,
				"cancel_at_period_end": true,
			})
			return
		}

		if subscriptionID != "" {
			cfg, err := getStripeConfig()
			if err != nil {
				writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
				return
			}
			sub, err := updateStripeSubscriptionCancelAtPeriodEnd(cfg, subscriptionID, true)
			if err != nil {
				writeError(w, http.StatusBadGateway, "could not schedule stripe subscription cancellation")
				return
			}
			if stripeEnd := stripeSubscriptionPeriodEnd(sub.CurrentPeriodEnd); stripeEnd != nil {
				periodEnd = stripeEnd.UTC()
			}
		}
		if periodEnd.IsZero() {
			periodEnd = estimatedSubscriptionPeriodEnd(subscriptionStart, currentPeriodEnd, cycle)
		}

		_, err = repo.db.Exec(`
			UPDATE users
			SET subscription_cancel_at_period_end = true,
			    subscription_current_period_end = $2,
			    updated_at = NOW()
			WHERE id = $1
		`, userID, periodEnd)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not unsubscribe")
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"ok":                   true,
			"scheduled":            true,
			"current_period_end":   periodEnd,
			"cancel_at_period_end": true,
		})
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
				billingCycle := NormalizeSubscriptionBillingCycle(session.Metadata["billing_cycle"])
				userIDStr := strings.TrimSpace(session.Metadata["user_id"])
				userID, err := strconv.ParseInt(userIDStr, 10, 64)
				if err != nil {
					return false, err
				}
				subscriptionID := strings.TrimSpace(session.Subscription)
				var currentPeriodEnd *time.Time
				if subscriptionID != "" {
					if cfg, cfgErr := getStripeConfig(); cfgErr == nil {
						if sub, fetchErr := fetchStripeSubscription(cfg, subscriptionID); fetchErr == nil {
							currentPeriodEnd = stripeSubscriptionPeriodEnd(sub.CurrentPeriodEnd)
						}
					}
				}
				if currentPeriodEnd == nil {
					estimated := estimatedSubscriptionPeriodEnd(sql.NullTime{Time: time.Now().UTC(), Valid: true}, sql.NullTime{}, billingCycle)
					currentPeriodEnd = &estimated
				}
				_, err = repo.db.Exec(`
					UPDATE users 
					SET subscription_type = $1, 
					    subscription_start = NOW(), 
					    stripe_customer_id = $3, 
					    stripe_subscription_id = $4,
					    subscription_billing_cycle = $5,
					    subscription_current_period_end = $6,
					    subscription_cancel_at_period_end = false
					WHERE id = $2`,
					plan, userID, strings.TrimSpace(session.Customer), subscriptionID, billingCycle, timeOrNilArg(currentPeriodEnd))
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

		var currentPeriodEnd *time.Time
		cancelAtPeriodEnd := false
		hasSubscriptionDetails := false
		if subID != "" {
			if cfg, cfgErr := getStripeConfig(); cfgErr == nil {
				if sub, fetchErr := fetchStripeSubscription(cfg, subID); fetchErr == nil {
					currentPeriodEnd = stripeSubscriptionPeriodEnd(sub.CurrentPeriodEnd)
					cancelAtPeriodEnd = sub.CancelAtPeriodEnd
					hasSubscriptionDetails = true
				}
			}
		}

		var res sql.Result
		var err error
		if subID != "" {
			res, err = repo.db.Exec(`
				UPDATE users
				SET subscription_start = NOW(),
				    subscription_current_period_end = COALESCE($2::timestamptz, subscription_current_period_end),
				    subscription_cancel_at_period_end = CASE WHEN $4 THEN $3 ELSE subscription_cancel_at_period_end END,
				    updated_at = NOW()
				WHERE stripe_subscription_id = $1
			`, subID, timeOrNilArg(currentPeriodEnd), cancelAtPeriodEnd, hasSubscriptionDetails)
			if err != nil {
				return false, err
			}
			rows, _ := res.RowsAffected()
			if rows > 0 {
				return true, nil
			}
		}

		if custID != "" {
			_, _ = repo.db.Exec(`UPDATE users SET subscription_start = NOW() WHERE stripe_customer_id = $1`, custID)
		}
		return true, nil

	case "customer.subscription.updated":
		var sub stripeWebhookSubscription
		if err := json.Unmarshal(event.Data.Object, &sub); err != nil {
			return false, err
		}
		subID := strings.TrimSpace(sub.ID)
		custID := strings.TrimSpace(sub.Customer)
		periodEnd := stripeSubscriptionPeriodEnd(sub.CurrentPeriodEnd)
		if subID == "" && custID == "" {
			return true, nil
		}

		if subID != "" {
			res, err := repo.db.Exec(`
				UPDATE users
				SET subscription_cancel_at_period_end = $2,
				    subscription_current_period_end = COALESCE($3::timestamptz, subscription_current_period_end),
				    updated_at = NOW()
				WHERE stripe_subscription_id = $1
			`, subID, sub.CancelAtPeriodEnd, timeOrNilArg(periodEnd))
			if err == nil {
				rows, _ := res.RowsAffected()
				if rows > 0 {
					return true, nil
				}
			}
		}
		if custID != "" {
			_, _ = repo.db.Exec(`
				UPDATE users
				SET subscription_cancel_at_period_end = $2,
				    subscription_current_period_end = COALESCE($3::timestamptz, subscription_current_period_end),
				    updated_at = NOW()
				WHERE stripe_customer_id = $1
			`, custID, sub.CancelAtPeriodEnd, timeOrNilArg(periodEnd))
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
			res, err := repo.db.Exec(`
				UPDATE users
				SET subscription_type = 'decouverte',
				    subscription_start = NULL,
				    subscription_billing_cycle = 'month',
				    subscription_current_period_end = NULL,
				    subscription_cancel_at_period_end = false,
				    stripe_subscription_id = '',
				    updated_at = NOW()
				WHERE stripe_subscription_id = $1
			`, subID)
			if err == nil {
				rows, _ := res.RowsAffected()
				if rows > 0 {
					return true, nil
				}
			}
		}
		if custID != "" {
			_, _ = repo.db.Exec(`
				UPDATE users
				SET subscription_type = 'decouverte',
				    subscription_start = NULL,
				    subscription_billing_cycle = 'month',
				    subscription_current_period_end = NULL,
				    subscription_cancel_at_period_end = false,
				    stripe_subscription_id = '',
				    updated_at = NOW()
				WHERE stripe_customer_id = $1
			`, custID)
		}
		return true, nil

	default:
		return false, nil
	}
}
