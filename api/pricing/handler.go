package pricing

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// Handler contient toutes les fonctions HTTP pour la tarification.
type Handler struct {
	repo *Repository
}

// NewHandler crée un nouveau Handler.
func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// ListHandler gère GET /api/admin/pricing
func (h *Handler) ListHandler(w http.ResponseWriter, r *http.Request) {
	rules, err := h.repo.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list pricing rules")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": rules, "total": len(rules)})
}

// CreateHandler gère POST /api/admin/pricing
func (h *Handler) CreateHandler(w http.ResponseWriter, r *http.Request) {
	var payload CreatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	payload.Label = strings.TrimSpace(payload.Label)
	if payload.Label == "" {
		writeError(w, http.StatusBadRequest, "label is required")
		return
	}
	if NormalizeType(payload.Type) == "" {
		writeError(w, http.StatusBadRequest, "invalid type (commission, subscription, promotion, flat_fee)")
		return
	}
	if payload.Amount < 0 {
		writeError(w, http.StatusBadRequest, "amount must be >= 0")
		return
	}

	rule, err := h.repo.Create(payload)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create pricing rule")
		return
	}
	writeJSON(w, http.StatusCreated, rule)
}

// UpdateHandler gère PUT /api/admin/pricing/:id
func (h *Handler) UpdateHandler(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r.URL.Path, "/api/admin/pricing/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid pricing rule id")
		return
	}

	var payload UpdatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	payload.Label = strings.TrimSpace(payload.Label)
	if payload.Label == "" {
		writeError(w, http.StatusBadRequest, "label is required")
		return
	}
	if NormalizeType(payload.Type) == "" {
		writeError(w, http.StatusBadRequest, "invalid type")
		return
	}
	if payload.Amount < 0 {
		writeError(w, http.StatusBadRequest, "amount must be >= 0")
		return
	}

	rule, err := h.repo.Update(id, payload)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "pricing rule not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update pricing rule")
		return
	}
	writeJSON(w, http.StatusOK, rule)
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
	id, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid id")
	}
	return id, nil
}
