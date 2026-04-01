package users

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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
