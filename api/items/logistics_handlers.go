package items

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func RegisterLogisticsRoutes(mux *http.ServeMux, repo *Repository, authMiddleware func(http.Handler) http.Handler) {

	adminOnly := func(next http.HandlerFunc) http.Handler {
		return authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := r.Context().Value("authClaims").(jwt.MapClaims)
			if claims["role"] != "admin" {
				writeError(w, http.StatusForbidden, "admin only")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}


	// Helper to get admin user ID from request
	getAdminUserID := func(r *http.Request) int64 {
		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)
		var userID int64
		repo.db.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		return userID
	}

	// GET /api/admin/logistics — List all logistics entries
	mux.Handle("GET /api/admin/logistics", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		statusFilter := r.URL.Query().Get("status")
		items, err := repo.ListLogistics(r.Context(), statusFilter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list logistics")
			return
		}
		stats, _ := repo.GetLogisticsStats(r.Context())
		writeJSON(w, http.StatusOK, map[string]any{
			"items": items,
			"stats": stats,
		})
	}))

	// GET /api/admin/logistics/{item_id} — Get logistics detail for an item
	mux.Handle("GET /api/admin/logistics/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/logistics/")
		// Remove any trailing path segments
		if idx := strings.Index(idStr, "/"); idx != -1 {
			idStr = idStr[:idx]
		}
		itemID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid item id")
			return
		}
		l, err := repo.GetLogisticsByItemID(r.Context(), itemID)
		if err != nil {
			writeError(w, http.StatusNotFound, "logistics not found for this item")
			return
		}
		writeJSON(w, http.StatusOK, l)
	}))

	// POST /api/admin/logistics/{item_id}/assign — Assign deposit point + container
	mux.Handle("POST /api/admin/logistics/{item_id}/assign", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		var p AssignPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		adminID := getAdminUserID(r)
		if err := repo.AssignLogistics(r.Context(), itemID, p, adminID); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, l)
	}))

	// POST /api/admin/logistics/{item_id}/generate-deposit-code — Generate deposit code
	mux.Handle("POST /api/admin/logistics/{item_id}/generate-deposit-code", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		code, err := repo.GenerateDepositCode(r.Context(), itemID)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, map[string]any{
			"code":      code,
			"logistics": l,
		})
	}))

	// POST /api/admin/logistics/{item_id}/confirm-deposit — Admin confirms physical deposit
	mux.Handle("POST /api/admin/logistics/{item_id}/confirm-deposit", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		adminID := getAdminUserID(r)
		if err := repo.ConfirmDeposit(r.Context(), itemID, adminID); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, l)
	}))

	// POST /api/admin/logistics/{item_id}/make-available — Make item available
	mux.Handle("POST /api/admin/logistics/{item_id}/make-available", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		if err := repo.MakeAvailable(r.Context(), itemID); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, l)
	}))

	// POST /api/admin/logistics/{item_id}/reserve — Reserve item for a pro
	mux.Handle("POST /api/admin/logistics/{item_id}/reserve", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		var p ReservePayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if p.ReservedByName == "" {
			writeError(w, http.StatusBadRequest, "reserved_by_name is required")
			return
		}
		pickupCode, err := repo.ReserveItem(r.Context(), itemID, p)
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

	// POST /api/admin/logistics/{item_id}/confirm-pickup — Confirm pickup with code
	mux.Handle("POST /api/admin/logistics/{item_id}/confirm-pickup", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		var payload struct {
			Code string `json:"code"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		adminID := getAdminUserID(r)
		if err := repo.ConfirmPickup(r.Context(), itemID, payload.Code, adminID); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, l)
	}))

	// POST /api/admin/logistics/{item_id}/cancel — Cancel at any stage
	mux.Handle("POST /api/admin/logistics/{item_id}/cancel", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		itemID, _ := strconv.ParseInt(r.PathValue("item_id"), 10, 64)
		var p CancelPayload
		json.NewDecoder(r.Body).Decode(&p)
		if err := repo.CancelLogistics(r.Context(), itemID, p.Reason, p.RevertToStatus); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		l, _ := repo.GetLogisticsByItemID(r.Context(), itemID)
		writeJSON(w, http.StatusOK, l)
	}))

	// GET /api/my-items/{id}/logistics — User viewing their own item status
	mux.Handle("GET /api/my-items/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/my-items/")
		idStr = strings.TrimSuffix(idStr, "/logistics")
		itemID, _ := strconv.ParseInt(idStr, 10, 64)

		claims := r.Context().Value("authClaims").(jwt.MapClaims)
		email := claims["sub"].(string)

		// Verify ownership
		var ownerEmail string
		err := repo.db.QueryRow("SELECT u.email FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = $1", itemID).Scan(&ownerEmail)
		if err != nil || (ownerEmail != email && claims["role"] != "admin") {
			writeError(w, http.StatusForbidden, "unauthorized")
			return
		}

		l, err := repo.GetLogisticsByItemID(r.Context(), itemID)
		if err != nil {
			writeError(w, http.StatusNotFound, "logistics not found")
			return
		}
		writeJSON(w, http.StatusOK, l)
	})))
}
