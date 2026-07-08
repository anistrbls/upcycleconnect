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

	"golang.org/x/crypto/bcrypt"
	"upcycleconnect/api/projects"
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
		"id":          u.ID,
		"firstname":   u.Firstname,
		"lastname":    u.Lastname,
		"email":       u.Email,
		"role":        u.Role,
		"status":      u.Status,
		"adminNote":   u.AdminNote,
		"createdAt":   u.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":   u.UpdatedAt.UTC().Format(time.RFC3339),
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

