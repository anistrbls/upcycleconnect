package items

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"upcycleconnect/api/mailer"

	"github.com/golang-jwt/jwt/v5"
)

var subscriptionPlanKeyPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,63}$`)

type subscriptionPlanPayload struct {
	Key       string   `json:"key"`
	Name      string   `json:"name"`
	PriceEuro int      `json:"price_euro"`
	Features  []string `json:"features"`
}

type subscriptionPriceChangeNotificationResult struct {
	Subscribers    int  `json:"subscribers"`
	InAppSent      int  `json:"inAppSent"`
	InAppFailed    int  `json:"inAppFailed"`
	MailConfigured bool `json:"mailConfigured"`
	MailSent       int  `json:"mailSent"`
	MailSkipped    int  `json:"mailSkipped"`
	MailFailed     int  `json:"mailFailed"`
}

func claimsRole(claims jwt.MapClaims) string {
	role, _ := claims["role"].(string)
	return strings.TrimSpace(strings.ToLower(role))
}

func claimsEmployeeRole(claims jwt.MapClaims) string {
	employeeRole, _ := claims["employeeRole"].(string)
	return strings.TrimSpace(strings.ToLower(employeeRole))
}

func claimsCanModerateListings(claims jwt.MapClaims) bool {
	return claimsRole(claims) == "admin" || (claimsRole(claims) == "salarie" && claimsEmployeeRole(claims) == "moderateur")
}

func claimsIsAdmin(claims jwt.MapClaims) bool {
	return claimsRole(claims) == "admin"
}

func validateSubscriptionPlanPayload(payload *subscriptionPlanPayload) error {
	payload.Key = NormalizeSubscriptionPlanKey(payload.Key)
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Features = cleanSubscriptionPlanFeatures(payload.Features)
	if payload.Key == "" {
		return fmt.Errorf("key is required")
	}
	if !subscriptionPlanKeyPattern.MatchString(payload.Key) {
		return fmt.Errorf("key must contain only lowercase letters, numbers, underscores or hyphens")
	}
	if payload.Name == "" {
		return fmt.Errorf("name is required")
	}
	if payload.PriceEuro < 0 {
		return fmt.Errorf("price_euro must be positive")
	}
	return nil
}

func validateSubscriptionPlanPricePayload(payload *subscriptionPlanPayload) error {
	payload.Key = NormalizeSubscriptionPlanKey(payload.Key)
	payload.Features = cleanSubscriptionPlanFeatures(payload.Features)
	if payload.Key == "" {
		return fmt.Errorf("key is required")
	}
	if !subscriptionPlanKeyPattern.MatchString(payload.Key) {
		return fmt.Errorf("key must contain only lowercase letters, numbers, underscores or hyphens")
	}
	if payload.PriceEuro < 0 {
		return fmt.Errorf("price_euro must be positive")
	}
	return nil
}

func formatSubscriptionEuroAmount(amount int) string {
	return fmt.Sprintf("%d €", amount)
}

func notifySubscriptionPriceChange(ctx context.Context, repo *Repository, oldPlan SubscriptionPlan, newPlan SubscriptionPlan) (*subscriptionPriceChangeNotificationResult, error) {
	result := &subscriptionPriceChangeNotificationResult{}
	if oldPlan.PriceEuro == newPlan.PriceEuro || IsFreeSubscriptionPlanKey(newPlan.Key) {
		return result, nil
	}

	subscribers, err := repo.ListActiveSubscribersForSubscriptionPlan(ctx, newPlan.Key)
	if err != nil {
		return result, err
	}
	result.Subscribers = len(subscribers)

	mailCfg := mailer.ConfigFromEnv()
	result.MailConfigured = mailCfg.Configured()

	for _, subscriber := range subscribers {
		oldAmount := oldPlan.PriceEuroForBillingCycle(subscriber.BillingCycle)
		newAmount := newPlan.PriceEuroForBillingCycle(subscriber.BillingCycle)
		if oldAmount == newAmount {
			continue
		}

		direction := "supérieur"
		if newAmount < oldAmount {
			direction = "inférieur"
		}
		cadence := "mensuel"
		if NormalizeSubscriptionBillingCycle(subscriber.BillingCycle) == SubscriptionBillingCycleYear {
			cadence = "annuel"
		}

		title := "Tarif de votre abonnement modifié"
		message := fmt.Sprintf(
			"Le tarif %s de votre abonnement %s passe de %s à %s. Votre prochain prélèvement sera %s à ce que vous payez actuellement.",
			cadence,
			newPlan.Name,
			formatSubscriptionEuroAmount(oldAmount),
			formatSubscriptionEuroAmount(newAmount),
			direction,
		)

		if err := CreateNotification(ctx, repo.db, subscriber.ID, title, message, "subscription_price_change"); err != nil {
			result.InAppFailed++
			log.Printf("[subscriptions] failed to create price-change notification for user %d: %v", subscriber.ID, err)
		} else {
			result.InAppSent++
		}

		if !result.MailConfigured {
			result.MailSkipped++
			continue
		}

		greeting := "Bonjour,"
		if displayName := strings.TrimSpace(subscriber.DisplayName); displayName != "" {
			greeting = fmt.Sprintf("Bonjour %s,", displayName)
		}
		body := fmt.Sprintf(`%s

%s

Cette information concerne votre abonnement actif UpcycleConnect.

L'équipe UpcycleConnect`, greeting, message)

		if err := mailer.Send(ctx, mailCfg, mailer.Message{
			To:      []string{subscriber.Email},
			Subject: "UpcycleConnect - changement de tarif de votre abonnement",
			Text:    body,
		}); err != nil {
			result.MailFailed++
			log.Printf("[subscriptions] failed to send price-change email to user %d: %v", subscriber.ID, err)
		} else {
			result.MailSent++
		}
	}

	return result, nil
}

func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	userDisplayName := func(userID int64) string {
		if userID <= 0 {
			return ""
		}
		var firstName, lastName string
		err := db.QueryRow(`SELECT COALESCE(firstname, ''), COALESCE(lastname, '') FROM users WHERE id = $1`, userID).Scan(&firstName, &lastName)
		if err != nil {
			return ""
		}
		return strings.TrimSpace(firstName + " " + lastName)
	}
	notifyAdminsModerationRequired := func(title, message string) {
		t := strings.TrimSpace(title)
		m := strings.TrimSpace(message)
		if t == "" || m == "" {
			return
		}
		rows, err := db.Query(`
			SELECT u.id
			FROM users u
			LEFT JOIN user_notification_settings s ON s.user_id = u.id
			WHERE u.role = 'admin'
			  AND COALESCE(u.status, 'active') = 'active'
			  AND COALESCE(s.app_enabled, true) = true
			  AND COALESCE(s.app_moderation, true) = true
		`)
		if err != nil {
			return
		}
		defer rows.Close()
		ctx := context.Background()
		for rows.Next() {
			var adminID int64
			if rows.Scan(&adminID) == nil && adminID > 0 {
				_ = CreateNotification(ctx, db, adminID, t, m, "admin_moderation")
			}
		}
	}
	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Items schema error: %v", err)
	}
	if err := repo.EnsureLogisticsSchema(); err != nil {
		log.Fatalf("Logistics schema error: %v", err)
	}
	if err := repo.EnsureCodeSettingsSchema(); err != nil {
		log.Fatalf("CodeSettings schema error: %v", err)
	}
	if err := repo.EnsureSubscriptionPlansSchema(); err != nil {
		log.Fatalf("SubscriptionPlans schema error: %v", err)
	}
	if err := repo.EnsureMaterialAlertSubscriptionsSchema(); err != nil {
		log.Fatalf("Material alert subscriptions schema error: %v", err)
	}
	if err := EnsureNotificationsSchema(db); err != nil {
		log.Fatalf("Notifications schema error: %v", err)
	}

	// GET /api/boost-pricing (public : tarifs courants des options "mise à la une" / "remonter")
	mux.HandleFunc("GET /api/boost-pricing", func(w http.ResponseWriter, r *http.Request) {
		cfg, err := GetBoostPricingConfig(r.Context(), db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load pricing")
			return
		}
		writeJSON(w, http.StatusOK, cfg)
	})

	// GET /api/items (public viewing of active items)
	mux.HandleFunc("GET /api/items", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		items, err := repo.List(StatusActive, query)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})

	mux.Handle("GET /api/items/{item_id}/my-professional-rating", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil || itemID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		uid := int64(claims["userId"].(float64))
		stars, ok, err := repo.GetSellerProfessionalRating(context.Background(), itemID, uid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load rating")
			return
		}
		if !ok {
			writeJSON(w, http.StatusOK, map[string]any{"stars": nil})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"stars": stars})
	})))

	mux.Handle("POST /api/items/{item_id}/rate-professional", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil || itemID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		uid := int64(claims["userId"].(float64))
		var body struct {
			Stars int `json:"stars"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if err := repo.UpsertSellerProfessionalRating(context.Background(), itemID, uid, body.Stars); err != nil {
			if strings.Contains(err.Error(), "only item owner") {
				writeError(w, http.StatusForbidden, err.Error())
				return
			}
			if strings.Contains(err.Error(), "stars must be") {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			if strings.Contains(err.Error(), "no professional") || strings.Contains(err.Error(), "invalid reservation") {
				writeError(w, http.StatusBadRequest, err.Error())
				return
			}
			writeError(w, http.StatusInternalServerError, "could not save rating")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})))

	// GET /api/items/{id} (public detail)
	mux.HandleFunc("GET /api/items/", func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/items/")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		item, err := repo.GetByID(id)
		if err != nil {
			writeError(w, http.StatusNotFound, "item not found")
			return
		}
		writeJSON(w, http.StatusOK, item)
	})

	// Protected routes
	// POST /api/items (create item)
	mux.Handle("POST /api/items", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		// Get user ID from email (since we don't have it in claims yet)
		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		var payload CreatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		normWeight, err := normalizeWeightInput(payload.WeightValue, payload.WeightUnit)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if normWeight.HasWeight {
			payload.WeightValue = &normWeight.InputValue
			payload.WeightUnit = normWeight.InputUnit
			payload.WeightGrams = &normWeight.Grams
		} else {
			payload.WeightValue = nil
			payload.WeightUnit = ""
			payload.WeightGrams = nil
		}

		item, err := repo.Create(userID, payload)
		if err != nil {
			log.Printf("Error creating item: %v", err)
			writeError(w, http.StatusInternalServerError, "could not create item")
			return
		}
		statusNorm := strings.ToLower(strings.TrimSpace(item.Status))
		if statusNorm == "en attente" || statusNorm == "pending" {
			authorName := userDisplayName(userID)
			if authorName == "" {
				authorName = "un utilisateur"
			}
			notifyAdminsModerationRequired(
				"Nouvelle annonce à modérer",
				fmt.Sprintf("L'annonce \"%s\" a été soumise à modération par %s.", strings.TrimSpace(item.Title), authorName),
			)
		}
		writeJSON(w, http.StatusCreated, item)
	})))

	// PUT /api/admin/items/{id} (update item)
	mux.Handle("PUT /api/admin/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/admin/items/")
		itemID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		var payload CreatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		normWeight, err := normalizeWeightInput(payload.WeightValue, payload.WeightUnit)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if normWeight.HasWeight {
			payload.WeightValue = &normWeight.InputValue
			payload.WeightUnit = normWeight.InputUnit
			payload.WeightGrams = &normWeight.Grams
		} else {
			payload.WeightValue = nil
			payload.WeightUnit = ""
			payload.WeightGrams = nil
		}

		item, err := repo.Update(userID, itemID, payload)
		if err != nil {
			log.Printf("Error updating item: %v", err)
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "item not found or unauthorized")
			} else {
				writeError(w, http.StatusInternalServerError, "could not update item")
			}
			return
		}

		writeJSON(w, http.StatusOK, item)
	})))

	// GET /api/my-items (user's ads)
	mux.Handle("GET /api/my-items", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		items, err := repo.ListByUser(userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list your items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})))

	// DELETE /api/items/{id} (user soft-delete ad)
	mux.Handle("DELETE /api/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/items/")
		itemID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		err = repo.HideByUser(itemID, userID)
		if err != nil {
			log.Printf("Error hiding item by user: %v", err)
			writeError(w, http.StatusInternalServerError, "could not delete item")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	})))

	// PUT /api/items/{id} (user update own ad)
	mux.Handle("PUT /api/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/items/")
		itemID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		var payload CreatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		normWeight, err := normalizeWeightInput(payload.WeightValue, payload.WeightUnit)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if normWeight.HasWeight {
			payload.WeightValue = &normWeight.InputValue
			payload.WeightUnit = normWeight.InputUnit
			payload.WeightGrams = &normWeight.Grams
		} else {
			payload.WeightValue = nil
			payload.WeightUnit = ""
			payload.WeightGrams = nil
		}

		state, err := repo.GetUserItemState(itemID, userID)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "item not found or unauthorized")
			} else {
				writeError(w, http.StatusInternalServerError, "could not inspect item state")
			}
			return
		}

		requestedStatus := strings.ToLower(strings.TrimSpace(payload.Status))

		// R1: brouillon uniquement avant premiere soumission.
		if requestedStatus == "brouillon" && strings.ToLower(strings.TrimSpace(state.Status)) != "brouillon" {
			writeError(w, http.StatusBadRequest, "cannot move back to draft after first submission")
			return
		}

		// R4: apres depot, annonce verrouillee (pas de modif utilisateur).
		if state.AfterDeposit {
			writeError(w, http.StatusBadRequest, "item is locked after deposit")
			return
		}

		// R3: annonce validee avant depot -> modifications limitees.
		isValidatedBeforeDeposit := strings.ToLower(strings.TrimSpace(state.Status)) == "actif" && state.HasLogistics && !state.AfterDeposit
		if isValidatedBeforeDeposit {
			payload.Type = state.Type
			payload.Price = state.Price
			payload.Category = state.Category
			payload.Condition = state.Condition
			payload.Material = state.Material
			payload.Quantity = state.Quantity
			payload.WeightValue = state.WeightValue
			payload.WeightUnit = state.WeightUnit
			payload.WeightGrams = state.WeightGrams
			payload.City = state.City
			payload.Country = state.Country
			payload.Zip = state.Zip
			payload.DeliveryMode = state.DeliveryMode
			payload.Dimensions = state.Dimensions
			payload.Reference = state.Reference
		}

		// Toute modification utilisateur d'une annonce publiee repasse par la moderation.
		if requestedStatus != "brouillon" {
			payload.Status = StatusPending
		}

		item, err := repo.Update(userID, itemID, payload)
		if err != nil {
			log.Printf("Error updating item: %v", err)
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "item not found or unauthorized")
			} else {
				writeError(w, http.StatusInternalServerError, "could not update item")
			}
			return
		}

		// Si une logistique existe deja, on la ramene a l'etape initiale de parcours.
		if requestedStatus != "brouillon" {
			if err := repo.ResetLogisticsForModeration(r.Context(), itemID); err != nil {
				log.Printf("Info: could not clear logistics for item %d after user edit: %v", itemID, err)
			}
			authorName := userDisplayName(userID)
			if authorName == "" {
				authorName = "un utilisateur"
			}
			notifyAdminsModerationRequired(
				"Annonce mise à jour à modérer",
				fmt.Sprintf("La mise à jour de l'annonce \"%s\" a été soumise à modération par %s.", strings.TrimSpace(item.Title), authorName),
			)
		}

		writeJSON(w, http.StatusOK, item)
	})))

	// POST /api/items/{item_id}/cancel (user cancel before deposit)
	// Chemin explicite {item_id}/cancel pour éviter le conflit ServeMux avec POST /api/items/{item_id}/rate-professional.
	mux.Handle("POST /api/items/{item_id}/cancel", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		var userID int64
		err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil || itemID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		state, err := repo.GetUserItemState(itemID, userID)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "item not found or unauthorized")
			} else {
				writeError(w, http.StatusInternalServerError, "could not inspect item state")
			}
			return
		}

		if state.AfterDeposit {
			writeError(w, http.StatusBadRequest, "cannot cancel after deposit")
			return
		}

		if err := repo.MarkCancelledByUser(itemID, userID); err != nil {
			log.Printf("Error in MarkCancelledByUser for item %d: %v", itemID, err)
			writeError(w, http.StatusInternalServerError, "could not cancel item: "+err.Error())
			return
		}

		// Trigger refund if paid
		if refundErr := repo.RefundItemLogisticsIfPaid(r.Context(), itemID); refundErr != nil {
			log.Printf("Warning: refund failed for item %d: %v", itemID, refundErr)
		}

		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	})))

	// POST /api/items/{item_id}/feature-checkout (option payante : mise à la une)
	mux.Handle("POST /api/items/{item_id}/feature-checkout", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)
		var userID int64
		if err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID); err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil || itemID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		item, err := repo.GetByID(itemID)
		if err != nil || item.UserID != userID {
			writeError(w, http.StatusNotFound, "item not found or unauthorized")
			return
		}
		if strings.ToLower(strings.TrimSpace(item.Status)) != StatusActive {
			writeError(w, http.StatusBadRequest, "only active listings can be featured")
			return
		}

		pricing, err := GetBoostPricingConfig(r.Context(), db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load pricing")
			return
		}

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}
		frontendBase := strings.TrimRight(frontendBaseURL(), "/")
		cfg.SuccessURL = fmt.Sprintf("%s/annonces/mes-annonces?boost=success&session_id={CHECKOUT_SESSION_ID}", frontendBase)
		cfg.CancelURL = fmt.Sprintf("%s/annonces/mes-annonces?boost=cancel", frontendBase)

		session, err := CreateStripeBoostCheckoutSessionPublic(cfg, "item_feature", itemID, userID, "Mise à la une : "+item.Title, pricing.ItemFeaturePriceCents)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create stripe session")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
	})))

	// POST /api/items/{item_id}/bump-checkout (option payante : remonter l'annonce)
	mux.Handle("POST /api/items/{item_id}/bump-checkout", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)
		var userID int64
		if err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID); err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		itemID, err := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err != nil || itemID <= 0 {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		item, err := repo.GetByID(itemID)
		if err != nil || item.UserID != userID {
			writeError(w, http.StatusNotFound, "item not found or unauthorized")
			return
		}
		if strings.ToLower(strings.TrimSpace(item.Status)) != StatusActive {
			writeError(w, http.StatusBadRequest, "only active listings can be bumped")
			return
		}

		pricing, err := GetBoostPricingConfig(r.Context(), db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load pricing")
			return
		}

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}
		frontendBase := strings.TrimRight(frontendBaseURL(), "/")
		cfg.SuccessURL = fmt.Sprintf("%s/annonces/mes-annonces?boost=success&session_id={CHECKOUT_SESSION_ID}", frontendBase)
		cfg.CancelURL = fmt.Sprintf("%s/annonces/mes-annonces?boost=cancel", frontendBase)

		session, err := CreateStripeBoostCheckoutSessionPublic(cfg, "item_bump", itemID, userID, "Remonter l'annonce : "+item.Title, pricing.ItemBumpPriceCents)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create stripe session")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
	})))

	// GET /api/items/boost-confirm?session_id=... (confirme le paiement d'une option payante et l'applique)
	mux.Handle("GET /api/items/boost-confirm", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)
		var userID int64
		if err := db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID); err != nil {
			writeError(w, http.StatusInternalServerError, "user not found")
			return
		}

		sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
		if sessionID == "" {
			writeError(w, http.StatusBadRequest, "session_id is required")
			return
		}

		cfg, err := getStripeConfig()
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
			return
		}

		details, err := RetrieveStripeBoostSessionDetails(cfg.SecretKey, sessionID)
		if err != nil {
			writeError(w, http.StatusBadGateway, "could not verify stripe session")
			return
		}
		if details.UserID > 0 && details.UserID != userID {
			writeError(w, http.StatusForbidden, "session does not belong to current user")
			return
		}
		if strings.TrimSpace(details.PaymentStatus) != "paid" {
			writeJSON(w, http.StatusOK, map[string]any{"paid": false})
			return
		}

		pricing, err := GetBoostPricingConfig(r.Context(), db)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not load pricing")
			return
		}

		switch details.Kind {
		case "item_feature":
			until := time.Now().UTC().Add(pricing.FeatureDuration())
			if err := repo.SetFeatured(details.EntityID, userID, until); err != nil {
				writeError(w, http.StatusInternalServerError, "could not apply featured status")
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"paid": true, "kind": details.Kind, "featuredUntil": until})
		case "item_bump":
			if err := repo.BumpItem(details.EntityID, userID); err != nil {
				writeError(w, http.StatusInternalServerError, "could not bump item")
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"paid": true, "kind": details.Kind})
		default:
			writeError(w, http.StatusBadRequest, "unknown boost kind")
		}
	})))

	// Moderation routes (admin + moderator employees)
	// GET /api/admin/items (moderation list)
	mux.Handle("GET /api/admin/items", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsCanModerateListings(claims) {
			writeError(w, http.StatusForbidden, "moderator only")
			return
		}

		status := r.URL.Query().Get("status")
		query := r.URL.Query().Get("q")

		log.Printf("Admin items list request: status=%s, query=%s", status, query)

		items, err := repo.List(status, query)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list items")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": items})
	})))

	// PATCH /api/admin/items/{id}/status (moderate)
	mux.Handle("PATCH /api/admin/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsCanModerateListings(claims) {
			writeError(w, http.StatusForbidden, "moderator only")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/admin/items/")
		idStr = strings.TrimSuffix(idStr, "/status")
		id, _ := strconv.ParseInt(idStr, 10, 64)

		var p UpdateStatusPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		status := strings.ToLower(strings.TrimSpace(p.Status))
		note := strings.TrimSpace(p.ModerationNote)
		if (status == "refusee" || status == "desactivee" || status == "desactive") && note == "" {
			writeError(w, http.StatusBadRequest, "moderation reason is required")
			return
		}

		err := repo.UpdateStatus(id, p.Status, p.ModerationNote, p.ModerationDetails)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update status")
			return
		}

		// When an item is approved (actif), create a logistics entry
		if p.Status == StatusActive {
			if _, logErr := repo.CreateLogistics(r.Context(), id); logErr != nil {
				log.Printf("Warning: could not create logistics for item %d: %v", id, logErr)
			}
		}

		if p.Status == "refusee" || p.Status == "desactivee" || p.Status == "desactive" {
			// Cancel logistics if one exists
			if cancelErr := repo.CancelLogistics(r.Context(), id, p.ModerationNote, ""); cancelErr != nil {
				// Ignore "item not in logistics" error if the item was never in logistics
				if !strings.Contains(cancelErr.Error(), "item not in logistics") {
					log.Printf("Warning: could not cancel logistics for item %d on status change: %v", id, cancelErr)
				}
			}
			// Trigger refund if paid
			if refundErr := repo.RefundItemLogisticsIfPaid(r.Context(), id); refundErr != nil {
				log.Printf("Warning: refund failed for item %d on status change: %v", id, refundErr)
			}
		}

		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	})))

	// DELETE /api/admin/items/{id} (delete item completely)
	mux.Handle("DELETE /api/admin/items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsIsAdmin(claims) {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}

		path := r.URL.Path
		idStr := strings.TrimPrefix(path, "/api/admin/items/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}

		// Trigger refund if paid before deleting the item record
		if refundErr := repo.RefundItemLogisticsIfPaid(r.Context(), id); refundErr != nil {
			log.Printf("Warning: refund failed before deleting item %d: %v", id, refundErr)
		}

		err = repo.Delete(id)
		if err != nil {
			log.Printf("Error deleting item: %v", err)
			writeError(w, http.StatusInternalServerError, "could not delete item")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	})))

	// Code configuration routes
	mux.Handle("GET /api/admin/code-config", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if claims["role"] != "admin" {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}
		cfg, err := repo.GetCodeConfig(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load config")
			return
		}
		writeJSON(w, http.StatusOK, cfg)
	})))

	mux.Handle("PUT /api/admin/code-config", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if claims["role"] != "admin" {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}
		var cfg CodeConfig
		if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		// constraints
		if cfg.Length < 4 {
			cfg.Length = 4
		}
		if cfg.Length > 16 {
			cfg.Length = 16
		}
		if err := repo.UpdateCodeConfig(r.Context(), cfg); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save config")
			return
		}
		writeJSON(w, http.StatusOK, cfg)
	})))

	// Subscription plans endpoints
	mux.HandleFunc("GET /api/pro/subscription-plans", func(w http.ResponseWriter, r *http.Request) {
		plans, err := repo.GetSubscriptionPlans(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to load subscription plans")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"plans": plans})
	})

	mux.Handle("POST /api/admin/subscription-plans", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsIsAdmin(claims) {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}
		var payload subscriptionPlanPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if err := validateSubscriptionPlanPayload(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		plan, err := repo.CreateSubscriptionPlan(r.Context(), payload.Key, payload.Name, payload.PriceEuro, payload.Features)
		if err != nil {
			if strings.Contains(err.Error(), "duplicate key") {
				writeError(w, http.StatusConflict, "subscription plan already exists")
				return
			}
			log.Printf("[subscriptions] failed to create plan %q: %v", payload.Key, err)
			writeError(w, http.StatusInternalServerError, "failed to create subscription plan")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"success": true, "plan": plan})
	})))

	mux.Handle("PUT /api/admin/subscription-plans", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsIsAdmin(claims) {
			writeError(w, http.StatusForbidden, "admin only")
			return
		}
		var payload subscriptionPlanPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if err := validateSubscriptionPlanPricePayload(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		previousPlan, err := repo.GetSubscriptionPlan(r.Context(), payload.Key)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "subscription plan not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to load subscription plan")
			return
		}

		features := previousPlan.Features
		if payload.Features != nil {
			features = payload.Features
		}

		plan, err := repo.UpdateSubscriptionPlan(r.Context(), payload.Key, payload.PriceEuro, features)
		if err != nil {
			if err == sql.ErrNoRows {
				writeError(w, http.StatusNotFound, "subscription plan not found")
				return
			}
			log.Printf("[subscriptions] failed to update plan %q: %v", payload.Key, err)
			writeError(w, http.StatusInternalServerError, "failed to update subscription plan")
			return
		}

		notifications, notificationErr := notifySubscriptionPriceChange(r.Context(), repo, previousPlan, plan)
		if notificationErr != nil {
			log.Printf("[subscriptions] failed to notify price change for plan %q: %v", payload.Key, notificationErr)
		}

		response := map[string]any{
			"success":       true,
			"plan":          plan,
			"notifications": notifications,
		}
		if notificationErr != nil {
			response["notificationError"] = "price updated, but notifications could not be fully processed"
		}
		writeJSON(w, http.StatusOK, response)
	})))

	// Deposit Points Routes
	RegisterDepositRoutes(mux, repo, authMiddleware)

	// Logistics Workflow Routes
	RegisterLogisticsRoutes(mux, repo, authMiddleware)
	RegisterProfessionalRoutes(mux, repo, authMiddleware)

	// GET /api/notifications
	mux.Handle("GET /api/notifications", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		userID := int64(claims["userId"].(float64))

		notifs, err := GetNotifications(r.Context(), db, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to get notifications")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"notifications": notifs})
	})))

	// POST /api/notifications/{id}/read
	mux.Handle("POST /api/notifications/{id}/read", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		userID := int64(claims["userId"].(float64))

		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil || id <= 0 {
			writeError(w, http.StatusBadRequest, "invalid notification id")
			return
		}

		if err := MarkNotificationAsRead(r.Context(), db, id, userID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to mark notification as read")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
	})))

	// POST /api/notifications/read-all
	mux.Handle("POST /api/notifications/read-all", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		userID := int64(claims["userId"].(float64))

		if err := MarkAllNotificationsAsRead(r.Context(), db, userID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to mark all notifications as read")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
	})))

	// DELETE /api/notifications/{id}
	mux.Handle("DELETE /api/notifications/{id}", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		userID := int64(claims["userId"].(float64))

		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil || id <= 0 {
			writeError(w, http.StatusBadRequest, "invalid notification id")
			return
		}

		if err := DeleteNotification(r.Context(), db, id, userID); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to delete notification")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"success": true})
	})))
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
