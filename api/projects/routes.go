package projects

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// RegisterRoutes enregistre toutes les routes du module projects.
func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	repo := NewRepository(db)
	h := NewHandler(repo)

	if err := repo.EnsureSchema(); err != nil {
		log.Fatalf("Projects schema error: %v", err)
	}

	// Middleware professionnel uniquement (exclut les admins)
	proOnly := func(next http.HandlerFunc) http.Handler {
		return authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if claims["role"] != "professionnel" {
				writeError(w, http.StatusForbidden, "accès réservé aux professionnels")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}

	// Middleware admin uniquement
	adminOnly := func(next http.HandlerFunc) http.Handler {
		return authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if claims["role"] != "admin" {
				writeError(w, http.StatusForbidden, "admin only")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}

	// Catalogue public des projets publiés : particuliers et professionnels (likes, favoris, etc.)
	particulierOrPro := func(next http.HandlerFunc) http.Handler {
		return authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			role, _ := claims["role"].(string)
			if role != "particulier" && role != "professionnel" {
				writeError(w, http.StatusForbidden, "accès réservé aux particuliers et professionnels")
				return
			}
			next.ServeHTTP(w, r)
		}))
	}

	// GET /api/pro/projects/recovered-items
	mux.Handle("GET /api/pro/projects/recovered-items", proOnly(h.RecoveredItemsHandler))

	// GET /api/pro/projects  — liste
	// POST /api/pro/projects — création
	mux.Handle("/api/pro/projects", proOnly(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			h.ListHandler(w, r)
		case http.MethodPost:
			h.CreateHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}))

	// Routes avec ID de projet
	mux.Handle("/api/pro/projects/", proOnly(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// POST /api/pro/projects/{id}/publish
		if strings.HasSuffix(path, "/publish") && r.Method == http.MethodPost {
			h.PublishHandler(w, r)
			return
		}

		// POST /api/pro/projects/{id}/items
		if strings.HasSuffix(path, "/items") && r.Method == http.MethodPost {
			h.AddItemHandler(w, r)
			return
		}

		// DELETE /api/pro/projects/{id}/items/{item_id}
		if strings.Contains(path, "/items/") && r.Method == http.MethodDelete {
			h.RemoveItemHandler(w, r)
			return
		}

		// POST /api/pro/projects/{id}/images
		if strings.HasSuffix(path, "/images") && r.Method == http.MethodPost {
			h.AddImageHandler(w, r)
			return
		}

		// DELETE /api/pro/projects/{id}/images/{image_id}
		if strings.Contains(path, "/images/") && r.Method == http.MethodDelete {
			h.RemoveImageHandler(w, r)
			return
		}

		// GET /api/pro/projects/{id}/likes
		if strings.HasSuffix(path, "/likes") && r.Method == http.MethodGet {
			h.ListProjectLikersHandler(w, r)
			return
		}

		// GET /api/pro/projects/{id}
		// PUT /api/pro/projects/{id}
		// DELETE /api/pro/projects/{id}
		switch r.Method {
		case http.MethodGet:
			h.DetailHandler(w, r)
		case http.MethodPut:
			h.UpdateHandler(w, r)
		case http.MethodDelete:
			h.DeleteHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}))

	// --- Routes admin ---
	// GET  /api/admin/projects          — liste tous les projets
	// GET  /api/admin/projects/{id}     — détail d'un projet
	// POST /api/admin/projects/{id}/moderate — modérer un projet
	mux.Handle("/api/admin/projects", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		h.AdminListHandler(w, r)
	}))

	// GET /api/part/projects — liste des projets publiés et validés
	mux.Handle("GET /api/part/projects", particulierOrPro(h.ParticulierListPostedHandler))

	// GET /api/part/projects/favorites — liste des projets favoris
	mux.Handle("GET /api/part/projects/favorites", particulierOrPro(h.FavoritesHandler))

	// GET /api/mes-projets — projets auxquels l'utilisateur a participé
	mux.Handle("GET /api/mes-projets", particulierOrPro(h.ParticulierListParticipatedHandler))

	// Routes avec ID de projet pour Particulier / Pro (détail, like, bookmark)
	mux.Handle("/api/part/projects/", particulierOrPro(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// POST /api/part/projects/{id}/like
		if strings.HasSuffix(path, "/like") && r.Method == http.MethodPost {
			h.LikeHandler(w, r)
			return
		}

		// POST /api/part/projects/{id}/bookmark
		if strings.HasSuffix(path, "/bookmark") && r.Method == http.MethodPost {
			h.BookmarkHandler(w, r)
			return
		}

		// GET /api/part/projects/{id}
		if r.Method == http.MethodGet {
			h.ParticulierDetailHandler(w, r)
			return
		}

		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}))

	mux.Handle("/api/admin/projects/", adminOnly(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasSuffix(path, "/moderate") && r.Method == http.MethodPost {
			h.AdminModerateHandler(w, r)
			return
		}
		if r.Method == http.MethodGet {
			h.AdminDetailHandler(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			h.AdminDeleteHandler(w, r)
			return
		}
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}))
}
