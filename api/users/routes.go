package users

import (
	"database/sql"
	"log"
	"net/http"
)

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
		switch r.Method {
		case http.MethodGet:
			h.ListHandler(w, r)
		case http.MethodPost:
			h.CreateHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})))

	// Actions sur un utilisateur par ID
	// Le trailing slash "/" capture aussi /42, /42/status, /42/validate
	mux.Handle("/api/admin/users/", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Routing manuel pour la sous-route /status
		if hasSuffix(path, "/status") {
			h.StatusHandler(w, r)
			return
		}

		// Route de base : GET/PUT/DELETE /api/admin/users/:id
		h.ByIDHandler(w, r)
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
