package users

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"upcycleconnect/api/projects"

	"golang.org/x/crypto/bcrypt"
)

// Handler regroupe les handlers HTTP du module users.
// Il dépend uniquement du Repository — pas de variables globales.
type Handler struct {
	repo *Repository
}

// NewHandler crée un Handler avec le Repository fourni.
func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// ListHandler gère GET /api/admin/users
// Query params optionnels : q (recherche texte), role, status
func (h *Handler) ListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	filters := ListFilters{
		Query:  r.URL.Query().Get("q"),
		Role:   r.URL.Query().Get("role"),
		Status: r.URL.Query().Get("status"),
	}

	users, err := h.repo.List(filters)
	if err != nil {
		log.Printf("Error listing users with filters %+v: %v", filters, err)
		writeError(w, http.StatusInternalServerError, "could not list users")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": users})
}

// ByIDHandler gère GET, PUT, DELETE /api/admin/users/:id
func (h *Handler) ByIDHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path, "/api/admin/users/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	// On retire le suffixe /status s'il reste dans le path
	// (cette route est gérée par StatusHandler)
	suffix := strings.TrimPrefix(r.URL.Path, "/api/admin/users/"+strconv.FormatInt(id, 10))
	suffix = strings.Trim(suffix, "/")
	if suffix != "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getOne(w, id)
	case http.MethodPut:
		h.updateOne(w, r, id)
	case http.MethodDelete:
		h.deleteOne(w, id)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) getOne(w http.ResponseWriter, id int64) {
	u, err := h.repo.GetByID(id)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not fetch user")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) updateOne(w http.ResponseWriter, r *http.Request, id int64) {
	var p UpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if strings.TrimSpace(p.Firstname) == "" {
		writeError(w, http.StatusBadRequest, "firstname is required")
		return
	}
	if strings.TrimSpace(p.Lastname) == "" {
		writeError(w, http.StatusBadRequest, "lastname is required")
		return
	}
	if strings.TrimSpace(p.Email) == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}
	if NormalizeRole(p.Role) == "" {
		writeError(w, http.StatusBadRequest, "invalid role")
		return
	}
	if NormalizeStatus(p.Status) == "" {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	// Vérification unicité email (on exclut l'ID en cours de modification)
	exists, err := h.repo.EmailExists(p.Email, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check email")
		return
	}
	if exists {
		writeError(w, http.StatusConflict, "email already used by another user")
		return
	}

	// Validations conditionnelles par rôle
	if p.Role == RoleProfessionnel && strings.TrimSpace(p.Siret) == "" {
		writeError(w, http.StatusBadRequest, "le SIRET est obligatoire pour un professionnel")
		return
	}
	if p.Role == RoleProfessionnel && strings.TrimSpace(p.Siret) != "" {
		siretClean := strings.ReplaceAll(strings.TrimSpace(p.Siret), " ", "")
		if len(siretClean) != 14 {
			writeError(w, http.StatusBadRequest, "le SIRET doit contenir exactement 14 chiffres")
			return
		}
		for _, c := range siretClean {
			if c < '0' || c > '9' {
				writeError(w, http.StatusBadRequest, "le SIRET ne doit contenir que des chiffres")
				return
			}
		}
	}
	if p.Role == RoleSalarie && strings.TrimSpace(p.EmployeeRole) == "" {
		writeError(w, http.StatusBadRequest, "le type de rôle est obligatoire pour un salarié")
		return
	}
	if p.Role == RoleAdmin && strings.TrimSpace(p.AdminRole) == "" {
		writeError(w, http.StatusBadRequest, "le rôle admin est obligatoire pour un administrateur")
		return
	}

	u, err := h.repo.Update(id, p)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update user")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func (h *Handler) deleteOne(w http.ResponseWriter, id int64) {
	deleted, err := h.repo.Delete(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete user")
		return
	}
	if !deleted {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// CreateHandler gère POST /api/admin/users
func (h *Handler) CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var p CreatePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if strings.TrimSpace(p.Firstname) == "" {
		writeError(w, http.StatusBadRequest, "firstname is required")
		return
	}
	if strings.TrimSpace(p.Lastname) == "" {
		writeError(w, http.StatusBadRequest, "lastname is required")
		return
	}
	if strings.TrimSpace(p.Email) == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}
	if len(strings.TrimSpace(p.Password)) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	// Vérification unicité email (excludeID = 0 → aucun ID exclu)
	exists, err := h.repo.EmailExists(p.Email, 0)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check email")
		return
	}
	if exists {
		writeError(w, http.StatusConflict, "email already used")
		return
	}

	// Validations conditionnelles par rôle
	if p.Role == RoleProfessionnel && strings.TrimSpace(p.Siret) == "" {
		writeError(w, http.StatusBadRequest, "le SIRET est obligatoire pour un professionnel")
		return
	}
	if p.Role == RoleProfessionnel && strings.TrimSpace(p.Siret) != "" {
		siretClean := strings.ReplaceAll(strings.TrimSpace(p.Siret), " ", "")
		if len(siretClean) != 14 {
			writeError(w, http.StatusBadRequest, "le SIRET doit contenir exactement 14 chiffres")
			return
		}
		for _, c := range siretClean {
			if c < '0' || c > '9' {
				writeError(w, http.StatusBadRequest, "le SIRET ne doit contenir que des chiffres")
				return
			}
		}
	}
	if p.Role == RoleSalarie && strings.TrimSpace(p.EmployeeRole) == "" {
		writeError(w, http.StatusBadRequest, "le type de rôle est obligatoire pour un salarié")
		return
	}
	if p.Role == RoleAdmin && strings.TrimSpace(p.AdminRole) == "" {
		writeError(w, http.StatusBadRequest, "le rôle admin est obligatoire pour un administrateur")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	u, err := h.repo.Create(p, string(hash))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			writeError(w, http.StatusConflict, "email already used")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}
	writeJSON(w, http.StatusCreated, u)
}

// StatusHandler gère PATCH /api/admin/users/:id/status
func (h *Handler) StatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := parseID(r.URL.Path, "/api/admin/users/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var p StatusPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	status := NormalizeStatus(p.Status)
	if status == "" {
		writeError(w, http.StatusBadRequest, "invalid status (active | pending | suspended)")
		return
	}

	u, err := h.repo.SetStatus(id, status)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update status")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// ResetPasswordHandler gère POST /api/admin/users/:id/reset-password
func (h *Handler) ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	id, err := parseID(r.URL.Path, "/api/admin/users/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var p ResetPasswordPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if len(strings.TrimSpace(p.Password)) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	if err := h.repo.SetPassword(id, string(hash), p.DisconnectUser); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update password")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// GetProfileHandler gère GET /api/profile.
func (h *Handler) GetProfileHandler(w http.ResponseWriter, userID int64) {
	u, err := h.repo.GetByID(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not fetch profile")
		return
	}
	if u.Role == RoleProfessionnel {
		prepo := projects.NewRepository(h.repo.DB())
		score, err := prepo.GetProUCConnectScore(userID)
		if err != nil {
			log.Printf("GetProUCConnectScore: %v", err)
			z := 0.0
			u.UpcycleConnectScore = &z
		} else {
			u.UpcycleConnectScore = &score
		}
	}
	if u.Role == RoleParticulier {
		avg, cnt, err := h.repo.GetSellerRatingAggregate(userID)
		if err != nil {
			log.Printf("GetSellerRatingAggregate: %v", err)
		} else {
			u.SellerRatingAvg = avg
			u.SellerRatingCount = cnt
		}
	} else if u.Role == RoleProfessionnel {
		avg, cnt, err := h.repo.GetProRatingAggregate(userID)
		if err != nil {
			log.Printf("GetProRatingAggregate: %v", err)
		} else {
			// On utilise toujours SellerRatingAvg côté modèle/frontend pour la "note principale" affichée dans le profil
			u.SellerRatingAvg = avg
			u.SellerRatingCount = cnt
		}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"user": u})
}

// UpdateProfileHandler gère PUT /api/profile.
func (h *Handler) UpdateProfileHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var p UpdateProfilePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if strings.TrimSpace(p.Firstname) == "" || strings.TrimSpace(p.Lastname) == "" || strings.TrimSpace(p.Email) == "" {
		writeError(w, http.StatusBadRequest, "firstname, lastname and email are required")
		return
	}

	// Check email uniqueness
	exists, err := h.repo.EmailExists(p.Email, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check email")
		return
	}
	if exists {
		writeError(w, http.StatusConflict, "email already used")
		return
	}

	u, err := h.repo.UpdateProfile(userID, p)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update profile")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// UpdatePasswordHandler gère POST /api/profile/password.
func (h *Handler) UpdatePasswordHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var p UpdatePasswordPayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if len(strings.TrimSpace(p.NewPassword)) < 8 {
		writeError(w, http.StatusBadRequest, "new password must be at least 8 characters")
		return
	}

	// Verify old password
	currentHash, err := h.repo.GetPasswordHash(userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch current password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(p.OldPassword)); err != nil {
		writeError(w, http.StatusUnauthorized, "ancien mot de passe incorrect")
		return
	}

	// Hash new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(p.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash new password")
		return
	}

	// Update password and invalidate all sessions
	if err := h.repo.SetPassword(userID, string(newHash), true); err != nil {
		writeError(w, http.StatusInternalServerError, "could not set new password")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// --- helpers locaux ---

func parseID(path, prefix string) (int64, error) {
	// Extrait le premier segment après le prefix.
	// Ex: /api/admin/users/42/status → 42
	rest := strings.TrimPrefix(path, prefix)
	segment := strings.SplitN(rest, "/", 2)[0]
	id, err := strconv.ParseInt(segment, 10, 64)
	if err != nil || id <= 0 {
		return 0, err
	}
	return id, nil
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// userToMap sérialise un User en map pour les réponses JSON avec formatage de dates.
// Non utilisé directement (User implémente json.Marshaler via les tags),
// laissé ici comme documentation des champs exposés.
var _ = func(u User) map[string]interface{} {
	m := map[string]interface{}{
		"id":        u.ID,
		"firstname": u.Firstname,
		"lastname":  u.Lastname,
		"email":     u.Email,
		"role":      u.Role,
		"status":    u.Status,
		"adminNote": u.AdminNote,
		"createdAt": u.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt": u.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if u.LastLoginAt != nil {
		m["lastLoginAt"] = u.LastLoginAt.UTC().Format(time.RFC3339)
	} else {
		m["lastLoginAt"] = nil
	}
	return m
}

// ExportCSVHandler exports all pro user data as a CSV file.
func (h *Handler) ExportCSVHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	u, err := h.repo.GetByID(userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if u.Role != RoleProfessionnel || u.SubscriptionType != "premium_atelier" {
		writeError(w, http.StatusForbidden, "Premium Atelier subscription required")
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=export-donnees-upcycleconnect.csv")

	// Add UTF-8 BOM so Excel opens it correctly with accents in French
	_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})

	writer := csv.NewWriter(w)
	writer.Comma = ';'

	// 1. ENTREPRISE SECTION
	_ = writer.Write([]string{"--- INFORMATIONS ENTREPRISE ---"})
	_ = writer.Write([]string{"Nom de l'entreprise", "SIRET", "Email", "Téléphone", "Ville", "Adresse", "Code Postal", "Type d'activité", "Zone d'intervention", "Abonnement"})
	_ = writer.Write([]string{
		u.CompanyName,
		u.Siret,
		u.Email,
		u.Phone,
		u.City,
		u.Address,
		u.ZipCode,
		u.ActivityType,
		u.InterventionZone,
		u.SubscriptionType,
	})
	_ = writer.Write([]string{""}) // Empty row

	// 2. PROJETS SECTION
	_ = writer.Write([]string{"--- PROJETS D'UPCYCLING ---"})
	_ = writer.Write([]string{"ID Projet", "Titre", "Statut", "Statut de modération", "Date de création"})

	rowsP, errP := h.repo.DB().QueryContext(r.Context(), `
		SELECT id, title, status, moderation_status, created_at
		FROM upcycling_projects
		WHERE pro_user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if errP == nil {
		defer rowsP.Close()
		for rowsP.Next() {
			var pID int64
			var pTitle, pStatus, pModStatus string
			var pCreatedAt time.Time
			if err := rowsP.Scan(&pID, &pTitle, &pStatus, &pModStatus, &pCreatedAt); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(pID, 10),
					pTitle,
					pStatus,
					pModStatus,
					pCreatedAt.Format("2006-01-02 15:04"),
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 3. RECUPERATIONS (HISTORIQUE DE MATIÈRE) SECTION
	_ = writer.Write([]string{"--- HISTORIQUE DES RECUPERATIONS ---"})
	_ = writer.Write([]string{"ID Objet", "Titre", "Matériau", "Poids (kg)", "Prix initial (€)", "Statut logistique", "Date de récupération"})

	rowsL, errL := h.repo.DB().QueryContext(r.Context(), `
		SELECT il.item_id, i.title, COALESCE(i.material, ''), COALESCE(i.weight_grams, 0)/1000.0, i.price, il.workflow_status, COALESCE(il.picked_up_at, il.updated_at)
		FROM item_logistics il
		JOIN items i ON i.id = il.item_id
		WHERE il.reserved_by_user_id = $1 AND il.workflow_status = 'picked_up'
		ORDER BY il.picked_up_at DESC
	`, userID)
	if errL == nil {
		defer rowsL.Close()
		for rowsL.Next() {
			var itemID int64
			var title, material, workflowStatus string
			var weight, price float64
			var pickedUpAt time.Time
			if err := rowsL.Scan(&itemID, &title, &material, &weight, &price, &workflowStatus, &pickedUpAt); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(itemID, 10),
					title,
					material,
					fmt.Sprintf("%.2f", weight),
					fmt.Sprintf("%.2f", price),
					workflowStatus,
					pickedUpAt.Format("2006-01-02 15:04"),
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 4. HISTORIQUE PAIEMENTS & REMBOURSEMENTS OBGETS (LOGISTIQUE) SECTION
	_ = writer.Write([]string{"--- TRANSACTIONS & PAIEMENTS OBGETS ---"})
	_ = writer.Write([]string{"ID Objet", "Titre Objet", "Montant Payé (€)", "Statut Paiement", "Ref Stripe (PaymentIntent)", "Ref Stripe (Remboursement)", "Montant Remboursé (€)", "Statut Logistique"})

	rowsTrans, errTrans := h.repo.DB().QueryContext(r.Context(), `
		SELECT il.item_id, i.title, COALESCE(il.stripe_amount_cents, 0)/100.0, il.stripe_payment_status, il.stripe_payment_intent_id, il.stripe_refund_id, il.refund_amount, il.workflow_status
		FROM item_logistics il
		JOIN items i ON i.id = il.item_id
		WHERE il.reserved_by_user_id = $1 AND il.stripe_amount_cents > 0
		ORDER BY il.updated_at DESC
	`, userID)
	if errTrans == nil {
		defer rowsTrans.Close()
		for rowsTrans.Next() {
			var itemID int64
			var title, payStatus, piID, refundID, workflowStatus string
			var amount, refundAmt float64
			if err := rowsTrans.Scan(&itemID, &title, &amount, &payStatus, &piID, &refundID, &refundAmt, &workflowStatus); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(itemID, 10),
					title,
					fmt.Sprintf("%.2f", amount),
					payStatus,
					piID,
					refundID,
					fmt.Sprintf("%.2f", refundAmt),
					workflowStatus,
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 5. COMPTE FINANCIER & PRESTATIONS (SERVICES) SECTION
	_ = writer.Write([]string{"--- PRESTATIONS ET ATELIERS PROFESSIONNELS ---"})
	_ = writer.Write([]string{"ID Réservation", "Service", "Montant Payé (€)", "Statut Réservation", "Statut Paiement", "Montant Remboursé (€)", "Date de commande"})

	rowsS, errS := h.repo.DB().QueryContext(r.Context(), `
		SELECT sb.id, s.name, sb.amount, sb.status, sb.payment_status, sb.refund_amount, sb.created_at
		FROM service_bookings sb
		JOIN services s ON s.id = sb.service_id
		WHERE sb.user_id = $1
		ORDER BY sb.created_at DESC
	`, userID)
	if errS == nil {
		defer rowsS.Close()
		for rowsS.Next() {
			var bID int64
			var sName, bStatus, bPayStatus string
			var bAmount, refundAmt float64
			var bCreatedAt time.Time
			if err := rowsS.Scan(&bID, &sName, &bAmount, &bStatus, &bPayStatus, &refundAmt, &bCreatedAt); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(bID, 10),
					sName,
					fmt.Sprintf("%.2f", bAmount),
					bStatus,
					bPayStatus,
					fmt.Sprintf("%.2f", refundAmt),
					bCreatedAt.Format("2006-01-02 15:04"),
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 6. EVENEMENTS INSCRIRE SECTION
	_ = writer.Write([]string{"--- INSCRIPTIONS AUX ÉVÉNEMENTS ---"})
	_ = writer.Write([]string{"ID Inscription", "Événement", "Prix Événement (€)", "Statut Paiement", "Statut Inscription", "Montant Remboursé (€)", "Date d'inscription"})

	rowsE, errE := h.repo.DB().QueryContext(r.Context(), `
		SELECT er.id, e.name, e.price, er.payment_status, er.status, er.refund_amount, er.created_at
		FROM event_registrations er
		JOIN events e ON e.id = er.event_id
		WHERE er.user_id = $1
		ORDER BY er.created_at DESC
	`, userID)
	if errE == nil {
		defer rowsE.Close()
		for rowsE.Next() {
			var rID int64
			var eName, ePayStatus, eStatus string
			var price, refundAmt float64
			var eCreatedAt time.Time
			if err := rowsE.Scan(&rID, &eName, &price, &ePayStatus, &eStatus, &refundAmt, &eCreatedAt); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(rID, 10),
					eName,
					fmt.Sprintf("%.2f", price),
					ePayStatus,
					eStatus,
					fmt.Sprintf("%.2f", refundAmt),
					eCreatedAt.Format("2006-01-02 15:04"),
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 7. WATCHLIST SECTION
	_ = writer.Write([]string{"--- WATCHLIST (FAVORIS) ---"})
	_ = writer.Write([]string{"ID Objet", "Titre", "Prix (€)"})

	rowsW, errW := h.repo.DB().QueryContext(r.Context(), `
		SELECT w.item_id, i.title, i.price
		FROM professional_item_watchlist w
		JOIN items i ON i.id = w.item_id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if errW == nil {
		defer rowsW.Close()
		for rowsW.Next() {
			var itemID int64
			var title string
			var price float64
			if err := rowsW.Scan(&itemID, &title, &price); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(itemID, 10),
					title,
					fmt.Sprintf("%.2f", price),
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 8. MESSAGES ET SUJETS DU FORUM
	_ = writer.Write([]string{"--- ACTIVITÉ FORUM (SUJETS CRÉÉS) ---"})
	_ = writer.Write([]string{"ID Sujet", "Titre du Sujet", "Statut", "Date de création"})

	rowsFT, errFT := h.repo.DB().QueryContext(r.Context(), `
		SELECT id, title, status, created_at
		FROM forum_topics
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if errFT == nil {
		defer rowsFT.Close()
		for rowsFT.Next() {
			var tID int64
			var tTitle, tStatus string
			var tCreatedAt time.Time
			if err := rowsFT.Scan(&tID, &tTitle, &tStatus, &tCreatedAt); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(tID, 10),
					tTitle,
					tStatus,
					tCreatedAt.Format("2006-01-02 15:04"),
				})
			}
		}
	}

	_ = writer.Write([]string{""}) // Empty row
	_ = writer.Write([]string{"--- ACTIVITÉ FORUM (RÉPONSES POSTÉES) ---"})
	_ = writer.Write([]string{"ID Réponse", "Sujet Concerné", "Contenu de la Réponse", "Statut", "Date"})

	rowsFR, errFR := h.repo.DB().QueryContext(r.Context(), `
		SELECT r.id, t.title, r.content, r.status, r.created_at
		FROM forum_replies r
		JOIN forum_topics t ON t.id = r.topic_id
		WHERE r.user_id = $1
		ORDER BY r.created_at DESC
	`, userID)
	if errFR == nil {
		defer rowsFR.Close()
		for rowsFR.Next() {
			var rID int64
			var tTitle, rContent, rStatus string
			var rCreatedAt time.Time
			if err := rowsFR.Scan(&rID, &tTitle, &rContent, &rStatus, &rCreatedAt); err == nil {
				// Strip long reply content to make it CSV friendly
				shortContent := rContent
				if len(shortContent) > 60 {
					shortContent = shortContent[:57] + "..."
				}
				_ = writer.Write([]string{
					strconv.FormatInt(rID, 10),
					tTitle,
					shortContent,
					rStatus,
					rCreatedAt.Format("2006-01-02 15:04"),
				})
			}
		}
	}
	_ = writer.Write([]string{""}) // Empty row

	// 9. ARTICLES ET CONSEILS AIMÉS
	_ = writer.Write([]string{"--- CONSEILS ET ASTUCES LIKÉS ---"})
	_ = writer.Write([]string{"ID Conseil", "Titre du Conseil", "Catégorie"})

	rowsCL, errCL := h.repo.DB().QueryContext(r.Context(), `
		SELECT c.id, c.title, c.category
		FROM conseil_likes l
		JOIN salarie_contents c ON c.id = l.content_id
		WHERE l.user_id = $1 AND c.type = 'conseil'
		ORDER BY c.created_at DESC
	`, userID)
	if errCL == nil {
		defer rowsCL.Close()
		for rowsCL.Next() {
			var cID int64
			var cTitle, cCategory string
			if err := rowsCL.Scan(&cID, &cTitle, &cCategory); err == nil {
				_ = writer.Write([]string{
					strconv.FormatInt(cID, 10),
					cTitle,
					cCategory,
				})
			}
		}
	}

	writer.Flush()
}

// ─────────────────────────────────────────────────────────────────────────────
// Préférences de notification utilisateur
// ─────────────────────────────────────────────────────────────────────────────

// NotificationSettings contient toutes les préférences de notification et d'affichage d'un utilisateur.
// Les clés JSON correspondent exactement à ce qu'attend le frontend.
type NotificationSettings struct {
	AppEnabled        bool   `json:"appEnabled"`
	EmailEnabled      bool   `json:"emailEnabled"`
	DisplayMode       string `json:"displayMode"`
	Language          string `json:"language"`
	MapType           string `json:"mapType"`
	ShowPhonePublicly bool   `json:"showPhonePublicly"`
	ShowEmailPublicly bool   `json:"showEmailPublicly"`

	AppModeration                   bool `json:"app_moderation"`
	EmailModeration                 bool `json:"email_moderation"`
	AppBookingReceived              bool `json:"app_booking_received"`
	EmailBookingReceived            bool `json:"email_booking_received"`
	AppPointAssigned                bool `json:"app_point_assigned"`
	EmailPointAssigned              bool `json:"email_point_assigned"`
	AppMaterialDeposited            bool `json:"app_material_deposited"`
	EmailMaterialDeposited          bool `json:"email_material_deposited"`
	AppMaterialRecovered            bool `json:"app_material_recovered"`
	EmailMaterialRecovered          bool `json:"email_material_recovered"`
	AppRatingReceived               bool `json:"app_rating_received"`
	EmailRatingReceived             bool `json:"email_rating_received"`
	AppBookingCancelled             bool `json:"app_booking_cancelled"`
	EmailBookingCancelled           bool `json:"email_booking_cancelled"`
	AppBookingExpired               bool `json:"app_booking_expired"`
	EmailBookingExpired             bool `json:"email_booking_expired"`
	AppDepositReminder              bool `json:"app_deposit_reminder"`
	EmailDepositReminder            bool `json:"email_deposit_reminder"`
	AppBookingConfirmed             bool `json:"app_booking_confirmed"`
	EmailBookingConfirmed           bool `json:"email_booking_confirmed"`
	AppBookingRequestReceived       bool `json:"app_booking_request_received"`
	EmailBookingRequestReceived     bool `json:"email_booking_request_received"`
	AppPrestationBookingCancelled   bool `json:"app_prestation_booking_cancelled"`
	EmailPrestationBookingCancelled bool `json:"email_prestation_booking_cancelled"`
	AppServiceReminder              bool `json:"app_service_reminder"`
	EmailServiceReminder            bool `json:"email_service_reminder"`
	AppServiceCompleted             bool `json:"app_service_completed"`
	EmailServiceCompleted           bool `json:"email_service_completed"`
	AppEventRegistration            bool `json:"app_event_registration"`
	EmailEventRegistration          bool `json:"email_event_registration"`
	AppEventCancellation            bool `json:"app_event_cancellation"`
	EmailEventCancellation          bool `json:"email_event_cancellation"`
	AppEventReminder                bool `json:"app_event_reminder"`
	EmailEventReminder              bool `json:"email_event_reminder"`
	AppEventModeration              bool `json:"app_event_moderation"`
	EmailEventModeration            bool `json:"email_event_moderation"`
	AppForumNewReply                bool `json:"app_forum_new_reply"`
	EmailForumNewReply              bool `json:"email_forum_new_reply"`
	AppForumMention                 bool `json:"app_forum_mention"`
	EmailForumMention               bool `json:"email_forum_mention"`
	AppForumModeration              bool `json:"app_forum_moderation"`
	EmailForumModeration            bool `json:"email_forum_moderation"`
	AppAdminForumReport             bool `json:"app_admin_forum_report"`
	EmailAdminForumReport           bool `json:"email_admin_forum_report"`
	AppFinancePaymentConfirmed      bool `json:"app_finance_payment_confirmed"`
	EmailFinancePaymentConfirmed    bool `json:"email_finance_payment_confirmed"`
	AppFinancePaymentReceived       bool `json:"app_finance_payment_received"`
	EmailFinancePaymentReceived     bool `json:"email_finance_payment_received"`
	AppFinancePaymentFailed         bool `json:"app_finance_payment_failed"`
	EmailFinancePaymentFailed       bool `json:"email_finance_payment_failed"`
	AppFinanceRefundIssued          bool `json:"app_finance_refund_issued"`
	EmailFinanceRefundIssued        bool `json:"email_finance_refund_issued"`
	AppFinanceSubscriptionActive    bool `json:"app_finance_subscription_active"`
	EmailFinanceSubscriptionActive  bool `json:"email_finance_subscription_active"`
	AppMaterialAlerts               bool `json:"app_material_alerts"`
	EmailMaterialAlerts             bool `json:"email_material_alerts"`
	AppConseilModeration            bool `json:"app_conseil_moderation"`
	EmailConseilModeration          bool `json:"email_conseil_moderation"`
	AppNewConseil                   bool `json:"app_new_conseil"`
	EmailNewConseil                 bool `json:"email_new_conseil"`
	AppConseilEngagement            bool `json:"app_conseil_engagement"`
	EmailConseilEngagement          bool `json:"email_conseil_engagement"`
	AppAdminNewConseil              bool `json:"app_admin_new_conseil"`
	EmailAdminNewConseil            bool `json:"email_admin_new_conseil"`
	AppProjectEngagement            bool `json:"app_project_engagement"`
	EmailProjectEngagement          bool `json:"email_project_engagement"`
	AppNewMessageReceived           bool `json:"app_new_message_received"`
	EmailNewMessageReceived         bool `json:"email_new_message_received"`
}

// defaultNotificationSettings retourne les préférences par défaut (tout activé).
func defaultNotificationSettings() NotificationSettings {
	return NotificationSettings{
		AppEnabled: true, EmailEnabled: true,
		DisplayMode: "light", Language: "fr", MapType: "plan",
		AppModeration: true, EmailModeration: true,
		AppBookingReceived: true, EmailBookingReceived: true,
		AppPointAssigned: true, EmailPointAssigned: true,
		AppMaterialDeposited: true, EmailMaterialDeposited: true,
		AppMaterialRecovered: true, EmailMaterialRecovered: true,
		AppRatingReceived: true, EmailRatingReceived: true,
		AppBookingCancelled: true, EmailBookingCancelled: true,
		AppBookingExpired: true, EmailBookingExpired: true,
		AppDepositReminder: true, EmailDepositReminder: true,
		AppBookingConfirmed: true, EmailBookingConfirmed: true,
		AppBookingRequestReceived: true, EmailBookingRequestReceived: true,
		AppPrestationBookingCancelled: true, EmailPrestationBookingCancelled: true,
		AppServiceReminder: true, EmailServiceReminder: true,
		AppServiceCompleted: true, EmailServiceCompleted: true,
		AppEventRegistration: true, EmailEventRegistration: true,
		AppEventCancellation: true, EmailEventCancellation: true,
		AppEventReminder: true, EmailEventReminder: true,
		AppEventModeration: true, EmailEventModeration: true,
		AppForumNewReply: true, EmailForumNewReply: true,
		AppForumMention: true, EmailForumMention: true,
		AppForumModeration: true, EmailForumModeration: true,
		AppAdminForumReport: true, EmailAdminForumReport: true,
		AppFinancePaymentConfirmed: true, EmailFinancePaymentConfirmed: true,
		AppFinancePaymentReceived: true, EmailFinancePaymentReceived: true,
		AppFinancePaymentFailed: true, EmailFinancePaymentFailed: true,
		AppFinanceRefundIssued: true, EmailFinanceRefundIssued: true,
		AppFinanceSubscriptionActive: true, EmailFinanceSubscriptionActive: true,
		AppMaterialAlerts: true, EmailMaterialAlerts: true,
		AppConseilModeration: true, EmailConseilModeration: true,
		AppNewConseil: true, EmailNewConseil: true,
		AppConseilEngagement: true, EmailConseilEngagement: true,
		AppAdminNewConseil: true, EmailAdminNewConseil: true,
		AppProjectEngagement: true, EmailProjectEngagement: true,
		AppNewMessageReceived: true, EmailNewMessageReceived: true,
	}
}

// GetNotificationSettingsHandler gère GET /api/user/notification-settings
func (h *Handler) GetNotificationSettingsHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	s := defaultNotificationSettings()
	err := h.repo.DB().QueryRowContext(r.Context(), `
		SELECT
			app_enabled, email_enabled, display_mode, language, map_type, show_phone_publicly, show_email_publicly,
			app_moderation, email_moderation,
			app_booking_received, email_booking_received,
			app_point_assigned, email_point_assigned,
			app_material_deposited, email_material_deposited,
			app_material_recovered, email_material_recovered,
			app_rating_received, email_rating_received,
			app_booking_cancelled, email_booking_cancelled,
			app_booking_expired, email_booking_expired,
			app_deposit_reminder, email_deposit_reminder,
			app_booking_confirmed, email_booking_confirmed,
			app_booking_request_received, email_booking_request_received,
			app_prestation_booking_cancelled, email_prestation_booking_cancelled,
			app_service_reminder, email_service_reminder,
			app_service_completed, email_service_completed,
			app_event_registration, email_event_registration,
			app_event_cancellation, email_event_cancellation,
			app_event_reminder, email_event_reminder,
			app_event_moderation, email_event_moderation,
			app_forum_new_reply, email_forum_new_reply,
			app_forum_mention, email_forum_mention,
			app_forum_moderation, email_forum_moderation,
			app_admin_forum_report, email_admin_forum_report,
			app_finance_payment_confirmed, email_finance_payment_confirmed,
			app_finance_payment_received, email_finance_payment_received,
			app_finance_payment_failed, email_finance_payment_failed,
			app_finance_refund_issued, email_finance_refund_issued,
			app_finance_subscription_active, email_finance_subscription_active,
			app_material_alerts, email_material_alerts,
			app_conseil_moderation, email_conseil_moderation,
			app_new_conseil, email_new_conseil,
			app_conseil_engagement, email_conseil_engagement,
			app_admin_new_conseil, email_admin_new_conseil,
			app_project_engagement, email_project_engagement,
			app_new_message_received, email_new_message_received
		FROM user_notification_settings WHERE user_id = $1
	`, userID).Scan(
		&s.AppEnabled, &s.EmailEnabled, &s.DisplayMode, &s.Language, &s.MapType, &s.ShowPhonePublicly, &s.ShowEmailPublicly,
		&s.AppModeration, &s.EmailModeration,
		&s.AppBookingReceived, &s.EmailBookingReceived,
		&s.AppPointAssigned, &s.EmailPointAssigned,
		&s.AppMaterialDeposited, &s.EmailMaterialDeposited,
		&s.AppMaterialRecovered, &s.EmailMaterialRecovered,
		&s.AppRatingReceived, &s.EmailRatingReceived,
		&s.AppBookingCancelled, &s.EmailBookingCancelled,
		&s.AppBookingExpired, &s.EmailBookingExpired,
		&s.AppDepositReminder, &s.EmailDepositReminder,
		&s.AppBookingConfirmed, &s.EmailBookingConfirmed,
		&s.AppBookingRequestReceived, &s.EmailBookingRequestReceived,
		&s.AppPrestationBookingCancelled, &s.EmailPrestationBookingCancelled,
		&s.AppServiceReminder, &s.EmailServiceReminder,
		&s.AppServiceCompleted, &s.EmailServiceCompleted,
		&s.AppEventRegistration, &s.EmailEventRegistration,
		&s.AppEventCancellation, &s.EmailEventCancellation,
		&s.AppEventReminder, &s.EmailEventReminder,
		&s.AppEventModeration, &s.EmailEventModeration,
		&s.AppForumNewReply, &s.EmailForumNewReply,
		&s.AppForumMention, &s.EmailForumMention,
		&s.AppForumModeration, &s.EmailForumModeration,
		&s.AppAdminForumReport, &s.EmailAdminForumReport,
		&s.AppFinancePaymentConfirmed, &s.EmailFinancePaymentConfirmed,
		&s.AppFinancePaymentReceived, &s.EmailFinancePaymentReceived,
		&s.AppFinancePaymentFailed, &s.EmailFinancePaymentFailed,
		&s.AppFinanceRefundIssued, &s.EmailFinanceRefundIssued,
		&s.AppFinanceSubscriptionActive, &s.EmailFinanceSubscriptionActive,
		&s.AppMaterialAlerts, &s.EmailMaterialAlerts,
		&s.AppConseilModeration, &s.EmailConseilModeration,
		&s.AppNewConseil, &s.EmailNewConseil,
		&s.AppConseilEngagement, &s.EmailConseilEngagement,
		&s.AppAdminNewConseil, &s.EmailAdminNewConseil,
		&s.AppProjectEngagement, &s.EmailProjectEngagement,
		&s.AppNewMessageReceived, &s.EmailNewMessageReceived,
	)
	if err != nil && err != sql.ErrNoRows {
		log.Printf("[notification-settings] GET user %d: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "could not load settings")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// PutNotificationSettingsHandler gère PUT /api/user/notification-settings
func (h *Handler) PutNotificationSettingsHandler(w http.ResponseWriter, r *http.Request, userID int64) {
	var p NotificationSettings
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if p.DisplayMode == "" {
		p.DisplayMode = "light"
	}
	if p.Language == "" {
		p.Language = "fr"
	}
	if p.MapType == "" {
		p.MapType = "plan"
	}

	_, err := h.repo.DB().ExecContext(r.Context(), `
		INSERT INTO user_notification_settings (
			user_id, app_enabled, email_enabled, display_mode, language, map_type, show_phone_publicly, show_email_publicly,
			app_moderation, email_moderation,
			app_booking_received, email_booking_received,
			app_point_assigned, email_point_assigned,
			app_material_deposited, email_material_deposited,
			app_material_recovered, email_material_recovered,
			app_rating_received, email_rating_received,
			app_booking_cancelled, email_booking_cancelled,
			app_booking_expired, email_booking_expired,
			app_deposit_reminder, email_deposit_reminder,
			app_booking_confirmed, email_booking_confirmed,
			app_booking_request_received, email_booking_request_received,
			app_prestation_booking_cancelled, email_prestation_booking_cancelled,
			app_service_reminder, email_service_reminder,
			app_service_completed, email_service_completed,
			app_event_registration, email_event_registration,
			app_event_cancellation, email_event_cancellation,
			app_event_reminder, email_event_reminder,
			app_event_moderation, email_event_moderation,
			app_forum_new_reply, email_forum_new_reply,
			app_forum_mention, email_forum_mention,
			app_forum_moderation, email_forum_moderation,
			app_admin_forum_report, email_admin_forum_report,
			app_finance_payment_confirmed, email_finance_payment_confirmed,
			app_finance_payment_received, email_finance_payment_received,
			app_finance_payment_failed, email_finance_payment_failed,
			app_finance_refund_issued, email_finance_refund_issued,
			app_finance_subscription_active, email_finance_subscription_active,
			app_material_alerts, email_material_alerts,
			app_conseil_moderation, email_conseil_moderation,
			app_new_conseil, email_new_conseil,
			app_conseil_engagement, email_conseil_engagement,
			app_admin_new_conseil, email_admin_new_conseil,
			app_project_engagement, email_project_engagement,
			app_new_message_received, email_new_message_received
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,
			$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
			$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,
			$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,$61,$62,
			$63,$64,$65,$66,$67,$68,$69,$70,$71,$72,$73,$74,$75,$76
		)
		ON CONFLICT (user_id) DO UPDATE SET
			app_enabled = EXCLUDED.app_enabled,
			email_enabled = EXCLUDED.email_enabled,
			display_mode = EXCLUDED.display_mode,
			language = EXCLUDED.language,
			map_type = EXCLUDED.map_type,
			show_phone_publicly = EXCLUDED.show_phone_publicly,
			show_email_publicly = EXCLUDED.show_email_publicly,
			app_moderation = EXCLUDED.app_moderation,
			email_moderation = EXCLUDED.email_moderation,
			app_booking_received = EXCLUDED.app_booking_received,
			email_booking_received = EXCLUDED.email_booking_received,
			app_point_assigned = EXCLUDED.app_point_assigned,
			email_point_assigned = EXCLUDED.email_point_assigned,
			app_material_deposited = EXCLUDED.app_material_deposited,
			email_material_deposited = EXCLUDED.email_material_deposited,
			app_material_recovered = EXCLUDED.app_material_recovered,
			email_material_recovered = EXCLUDED.email_material_recovered,
			app_rating_received = EXCLUDED.app_rating_received,
			email_rating_received = EXCLUDED.email_rating_received,
			app_booking_cancelled = EXCLUDED.app_booking_cancelled,
			email_booking_cancelled = EXCLUDED.email_booking_cancelled,
			app_booking_expired = EXCLUDED.app_booking_expired,
			email_booking_expired = EXCLUDED.email_booking_expired,
			app_deposit_reminder = EXCLUDED.app_deposit_reminder,
			email_deposit_reminder = EXCLUDED.email_deposit_reminder,
			app_booking_confirmed = EXCLUDED.app_booking_confirmed,
			email_booking_confirmed = EXCLUDED.email_booking_confirmed,
			app_booking_request_received = EXCLUDED.app_booking_request_received,
			email_booking_request_received = EXCLUDED.email_booking_request_received,
			app_prestation_booking_cancelled = EXCLUDED.app_prestation_booking_cancelled,
			email_prestation_booking_cancelled = EXCLUDED.email_prestation_booking_cancelled,
			app_service_reminder = EXCLUDED.app_service_reminder,
			email_service_reminder = EXCLUDED.email_service_reminder,
			app_service_completed = EXCLUDED.app_service_completed,
			email_service_completed = EXCLUDED.email_service_completed,
			app_event_registration = EXCLUDED.app_event_registration,
			email_event_registration = EXCLUDED.email_event_registration,
			app_event_cancellation = EXCLUDED.app_event_cancellation,
			email_event_cancellation = EXCLUDED.email_event_cancellation,
			app_event_reminder = EXCLUDED.app_event_reminder,
			email_event_reminder = EXCLUDED.email_event_reminder,
			app_event_moderation = EXCLUDED.app_event_moderation,
			email_event_moderation = EXCLUDED.email_event_moderation,
			app_forum_new_reply = EXCLUDED.app_forum_new_reply,
			email_forum_new_reply = EXCLUDED.email_forum_new_reply,
			app_forum_mention = EXCLUDED.app_forum_mention,
			email_forum_mention = EXCLUDED.email_forum_mention,
			app_forum_moderation = EXCLUDED.app_forum_moderation,
			email_forum_moderation = EXCLUDED.email_forum_moderation,
			app_admin_forum_report = EXCLUDED.app_admin_forum_report,
			email_admin_forum_report = EXCLUDED.email_admin_forum_report,
			app_finance_payment_confirmed = EXCLUDED.app_finance_payment_confirmed,
			email_finance_payment_confirmed = EXCLUDED.email_finance_payment_confirmed,
			app_finance_payment_received = EXCLUDED.app_finance_payment_received,
			email_finance_payment_received = EXCLUDED.email_finance_payment_received,
			app_finance_payment_failed = EXCLUDED.app_finance_payment_failed,
			email_finance_payment_failed = EXCLUDED.email_finance_payment_failed,
			app_finance_refund_issued = EXCLUDED.app_finance_refund_issued,
			email_finance_refund_issued = EXCLUDED.email_finance_refund_issued,
			app_finance_subscription_active = EXCLUDED.app_finance_subscription_active,
			email_finance_subscription_active = EXCLUDED.email_finance_subscription_active,
			app_material_alerts = EXCLUDED.app_material_alerts,
			email_material_alerts = EXCLUDED.email_material_alerts,
			app_conseil_moderation = EXCLUDED.app_conseil_moderation,
			email_conseil_moderation = EXCLUDED.email_conseil_moderation,
			app_new_conseil = EXCLUDED.app_new_conseil,
			email_new_conseil = EXCLUDED.email_new_conseil,
			app_conseil_engagement = EXCLUDED.app_conseil_engagement,
			email_conseil_engagement = EXCLUDED.email_conseil_engagement,
			app_admin_new_conseil = EXCLUDED.app_admin_new_conseil,
			email_admin_new_conseil = EXCLUDED.email_admin_new_conseil,
			app_project_engagement = EXCLUDED.app_project_engagement,
			email_project_engagement = EXCLUDED.email_project_engagement,
			app_new_message_received = EXCLUDED.app_new_message_received,
			email_new_message_received = EXCLUDED.email_new_message_received
	`,
		userID, p.AppEnabled, p.EmailEnabled, p.DisplayMode, p.Language, p.MapType, p.ShowPhonePublicly, p.ShowEmailPublicly,
		p.AppModeration, p.EmailModeration,
		p.AppBookingReceived, p.EmailBookingReceived,
		p.AppPointAssigned, p.EmailPointAssigned,
		p.AppMaterialDeposited, p.EmailMaterialDeposited,
		p.AppMaterialRecovered, p.EmailMaterialRecovered,
		p.AppRatingReceived, p.EmailRatingReceived,
		p.AppBookingCancelled, p.EmailBookingCancelled,
		p.AppBookingExpired, p.EmailBookingExpired,
		p.AppDepositReminder, p.EmailDepositReminder,
		p.AppBookingConfirmed, p.EmailBookingConfirmed,
		p.AppBookingRequestReceived, p.EmailBookingRequestReceived,
		p.AppPrestationBookingCancelled, p.EmailPrestationBookingCancelled,
		p.AppServiceReminder, p.EmailServiceReminder,
		p.AppServiceCompleted, p.EmailServiceCompleted,
		p.AppEventRegistration, p.EmailEventRegistration,
		p.AppEventCancellation, p.EmailEventCancellation,
		p.AppEventReminder, p.EmailEventReminder,
		p.AppEventModeration, p.EmailEventModeration,
		p.AppForumNewReply, p.EmailForumNewReply,
		p.AppForumMention, p.EmailForumMention,
		p.AppForumModeration, p.EmailForumModeration,
		p.AppAdminForumReport, p.EmailAdminForumReport,
		p.AppFinancePaymentConfirmed, p.EmailFinancePaymentConfirmed,
		p.AppFinancePaymentReceived, p.EmailFinancePaymentReceived,
		p.AppFinancePaymentFailed, p.EmailFinancePaymentFailed,
		p.AppFinanceRefundIssued, p.EmailFinanceRefundIssued,
		p.AppFinanceSubscriptionActive, p.EmailFinanceSubscriptionActive,
		p.AppMaterialAlerts, p.EmailMaterialAlerts,
		p.AppConseilModeration, p.EmailConseilModeration,
		p.AppNewConseil, p.EmailNewConseil,
		p.AppConseilEngagement, p.EmailConseilEngagement,
		p.AppAdminNewConseil, p.EmailAdminNewConseil,
		p.AppProjectEngagement, p.EmailProjectEngagement,
		p.AppNewMessageReceived, p.EmailNewMessageReceived,
	)
	if err != nil {
		log.Printf("[notification-settings] PUT user %d: %v", userID, err)
		writeError(w, http.StatusInternalServerError, "could not save settings")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
