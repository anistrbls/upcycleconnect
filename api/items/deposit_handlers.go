package items

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func RegisterDepositRoutes(mux *http.ServeMux, repo *Repository, authMiddleware func(http.Handler) http.Handler) {
	// Admin only routes
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

	// GET /api/admin/deposit-points
	mux.Handle("GET /api/admin/deposit-points", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		points, err := repo.ListDepositPoints(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list deposit points")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"points": points})
	}))

	// POST /api/admin/deposit-points
	mux.Handle("POST /api/admin/deposit-points", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		var p DepositPoint
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if err := repo.CreateDepositPoint(r.Context(), &p); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create deposit point")
			return
		}
		writeJSON(w, http.StatusCreated, p)
	}))

	// GET /api/admin/deposit-points/{id}
	mux.Handle("GET /api/admin/deposit-points/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/deposit-points/")
		if strings.Contains(idStr, "/containers") {
			return // Let the other handler handle it
		}
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		point, err := repo.GetDepositPointByID(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusNotFound, "point not found")
			return
		}
		containers, _ := repo.ListContainersByPoint(r.Context(), id)
		point.Containers = containers
		writeJSON(w, http.StatusOK, point)
	}))

	// PATCH /api/admin/deposit-points/{id}
	mux.Handle("PATCH /api/admin/deposit-points/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/deposit-points/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}

		var payload DepositPoint
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		payload.ID = id
		if err := repo.UpdateDepositPoint(r.Context(), &payload); err != nil {
			writeError(w, http.StatusInternalServerError, "could not update point")
			return
		}
		writeJSON(w, http.StatusOK, payload)
	}))

	// DELETE /api/admin/deposit-points/{id}
	mux.Handle("DELETE /api/admin/deposit-points/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/deposit-points/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := repo.DeleteDepositPoint(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete point")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}))

	// Containers Management

	// GET /api/admin/deposit-points/{id}/containers
	mux.Handle("GET /api/admin/deposit-points/{id}/containers", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		containers, err := repo.ListContainersByPoint(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list containers")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"containers": containers})
	}))

	// POST /api/admin/deposit-points/{id}/containers
	mux.Handle("POST /api/admin/deposit-points/{id}/containers", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, _ := strconv.ParseInt(idStr, 10, 64)
		var c Container
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if c.Status == "maintenance" {
			if strings.TrimSpace(c.MaintenanceReason) == "" || c.MaintenanceStart == nil || c.MaintenanceEnd == nil {
				writeError(w, http.StatusBadRequest, "maintenance requires reason, start and end dates")
				return
			}
			if c.MaintenanceEnd.Before(*c.MaintenanceStart) {
				writeError(w, http.StatusBadRequest, "maintenance end must be after start")
				return
			}
		} else {
			c.MaintenanceReason = ""
			c.MaintenanceStart = nil
			c.MaintenanceEnd = nil
		}
		c.DepositPointID = id
		if err := repo.CreateContainer(r.Context(), &c); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create container")
			return
		}
		writeJSON(w, http.StatusCreated, c)
	}))

	// PATCH /api/admin/containers/{id}
	mux.Handle("PATCH /api/admin/containers/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/containers/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var c Container
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeError(w, http.StatusBadRequest, "invalid payload")
			return
		}
		if c.Status == "maintenance" {
			if strings.TrimSpace(c.MaintenanceReason) == "" || c.MaintenanceStart == nil || c.MaintenanceEnd == nil {
				writeError(w, http.StatusBadRequest, "maintenance requires reason, start and end dates")
				return
			}
			if c.MaintenanceEnd.Before(*c.MaintenanceStart) {
				writeError(w, http.StatusBadRequest, "maintenance end must be after start")
				return
			}
		}
		c.ID = id
		if err := repo.UpdateContainer(r.Context(), &c); err != nil {
			if errors.Is(err, ErrContainerStatusChangeBlocked) {
				writeError(w, http.StatusBadRequest, "cannot set container to inactif or maintenance while it contains objects")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update container")
			return
		}
		writeJSON(w, http.StatusOK, c)
	}))

	// DELETE /api/admin/containers/{id}
	mux.Handle("DELETE /api/admin/containers/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/api/admin/containers/")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := repo.DeleteContainer(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete container")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}))
}
