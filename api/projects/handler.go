package projects

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"upcycleconnect/api/items"
)

// Handler regroupe les handlers HTTP du module projects.
type Handler struct {
	repo *Repository
}

// NewHandler crée un nouveau Handler.
func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) userDisplayName(userID int64) string {
	if userID <= 0 {
		return ""
	}
	var firstName, lastName string
	err := h.repo.db.QueryRow(`SELECT COALESCE(firstname, ''), COALESCE(lastname, '') FROM users WHERE id = $1`, userID).Scan(&firstName, &lastName)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(firstName + " " + lastName)
}

func (h *Handler) notifyAdminsModerationRequired(title, message string) {
	t := strings.TrimSpace(title)
	m := strings.TrimSpace(message)
	if t == "" || m == "" {
		return
	}

	rows, err := h.repo.db.Query(`
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
			_ = items.CreateNotification(ctx, h.repo.db, adminID, t, m, "admin_moderation")
		}
	}
}

// getProUserID extrait l'ID du professionnel depuis les claims JWT.
func (h *Handler) getProUserID(r *http.Request) (int64, bool) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		return 0, false
	}
	email, _ := claims["sub"].(string)
	var userID int64
	err := h.repo.db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
	return userID, err == nil
}

// parseID extrait un ID entier depuis le chemin d'URL.
func parseID(path, prefix string) (int64, bool) {
	s := strings.TrimPrefix(path, prefix)
	s = strings.Split(s, "/")[0]
	id, err := strconv.ParseInt(s, 10, 64)
	return id, err == nil
}

// ListHandler gère GET /api/pro/projects — liste des projets du pro.
func (h *Handler) ListHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	projects, err := h.repo.ListByPro(proUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list projects")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

// CreateHandler gère POST /api/pro/projects — création d'un projet.
func (h *Handler) CreateHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var payload CreatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if strings.TrimSpace(payload.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if payload.Status == StatusPublished && strings.TrimSpace(payload.Description) == "" {
		writeError(w, http.StatusBadRequest, "description is required to publish")
		return
	}
	if payload.Status == StatusPublished {
		writeError(w, http.StatusBadRequest, "create as draft first, then submit for moderation")
		return
	}

	p, err := h.repo.Create(proUserID, payload)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create project")
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

// DetailHandler gère GET /api/pro/projects/{id} — détail d'un projet.
func (h *Handler) DetailHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	projectID, ok := parseID(r.URL.Path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetByID(projectID, proUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	items, _ := h.repo.ListItems(projectID)
	images, _ := h.repo.ListImages(projectID)
	writeJSON(w, http.StatusOK, map[string]any{
		"project": p,
		"items":   items,
		"images":  images,
		"impact": map[string]any{
			"totalWeightGrams": p.TotalWeightGrams,
			"totalWeightKg":    p.TotalWeightKg,
			"upcyclingScore":   p.UpcyclingScore,
		},
	})
}

// ListProjectLikersHandler gère GET /api/pro/projects/{id}/likes (propriétaire du projet).
func (h *Handler) ListProjectLikersHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/likes")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	if _, err := h.repo.GetByID(projectID, proUserID); err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	likers, err := h.repo.ListProjectLikers(projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "impossible de charger les j'aime")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"likers": likers})
}

// UpdateHandler gère PUT /api/pro/projects/{id} — mise à jour d'un projet.
func (h *Handler) UpdateHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	projectID, ok := parseID(r.URL.Path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	var payload UpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if strings.TrimSpace(payload.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if payload.Status == StatusPublished && strings.TrimSpace(payload.Description) == "" {
		writeError(w, http.StatusBadRequest, "description is required to publish")
		return
	}
	if payload.Status == StatusPublished {
		writeError(w, http.StatusBadRequest, "use publish endpoint to submit moderation")
		return
	}
	p, err := h.repo.Update(projectID, proUserID, payload)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// DeleteHandler gère DELETE /api/pro/projects/{id} — suppression d'un projet.
func (h *Handler) DeleteHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	projectID, ok := parseID(r.URL.Path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	if err := h.repo.Delete(projectID, proUserID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// ArchiveHandler gère POST /api/pro/projects/{id}/archive — remet un projet en brouillon.
func (h *Handler) ArchiveHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/archive")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	if err := h.repo.Archive(projectID, proUserID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "status": StatusDraft})
}

// PublishHandler gère POST /api/pro/projects/{id}/publish.
func (h *Handler) PublishHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	// Path: /api/pro/projects/{id}/publish → strip suffix
	path := strings.TrimSuffix(r.URL.Path, "/publish")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	// Vérifier qu'une description existe
	p, err := h.repo.GetByID(projectID, proUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	if strings.TrimSpace(p.Description) == "" {
		writeError(w, http.StatusBadRequest, "description is required to publish")
		return
	}
	if err := h.repo.ValidatePublishReadiness(projectID, proUserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Vérifier la limite de projets publiés selon l'abonnement
	var subscriptionType string
	err = h.repo.db.QueryRow("SELECT COALESCE(subscription_type, 'decouverte') FROM users WHERE id = $1", proUserID).Scan(&subscriptionType)
	if err == nil {
		subscriptionType = strings.TrimSpace(strings.ToLower(subscriptionType))
		var limit int
		var planName string
		switch subscriptionType {
		case "decouverte", "gratuit", "none", "":
			limit = 3
			planName = "Découverte"
		case "pro_essentiel":
			limit = 10
			planName = "Pro Essentiel"
		}
		if limit > 0 {
			var publishedCount int
			_ = h.repo.db.QueryRow("SELECT COUNT(*) FROM upcycling_projects WHERE pro_user_id = $1 AND status = 'publie' AND id != $2", proUserID, projectID).Scan(&publishedCount)
			if publishedCount >= limit {
				writeError(w, http.StatusForbidden, "Vous avez atteint la limite de "+strconv.Itoa(limit)+" projets publiés pour l'offre "+planName+". Veuillez repasser un projet en brouillon ou passer à un abonnement supérieur.")
				return
			}
		}
	}

	if err := h.repo.Publish(projectID, proUserID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	authorName := h.userDisplayName(proUserID)
	if authorName == "" {
		authorName = "un professionnel"
	}
	h.notifyAdminsModerationRequired(
		"Nouveau projet à modérer",
		fmt.Sprintf("Le projet \"%s\" a été soumis à modération par %s.", strings.TrimSpace(p.Title), authorName),
	)
	writeJSON(w, http.StatusOK, map[string]any{"status": "brouillon", "moderationStatus": "pending"})
}

// frontendBase retourne l'URL de base du frontend (pour les redirections Stripe), avec une valeur par défaut en dev.
func frontendBase() string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if base == "" {
		base = "http://localhost:3000"
	}
	return base
}

// FeatureCheckoutHandler gère POST /api/pro/projects/{id}/feature-checkout (option payante : mise à la une).
func (h *Handler) FeatureCheckoutHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/feature-checkout")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetByID(projectID, proUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	if p.Status != StatusPublished || p.ModerationStatus != "approved" {
		writeError(w, http.StatusBadRequest, "only published, approved projects can be featured")
		return
	}

	pricing, err := items.GetBoostPricingConfig(r.Context(), h.repo.db)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load pricing")
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		return
	}
	base := strings.TrimRight(frontendBase(), "/")
	cfg.SuccessURL = fmt.Sprintf("%s/projets/mes-projets?boost=success&session_id={CHECKOUT_SESSION_ID}", base)
	cfg.CancelURL = fmt.Sprintf("%s/projets/mes-projets?boost=cancel", base)

	session, err := items.CreateStripeBoostCheckoutSessionPublic(cfg, "project_feature", projectID, proUserID, "Mise à la une : "+p.Title, pricing.ProjectFeaturePriceCents)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create stripe session")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

// BumpCheckoutHandler gère POST /api/pro/projects/{id}/bump-checkout (option payante : remonter le projet).
func (h *Handler) BumpCheckoutHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/bump-checkout")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetByID(projectID, proUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	if p.Status != StatusPublished || p.ModerationStatus != "approved" {
		writeError(w, http.StatusBadRequest, "only published, approved projects can be bumped")
		return
	}

	pricing, err := items.GetBoostPricingConfig(r.Context(), h.repo.db)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load pricing")
		return
	}

	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		return
	}
	base := strings.TrimRight(frontendBase(), "/")
	cfg.SuccessURL = fmt.Sprintf("%s/projets/mes-projets?boost=success&session_id={CHECKOUT_SESSION_ID}", base)
	cfg.CancelURL = fmt.Sprintf("%s/projets/mes-projets?boost=cancel", base)

	session, err := items.CreateStripeBoostCheckoutSessionPublic(cfg, "project_bump", projectID, proUserID, "Remonter le projet : "+p.Title, pricing.ProjectBumpPriceCents)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create stripe session")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

// BoostConfirmHandler gère GET /api/pro/projects/boost-confirm?session_id=... (confirme le paiement d'une option payante et l'applique).
func (h *Handler) BoostConfirmHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "session_id is required")
		return
	}
	cfg, err := items.GetStripeConfigPublic()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "stripe is not configured")
		return
	}
	details, err := items.RetrieveStripeBoostSessionDetails(cfg.SecretKey, sessionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not verify stripe session")
		return
	}
	if details.UserID > 0 && details.UserID != proUserID {
		writeError(w, http.StatusForbidden, "session does not belong to current user")
		return
	}
	if strings.TrimSpace(details.PaymentStatus) != "paid" {
		writeJSON(w, http.StatusOK, map[string]any{"paid": false})
		return
	}

	pricing, err := items.GetBoostPricingConfig(r.Context(), h.repo.db)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load pricing")
		return
	}

	switch details.Kind {
	case "project_feature":
		until := time.Now().UTC().Add(pricing.FeatureDuration())
		if err := h.repo.SetFeatured(details.EntityID, proUserID, until); err != nil {
			writeError(w, http.StatusInternalServerError, "could not apply featured status")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"paid": true, "kind": details.Kind, "featuredUntil": until})
	case "project_bump":
		if err := h.repo.Bump(details.EntityID, proUserID); err != nil {
			writeError(w, http.StatusInternalServerError, "could not bump project")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"paid": true, "kind": details.Kind})
	default:
		writeError(w, http.StatusBadRequest, "unknown boost kind")
	}
}

// AddItemHandler gère POST /api/pro/projects/{id}/items.
func (h *Handler) AddItemHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/items")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	var body struct {
		ItemID int64 `json:"itemId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ItemID == 0 {
		writeError(w, http.StatusBadRequest, "itemId required")
		return
	}
	if err := h.repo.AddItem(projectID, body.ItemID, proUserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

// RemoveItemHandler gère DELETE /api/pro/projects/{id}/items/{item_id}.
func (h *Handler) RemoveItemHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	// Path: /api/pro/projects/{id}/items/{item_id}
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/pro/projects/"), "/")
	if len(parts) < 3 {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}
	projectID, err1 := strconv.ParseInt(parts[0], 10, 64)
	itemID, err2 := strconv.ParseInt(parts[2], 10, 64)
	if err1 != nil || err2 != nil {
		writeError(w, http.StatusBadRequest, "invalid ids")
		return
	}
	if err := h.repo.RemoveItem(projectID, itemID, proUserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// AddImageHandler gère POST /api/pro/projects/{id}/images.
func (h *Handler) AddImageHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/images")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	var body struct {
		URL       string `json:"url"`
		ImageType string `json:"imageType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.URL) == "" {
		writeError(w, http.StatusBadRequest, "url required")
		return
	}
	img, err := h.repo.AddImage(projectID, proUserID, body.URL, body.ImageType)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, img)
}

// AddStepImageHandler gère POST /api/pro/projects/{id}/steps/images.
func (h *Handler) AddStepImageHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/steps/images")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.URL) == "" {
		writeError(w, http.StatusBadRequest, "url required")
		return
	}
	img, err := h.repo.AddStepImage(projectID, proUserID, body.URL)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":  img.ID,
		"url": img.URL,
	})
}

// RemoveImageHandler gère DELETE /api/pro/projects/{id}/images/{image_id}.
func (h *Handler) RemoveImageHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/pro/projects/"), "/")
	if len(parts) < 3 {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}
	imageID, err := strconv.ParseInt(parts[2], 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid image id")
		return
	}
	if err := h.repo.RemoveImage(imageID, proUserID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// RecoveredItemsHandler gère GET /api/pro/projects/recovered-items —
// liste des objets récupérés par le pro (pour les associer à un projet).
func (h *Handler) RecoveredItemsHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.repo.ListRecoveredItems(proUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list recovered items")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// AdminListHandler gère GET /api/admin/projects — liste tous les projets (admin).
func (h *Handler) AdminListHandler(w http.ResponseWriter, r *http.Request) {
	statusFilter := r.URL.Query().Get("status")
	moderationStatusFilter := r.URL.Query().Get("moderationStatus")
	projects, err := h.repo.AdminListAll(statusFilter, moderationStatusFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list projects")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

// ParticulierListPostedHandler gère GET /api/part/projects — liste des projets publiés.
func (h *Handler) ParticulierListPostedHandler(w http.ResponseWriter, r *http.Request) {
	claims, _ := r.Context().Value("authClaims").(jwt.MapClaims)
	var userID int64
	if claims != nil {
		if uid, ok := claims["userId"].(float64); ok {
			userID = int64(uid)
		}
	}

	projects, err := h.repo.ParticulierListPosted(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list posted projects")
		return
	}
	if userID > 0 && len(projects) > 0 {
		projectIDs := make([]int64, 0, len(projects))
		for _, p := range projects {
			projectIDs = append(projectIDs, p.ID)
		}
		_ = h.repo.TrackFeedImpressions(projectIDs, userID)
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

// ParticulierDetailHandler gère GET /api/part/projects/{id} — détail d'un projet publié.
func (h *Handler) ParticulierDetailHandler(w http.ResponseWriter, r *http.Request) {
	projectID, ok := parseID(r.URL.Path, "/api/part/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetByID(projectID, 0) // 0 = pas de vérification ownership
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	// Vérifier que le projet est publié et approuvé
	if p.Status != StatusPublished || p.ModerationStatus != "approved" {
		writeError(w, http.StatusForbidden, "project not accessible")
		return
	}
	if strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("from")), "postes") {
		if claims, ok := r.Context().Value("authClaims").(jwt.MapClaims); ok {
			if uid, ok := claims["userId"].(float64); ok {
				_ = h.repo.TrackProjectClick(projectID, int64(uid))
			}
		}
	}

	items, _ := h.repo.ListItems(projectID)
	images, _ := h.repo.ListImages(projectID)
	author, err := h.repo.AdminProSummary(projectID)
	if err != nil {
		author = &ProSummary{
			UserID:                   p.ProUserID,
			FullName:                 strings.TrimSpace(p.ProDisplayName),
			CompanyName:              "N/A",
			TotalUCScore:             p.UpcyclingScore,
			TotalProjectsSinceSignup: 1,
			JoinedAt:                 p.CreatedAt,
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"project": p,
		"items":   items,
		"images":  images,
		"author":  author,
	})
}

// ProjectAnalyticsHandler gère GET /api/pro/projects/{id}/analytics.
func (h *Handler) ProjectAnalyticsHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	path := strings.TrimSuffix(r.URL.Path, "/analytics")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	stats, err := h.repo.GetProjectAnalytics(projectID, proUserID)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "reservees") {
			writeError(w, http.StatusForbidden, msg)
			return
		}
		if strings.Contains(msg, "not found") || strings.Contains(msg, "not yours") {
			writeError(w, http.StatusNotFound, msg)
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load analytics")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stats": stats})
}

// ParticulierListParticipatedHandler gère GET /api/mes-projets.
// Particulier : projets où ses objets donnés/vendus ont été utilisés + score / poids personnel.
// Professionnel : ses projets publiés et validés (même format que le catalogue) + score / poids UpCycle Connect (objets récupérés).
func (h *Handler) ParticulierListParticipatedHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userIDVal, ok := claims["userId"].(float64)
	if !ok {
		writeError(w, http.StatusInternalServerError, "invalid user id in token")
		return
	}
	userID := int64(userIDVal)

	role, _ := claims["role"].(string)
	var projects []Project
	var err error
	if role == "professionnel" {
		projects, err = h.repo.ProPublishedProjectsForMyUpcycle(userID, userID)
	} else {
		projects, err = h.repo.ParticulierListParticipated(userID)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch participated projects")
		return
	}

	var myScore, myWeight float64
	if role == "professionnel" {
		myScore, _ = h.repo.GetProUCConnectScore(userID)
		myWeight, _ = h.repo.GetProUCConnectWeight(userID)
	} else {
		myScore, _ = h.repo.GetUserPersonalScore(userID)
		myWeight, _ = h.repo.GetUserPersonalWeight(userID)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"projects": projects,
		"myScore":  myScore,
		"myWeight": myWeight,
	})
}

// AdminDetailHandler gère GET /api/admin/projects/{id} — détail d'un projet (admin).
func (h *Handler) AdminDetailHandler(w http.ResponseWriter, r *http.Request) {
	projectID, ok := parseID(r.URL.Path, "/api/admin/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetByID(projectID, 0) // 0 = pas de vérification ownership
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	items, _ := h.repo.ListItems(projectID)
	images, _ := h.repo.ListImages(projectID)
	author, err := h.repo.AdminProSummary(projectID)
	if err != nil {
		author = &ProSummary{
			UserID:                   p.ProUserID,
			FullName:                 strings.TrimSpace(p.ProDisplayName),
			CompanyName:              "N/A",
			TotalUCScore:             p.UpcyclingScore,
			TotalProjectsSinceSignup: 1,
			JoinedAt:                 p.CreatedAt,
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"project": p,
		"items":   items,
		"images":  images,
		"author":  author,
	})
}

// AdminDeleteHandler gère DELETE /api/admin/projects/{id} — suppression d'un projet (admin).
func (h *Handler) AdminDeleteHandler(w http.ResponseWriter, r *http.Request) {
	projectID, ok := parseID(r.URL.Path, "/api/admin/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	if err := h.repo.AdminDelete(projectID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// AdminModerateHandler gère POST /api/admin/projects/{id}/moderate.
func (h *Handler) AdminModerateHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/moderate")
	projectID, ok := parseID(path, "/api/admin/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}
	var body struct {
		ModerationStatus string `json:"moderationStatus"`
		ModerationNote   string `json:"moderationNote"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if err := h.repo.AdminModerate(projectID, body.ModerationStatus, body.ModerationNote); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// --- helpers ---

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// LikeHandler gère POST /api/part/projects/{id}/like.
func (h *Handler) LikeHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID := int64(claims["userId"].(float64))

	path := strings.TrimSuffix(r.URL.Path, "/like")
	projectID, ok := parseID(path, "/api/part/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	isLiked, count, err := h.repo.ToggleLike(projectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if isLiked {
		h.notifyProjectEngagement(projectID, userID, "like")
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"isLiked":   isLiked,
		"likeCount": count,
	})
}

// BookmarkHandler gère POST /api/part/projects/{id}/bookmark.
func (h *Handler) BookmarkHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID := int64(claims["userId"].(float64))

	path := strings.TrimSuffix(r.URL.Path, "/bookmark")
	projectID, ok := parseID(path, "/api/part/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	isBookmarked, count, err := h.repo.ToggleBookmark(projectID, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if isBookmarked {
		h.notifyProjectEngagement(projectID, userID, "favorite")
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"isBookmarked":  isBookmarked,
		"bookmarkCount": count,
	})
}

// FavoritesHandler gère GET /api/part/projects/favorites.
func (h *Handler) FavoritesHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID := int64(claims["userId"].(float64))

	projects, err := h.repo.ParticulierListFavorites(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

// notifyProjectEngagement envoie une notification au propriétaire du projet.
func (h *Handler) notifyProjectEngagement(projectID, engagerID int64, engType string) {
	go func() {
		var authorID int64
		var title string
		err := h.repo.db.QueryRow(`SELECT pro_user_id, title FROM upcycling_projects WHERE id = $1`, projectID).Scan(&authorID, &title)
		if err != nil {
			fmt.Printf("notifyProjectEngagement error getting project: %v\n", err)
			return
		}
		if authorID == engagerID {
			fmt.Printf("notifyProjectEngagement: author is engager\n")
			return
		}

		// Check notification settings
		var enabled bool
		errSet := h.repo.db.QueryRow(`SELECT app_project_engagement FROM user_notification_settings WHERE user_id = $1`, authorID).Scan(&enabled)
		if errSet == nil && !enabled {
			fmt.Printf("notifyProjectEngagement: setting disabled for user %d\n", authorID)
			return
		}
		if errSet != nil {
			fmt.Printf("notifyProjectEngagement: setting not found, assuming enabled (%v)\n", errSet)
		}
		
		var fname, lname string
		errUser := h.repo.db.QueryRow(`SELECT firstname, lastname FROM users WHERE id = $1`, engagerID).Scan(&fname, &lname)
		if errUser != nil {
			fmt.Printf("notifyProjectEngagement error getting user: %v\n", errUser)
			return
		}

		engagerName := strings.TrimSpace(fname + " " + lname)
		
		var action string
		if engType == "like" {
			action = "aimé"
		} else {
			action = "ajouté aux favoris"
		}
		msg := fmt.Sprintf("%s a %s votre projet %q.", engagerName, action, title)
		
		errNotif := items.CreateNotification(context.Background(), h.repo.db, authorID, "Interaction sur votre projet", msg, "project_engagement")
		if errNotif != nil {
			fmt.Printf("notifyProjectEngagement error creating notif: %v\n", errNotif)
		} else {
			fmt.Printf("notifyProjectEngagement success: sent to %d for project %d\n", authorID, projectID)
		}
	}()
}

// EcologicalImpactDetailsHandler gère GET /api/projets/impact-details
func (h *Handler) EcologicalImpactDetailsHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	userIDVal, ok := claims["userId"].(float64)
	if !ok {
		writeError(w, http.StatusInternalServerError, "invalid user id in token")
		return
	}
	userID := int64(userIDVal)

	rows, err := h.repo.db.Query(`
		SELECT i.id, i.title, COALESCE(i.price, 0), COALESCE(il.stripe_amount_cents, 0)::float / 100.0,
		       COALESCE(i.weight_grams, 0) / 1000.0, COALESCE(i.material, 'Inconnu'), COALESCE(im.impact_coefficient, 1.0),
		       ((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1.0)) AS item_score,
		       p.title AS project_title, COALESCE(il.stripe_paid_at, il.updated_at)
		FROM upcycling_projects p
		JOIN upcycling_project_items upi ON upi.project_id = p.id
		JOIN items i ON i.id = upi.item_id
		JOIN item_logistics il ON il.item_id = i.id
		  AND il.workflow_status = 'picked_up'
		  AND (
		    il.reserved_by_user_id = $1
		    OR (
		      il.reserved_by_user_id IS NULL
		      AND EXISTS (
		        SELECT 1
		        FROM users umatch
		        WHERE umatch.id = $1
		          AND (
		            (TRIM(COALESCE(umatch.firstname, '') || ' ' || COALESCE(umatch.lastname, '')) <> ''
		             AND LOWER(TRIM(il.reserved_by_name)) = LOWER(TRIM(COALESCE(umatch.firstname, '') || ' ' || COALESCE(umatch.lastname, ''))))
		            OR
		            (TRIM(COALESCE(umatch.company_name, '')) <> ''
		             AND LOWER(TRIM(il.reserved_by_name)) = LOWER(TRIM(COALESCE(umatch.company_name, ''))))
		          )
		      )
		    )
		  )
		LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		WHERE p.pro_user_id = $1
		  AND p.status = 'publie'
		  AND p.moderation_status = 'approved'
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query impact details")
		return
	}
	defer rows.Close()

	type ImpactDetailRow struct {
		ItemID       int64   `json:"item_id"`
		ItemTitle    string  `json:"item_title"`
		Price        float64 `json:"price"`
		PaidAmount   float64 `json:"paid_amount"`
		WeightKg     float64 `json:"weight_kg"`
		Material     string  `json:"material"`
		Coefficient  float64 `json:"coefficient"`
		ItemScore    float64 `json:"item_score"`
		ProjectTitle string  `json:"project_title"`
		PaidAt       string  `json:"paid_at"`
	}

	var details []ImpactDetailRow
	for rows.Next() {
		var row ImpactDetailRow
		var paidAt time.Time
		if err := rows.Scan(&row.ItemID, &row.ItemTitle, &row.Price, &row.PaidAmount, &row.WeightKg, &row.Material, &row.Coefficient, &row.ItemScore, &row.ProjectTitle, &paidAt); err == nil {
			row.PaidAt = paidAt.Format(time.RFC3339)
			details = append(details, row)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"details": details})
}

// ToggleFeaturedHandler gère POST /api/pro/projects/{id}/featured.
func (h *Handler) ToggleFeaturedHandler(w http.ResponseWriter, r *http.Request) {
	proUserID, ok := h.getProUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Verify that user has premium_atelier subscription
	var subscriptionType string
	err := h.repo.db.QueryRowContext(r.Context(), "SELECT COALESCE(subscription_type, '') FROM users WHERE id = $1", proUserID).Scan(&subscriptionType)
	if err != nil || subscriptionType != "premium_atelier" {
		writeError(w, http.StatusForbidden, "Abonnement Premium Atelier requis pour mettre en avant un projet")
		return
	}

	// Parse project ID
	path := strings.TrimSuffix(r.URL.Path, "/featured")
	projectID, ok := parseID(path, "/api/pro/projects/")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	// Fetch project and verify ownership
	p, err := h.repo.GetByID(projectID, proUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}

	// Toggle is_featured
	newFeatured := !p.IsFeatured
	_, err = h.repo.db.ExecContext(r.Context(), "UPDATE upcycling_projects SET is_featured = $1 WHERE id = $2", newFeatured, projectID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update featured status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "isFeatured": newFeatured})
}

