package users

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func claimsRole(claims jwt.MapClaims) string {
	role, _ := claims["role"].(string)
	return strings.TrimSpace(strings.ToLower(role))
}

func claimsEmployeeRole(claims jwt.MapClaims) string {
	employeeRole, _ := claims["employeeRole"].(string)
	return strings.TrimSpace(strings.ToLower(employeeRole))
}

func claimsIsAdmin(claims jwt.MapClaims) bool {
	return claimsRole(claims) == "admin"
}

func claimsCanModerateUsers(claims jwt.MapClaims) bool {
	return claimsIsAdmin(claims) || (claimsRole(claims) == "salarie" && claimsEmployeeRole(claims) == "moderateur")
}

func ensureModeratorCanAccessProfessional(repo *Repository, userID int64) (bool, error) {
	u, err := repo.GetByID(userID)
	if err != nil {
		return false, err
	}
	return u.Role == RoleProfessionnel, nil
}

// RegisterRoutes enregistre toutes les routes du module users dans le mux fourni.
// authMiddleware est la fonction du package main — on la reçoit en paramètre
// pour ne pas créer de dépendance circulaire.
func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	h := NewHandler(repo)

	// Création du schéma au démarrage
	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Users schema initialization error: %v", err)
	}
	log.Println("✓ Users schema initialized")

	// Liste + création
	mux.Handle("/api/admin/users", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, _ := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsCanModerateUsers(claims) {
			writeError(w, http.StatusForbidden, "moderator only")
			return
		}
		switch r.Method {
		case http.MethodGet:
			if !claimsIsAdmin(claims) {
				query := r.URL.Query()
				query.Set("role", RoleProfessionnel)
				r.URL.RawQuery = query.Encode()
			}
			h.ListHandler(w, r)
		case http.MethodPost:
			if !claimsIsAdmin(claims) {
				writeError(w, http.StatusForbidden, "admin only")
				return
			}
			h.CreateHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	// Actions sur un utilisateur par ID
	// Le trailing slash "/" capture aussi /42, /42/status, /42/validate
	mux.Handle("/api/admin/users/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		claims, _ := r.Context().Value("authClaims").(jwt.MapClaims)
		if !claimsCanModerateUsers(claims) {
			writeError(w, http.StatusForbidden, "moderator only")
			return
		}

		// Routing manuel pour les sous-routes
		if hasSuffix(path, "/status") {
			if !claimsIsAdmin(claims) {
				id, err := parseID(path, "/api/admin/users/")
				if err != nil {
					writeError(w, http.StatusBadRequest, "invalid user id")
					return
				}
				allowed, err := ensureModeratorCanAccessProfessional(repo, id)
				if err != nil {
					if err == sql.ErrNoRows {
						writeError(w, http.StatusNotFound, "user not found")
						return
					}
					writeError(w, http.StatusInternalServerError, "could not fetch user")
					return
				}
				if !allowed {
					writeError(w, http.StatusForbidden, "professional accounts only")
					return
				}
			}
			h.StatusHandler(w, r)
			return
		}
		if hasSuffix(path, "/reset-password") {
			if !claimsIsAdmin(claims) {
				writeError(w, http.StatusForbidden, "admin only")
				return
			}
			h.ResetPasswordHandler(w, r)
			return
		}

		// Route de base : GET/PUT/DELETE /api/admin/users/:id
		if !claimsIsAdmin(claims) {
			if r.Method != http.MethodGet {
				writeError(w, http.StatusForbidden, "admin only")
				return
			}
			id, err := parseID(path, "/api/admin/users/")
			if err != nil {
				writeError(w, http.StatusBadRequest, "invalid user id")
				return
			}
			allowed, err := ensureModeratorCanAccessProfessional(repo, id)
			if err != nil {
				if err == sql.ErrNoRows {
					writeError(w, http.StatusNotFound, "user not found")
					return
				}
				writeError(w, http.StatusInternalServerError, "could not fetch user")
				return
			}
			if !allowed {
				writeError(w, http.StatusForbidden, "professional accounts only")
				return
			}
		}
		h.ByIDHandler(w, r)
	})))

	// Routes Profil (pour n'importe quel utilisateur connecté)
	mux.Handle("/api/profile", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID := int64(claims["userId"].(float64))

		if r.Method == http.MethodGet {
			h.GetProfileHandler(w, userID)
			return
		}
		h.UpdateProfileHandler(w, r, userID)
	})))

	mux.Handle("/api/profile/password", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID := int64(claims["userId"].(float64))

		h.UpdatePasswordHandler(w, r, userID)
	})))

	mux.Handle("/api/pro/export-data", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID := int64(claims["userId"].(float64))

		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		h.ExportCSVHandler(w, r, userID)
	})))
}

// hasSuffix vérifie si le path se termine par le suffixe donné
// (après avoir retiré un éventuel slash final).
func hasSuffix(path, suffix string) bool {
	clean := path
	if len(clean) > 1 && clean[len(clean)-1] == '/' {
		clean = clean[:len(clean)-1]
	}
	return len(clean) >= len(suffix) && clean[len(clean)-len(suffix):] == suffix
}
