package projects

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
)

const (
	maxProjectImageCount            = 20
	maxProjectImageBytes            = 5 * 1024 * 1024
	maxProjectDetailImagesEssential = 3
)

// sqlExprCorrelatedProUCConnectScore = score UC Connect cumulé du pro : somme (kg × coefficient matériau)
// sur les objets réellement récupérés (logistique picked_up + réservation = ce pro) dans des projets publiés et approuvés.
// À utiliser dans un SELECT où 'u' est l'alias users du propriétaire du projet (JOIN users u ON u.id = p.pro_user_id).
const sqlExprCorrelatedProUCConnectScore = `COALESCE((
  SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
  FROM upcycling_projects p2
  JOIN upcycling_project_items upi ON upi.project_id = p2.id
  JOIN items i ON i.id = upi.item_id
  JOIN item_logistics il ON il.item_id = i.id
    AND il.workflow_status = 'picked_up'
    AND (
      il.reserved_by_user_id = u.id
      OR (
        il.reserved_by_user_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM users umatch
          WHERE umatch.id = u.id
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
  WHERE p2.pro_user_id = u.id
    AND p2.status = 'publie'
    AND p2.moderation_status = 'approved'
), 0)`

// sqlExprCorrelatedProjectPublishedUCScore = score UC affiché pour un projet (somme kg × coeff sur objets réellement récupérés par le pro u et liés au projet p).
const sqlExprCorrelatedProjectPublishedUCScore = `COALESCE((
  SELECT SUM((COALESCE(irow.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
  FROM upcycling_project_items upi
  JOIN items irow ON irow.id = upi.item_id
  JOIN item_logistics il ON il.item_id = irow.id
    AND il.workflow_status = 'picked_up'
    AND (
      il.reserved_by_user_id = u.id
      OR (
        il.reserved_by_user_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM users umatch
          WHERE umatch.id = u.id
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
  LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(irow.material))
  WHERE upi.project_id = p.id
), 0)`

// Repository gère la persistance des projets d'upcycling.
type Repository struct {
	db *sql.DB
}

// NewRepository crée un nouveau Repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// EnsureSchema crée les tables si elles n'existent pas encore.
func (r *Repository) EnsureSchema() error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS upcycling_projects (
			id                BIGSERIAL PRIMARY KEY,
			pro_user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title             TEXT NOT NULL,
			description       TEXT NOT NULL DEFAULT '',
			project_steps     JSONB NOT NULL DEFAULT '[]'::jsonb,
			category          TEXT NOT NULL DEFAULT '',
			status            TEXT NOT NULL DEFAULT 'brouillon',
			moderation_status TEXT NOT NULL DEFAULT '',
			moderation_note   TEXT NOT NULL DEFAULT '',
			created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT upcycling_projects_status_check CHECK (status IN ('brouillon', 'publie')),
			CONSTRAINT upcycling_projects_modstatus_check CHECK (moderation_status IN ('pending', 'approved', 'rejected', ''))
		)`,
		`ALTER TABLE upcycling_projects ADD COLUMN IF NOT EXISTS project_steps JSONB NOT NULL DEFAULT '[]'::jsonb`,
		`ALTER TABLE upcycling_projects ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE upcycling_projects ADD COLUMN IF NOT EXISTS moderation_note TEXT NOT NULL DEFAULT ''`,
		`CREATE TABLE IF NOT EXISTS upcycling_project_items (
			id         BIGSERIAL PRIMARY KEY,
			project_id BIGINT NOT NULL REFERENCES upcycling_projects(id) ON DELETE CASCADE,
			item_id    BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(project_id, item_id)
		)`,
		`CREATE TABLE IF NOT EXISTS upcycling_project_images (
			id         BIGSERIAL PRIMARY KEY,
			project_id BIGINT NOT NULL REFERENCES upcycling_projects(id) ON DELETE CASCADE,
			url        TEXT NOT NULL,
			image_type TEXT NOT NULL DEFAULT 'autre',
			is_step_image BOOLEAN NOT NULL DEFAULT FALSE,
			added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT upcycling_project_images_type_check CHECK (image_type IN ('avant', 'apres', 'autre'))
		)`,
		`ALTER TABLE upcycling_project_images ADD COLUMN IF NOT EXISTS is_step_image BOOLEAN NOT NULL DEFAULT FALSE`,
		`CREATE TABLE IF NOT EXISTS upcycling_project_likes (
			project_id  BIGINT NOT NULL REFERENCES upcycling_projects(id) ON DELETE CASCADE,
			user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (project_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS upcycling_project_bookmarks (
			project_id  BIGINT NOT NULL REFERENCES upcycling_projects(id) ON DELETE CASCADE,
			user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (project_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS upcycling_project_feed_metrics (
			project_id  BIGINT NOT NULL REFERENCES upcycling_projects(id) ON DELETE CASCADE,
			user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			impressions BIGINT NOT NULL DEFAULT 0,
			clicks      BIGINT NOT NULL DEFAULT 0,
			last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (project_id, user_id)
		)`,
	}
	for _, s := range stmts {
		if _, err := r.db.Exec(s); err != nil {
			return err
		}
	}
	log.Println("✓ Upcycling projects schema initialized")
	return nil
}

func sanitizeProjectSteps(raw []ProjectStep) []ProjectStep {
	if len(raw) == 0 {
		return []ProjectStep{}
	}
	out := make([]ProjectStep, 0, len(raw))
	for _, step := range raw {
		cleanText := strings.TrimSpace(step.Text)
		cleanImage := strings.TrimSpace(step.ImageURL)
		if cleanText == "" {
			continue
		}
		if len(cleanText) > 300 {
			cleanText = cleanText[:300]
		}
		out = append(out, ProjectStep{Text: cleanText, ImageURL: cleanImage})
		if len(out) >= 30 {
			break
		}
	}
	return out
}

func parseProjectSteps(raw string) []ProjectStep {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return []ProjectStep{}
	}

	var structured []ProjectStep
	if err := json.Unmarshal([]byte(trimmed), &structured); err == nil {
		return sanitizeProjectSteps(structured)
	}

	// Compatibilité legacy: ancien format []string.
	var legacy []string
	if err := json.Unmarshal([]byte(trimmed), &legacy); err != nil {
		return []ProjectStep{}
	}
	converted := make([]ProjectStep, 0, len(legacy))
	for _, text := range legacy {
		converted = append(converted, ProjectStep{Text: text})
	}
	return sanitizeProjectSteps(converted)
}

func (r *Repository) getSubscriptionTypeForPro(proUserID int64) (string, error) {
	var subscriptionType string
	err := r.db.QueryRow("SELECT COALESCE(subscription_type, 'decouverte') FROM users WHERE id = $1", proUserID).Scan(&subscriptionType)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(strings.ToLower(subscriptionType)), nil
}

func validateProjectStepsForSubscription(subscriptionType string, steps []ProjectStep) error {
	if len(steps) == 0 {
		return nil
	}
	switch strings.TrimSpace(strings.ToLower(subscriptionType)) {
	case "", "decouverte", "gratuit", "none":
		return errors.New("les etapes de projet sont reservees aux offres Pro Essentiel et Premium Atelier")
	default:
		return nil
	}
}

// GetProUCConnectScore retourne le score UC Connect du professionnel (objets récupérés utilisés dans des projets publiés/validés).
func (r *Repository) GetProUCConnectScore(proUserID int64) (float64, error) {
	var score float64
	err := r.db.QueryRow(`
		SELECT COALESCE(SUM(
			(COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1)
		), 0)
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
	`, proUserID).Scan(&score)
	return score, err
}

// GetProUCConnectWeight retourne la masse totale (kg) des mêmes objets que pour le score UC Connect pro.
func (r *Repository) GetProUCConnectWeight(proUserID int64) (float64, error) {
	var kg float64
	err := r.db.QueryRow(`
		SELECT COALESCE(SUM(COALESCE(i.weight_grams, 0) / 1000.0), 0)
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
		WHERE p.pro_user_id = $1
		  AND p.status = 'publie'
		  AND p.moderation_status = 'approved'
	`, proUserID).Scan(&kg)
	return kg, err
}

// ListByPro retourne tous les projets d'un professionnel, avec le nombre d'objets liés.
func (r *Repository) ListByPro(proUserID int64) ([]Project, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.pro_user_id, COALESCE(preview.url, ''), p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       (SELECT COUNT(*) FROM upcycling_project_items pi WHERE pi.project_id = p.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       `+sqlExprCorrelatedProjectPublishedUCScore+` AS upcycling_score,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		JOIN users u ON u.id = p.pro_user_id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE
			ORDER BY CASE
				WHEN img.image_type = 'apres' THEN 0
				WHEN img.image_type = 'avant' THEN 1
				ELSE 2
			END,
			img.added_at DESC
			LIMIT 1
		) preview ON TRUE
		WHERE p.pro_user_id = $1
		ORDER BY p.updated_at DESC
	`, proUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.PreviewImage, &p.Title, &p.Description, &p.Category,
			&p.Status, &p.ModerationStatus, &p.ModerationNote,
			&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.TotalWeightKg = p.TotalWeightGrams / 1000.0
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, nil
}

// Delete supprime un projet du professionnel (items/images en cascade).
func (r *Repository) Delete(id, proUserID int64) error {
	res, err := r.db.Exec(`DELETE FROM upcycling_projects WHERE id = $1 AND pro_user_id = $2`, id, proUserID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("project not found or not yours")
	}
	return nil
}

// Archive remet un projet en brouillon (depublication explicite demandee par le pro).
func (r *Repository) Archive(id, proUserID int64) error {
	res, err := r.db.Exec(`
		UPDATE upcycling_projects
		SET status = 'brouillon', moderation_status = '', moderation_note = '', updated_at = NOW()
		WHERE id = $1 AND pro_user_id = $2
	`, id, proUserID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("project not found or not yours")
	}
	return nil
}

// AdminDelete supprime un projet sans contrainte d'ownership (usage admin).
func (r *Repository) AdminDelete(id int64) error {
	res, err := r.db.Exec(`DELETE FROM upcycling_projects WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("project not found")
	}
	return nil
}

// AdminProSummary retourne le résumé professionnel associé à un projet pour l'admin.
func (r *Repository) AdminProSummary(projectID int64) (*ProSummary, error) {
	var s ProSummary
	err := r.db.QueryRow(`
		SELECT u.id,
		       TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')),
		       COALESCE(NULLIF(TRIM(u.company_name), ''), 'N/A'),
		       (`+sqlExprCorrelatedProUCConnectScore+`)::double precision AS total_uc_score,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM upcycling_projects p3
		         WHERE p3.pro_user_id = u.id
		           AND p3.created_at >= u.created_at
		       )::int, 0) AS project_count,
		       u.created_at
		FROM upcycling_projects p
		JOIN users u ON u.id = p.pro_user_id
		WHERE p.id = $1
	`, projectID).Scan(
		&s.UserID,
		&s.FullName,
		&s.CompanyName,
		&s.TotalUCScore,
		&s.TotalProjectsSinceSignup,
		&s.JoinedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}
	return &s, nil
}

// GetByID retourne un projet par son ID, en vérifiant l'ownership.
// Si proUserID == 0, aucune vérification d'ownership (usage admin).
func (r *Repository) GetByID(id, proUserID int64) (*Project, error) {
	query := `
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       p.title, p.description, COALESCE(p.project_steps::text, '[]'), p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       (SELECT COUNT(*) FROM upcycling_project_items pi WHERE pi.project_id = p.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       ` + sqlExprCorrelatedProjectPublishedUCScore + ` AS upcycling_score,
		       (SELECT COUNT(*)::int FROM upcycling_project_likes WHERE project_id = p.id) AS like_count,
		       (SELECT COUNT(*)::int FROM upcycling_project_bookmarks WHERE project_id = p.id) AS bookmark_count,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		JOIN users u ON u.id = p.pro_user_id
		WHERE p.id = $1
	`
	args := []any{id}
	if proUserID > 0 {
		query += ` AND p.pro_user_id = $2`
		args = append(args, proUserID)
	}
	query += ` ORDER BY p.id`

	var p Project
	var stepsRaw string
	err := r.db.QueryRow(query, args...).Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.Title, &p.Description, &stepsRaw,
		&p.Category, &p.Status, &p.ModerationStatus, &p.ModerationNote,
		&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore,
		&p.LikeCount, &p.BookmarkCount, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}
	p.Steps = parseProjectSteps(stepsRaw)
	p.TotalWeightKg = p.TotalWeightGrams / 1000.0
	return &p, nil
}

func likerRoleLabel(role string) string {
	switch strings.TrimSpace(strings.ToLower(role)) {
	case "particulier":
		return "Particulier"
	case "professionnel":
		return "Professionnel"
	case "salarie", "admin":
		return "Équipe UpcycleConnect"
	default:
		if role == "" {
			return "Particulier"
		}
		return role
	}
}

// ListProjectLikers retourne les utilisateurs ayant liké un projet (appeler après vérification du propriétaire).
func (r *Repository) ListProjectLikers(projectID int64) ([]ProjectLiker, error) {
	rows, err := r.db.Query(`
		SELECT u.id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       COALESCE(u.email, ''),
		       u.role
		FROM upcycling_project_likes l
		JOIN users u ON u.id = l.user_id
		WHERE l.project_id = $1
		ORDER BY l.created_at DESC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ProjectLiker
	for rows.Next() {
		var lk ProjectLiker
		var email, rawRole string
		if err := rows.Scan(&lk.UserID, &lk.DisplayName, &email, &rawRole); err != nil {
			return nil, err
		}
		lk.Role = likerRoleLabel(rawRole)
		if strings.TrimSpace(lk.DisplayName) == "" {
			if email != "" {
				lk.DisplayName = email
			} else {
				lk.DisplayName = fmt.Sprintf("Utilisateur #%d", lk.UserID)
			}
		}
		out = append(out, lk)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if out == nil {
		out = []ProjectLiker{}
	}
	return out, nil
}

// Create crée un nouveau projet et retourne l'entité créée.
func (r *Repository) Create(proUserID int64, payload CreatePayload) (*Project, error) {
	status := StatusDraft
	if payload.Status == StatusPublished {
		status = StatusPublished
	}
	steps := sanitizeProjectSteps(payload.Steps)
	subscriptionType, err := r.getSubscriptionTypeForPro(proUserID)
	if err != nil {
		return nil, err
	}
	if err := validateProjectStepsForSubscription(subscriptionType, steps); err != nil {
		return nil, err
	}
	stepsJSON, _ := json.Marshal(steps)
	var p Project
	var stepsRaw string
	err = r.db.QueryRow(`
		INSERT INTO upcycling_projects (pro_user_id, title, description, project_steps, category, status, moderation_status)
		VALUES ($1, $2, $3, $4::jsonb, $5, $6, '')
		RETURNING id, pro_user_id, title, description, COALESCE(project_steps::text, '[]'), category, status, moderation_status, moderation_note, created_at, updated_at
	`, proUserID, payload.Title, payload.Description, string(stepsJSON), payload.Category, status).Scan(
		&p.ID, &p.ProUserID, &p.Title, &p.Description, &stepsRaw, &p.Category, &p.Status,
		&p.ModerationStatus, &p.ModerationNote, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.Steps = parseProjectSteps(stepsRaw)
	p.ItemCount = 0
	p.TotalWeightGrams = 0
	p.TotalWeightKg = 0
	p.UpcyclingScore = 0
	return &p, nil
}

// Update met à jour les champs principaux d'un projet.
func (r *Repository) Update(id, proUserID int64, payload UpdatePayload) (*Project, error) {
	status := StatusDraft
	if payload.Status == StatusPublished {
		status = StatusPublished
	}
	var existingStepsRaw string
	err := r.db.QueryRow(`SELECT COALESCE(project_steps::text, '[]') FROM upcycling_projects WHERE id = $1 AND pro_user_id = $2`, id, proUserID).Scan(&existingStepsRaw)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found or not yours")
		}
		return nil, err
	}
	steps := parseProjectSteps(existingStepsRaw)
	if payload.Steps != nil {
		steps = sanitizeProjectSteps(*payload.Steps)
		subscriptionType, err := r.getSubscriptionTypeForPro(proUserID)
		if err != nil {
			return nil, err
		}
		if err := validateProjectStepsForSubscription(subscriptionType, steps); err != nil {
			return nil, err
		}
	}
	stepsJSON, _ := json.Marshal(steps)
	var p Project
	err = r.db.QueryRow(`
		UPDATE upcycling_projects
		SET title = $1, description = $2, project_steps = $3::jsonb, category = $4, status = $5, moderation_status = '', updated_at = NOW()
		WHERE id = $6 AND pro_user_id = $7
		RETURNING id, pro_user_id, title, description, COALESCE(project_steps::text, '[]'), category, status, moderation_status, moderation_note, created_at, updated_at
	`, payload.Title, payload.Description, string(stepsJSON), payload.Category, status, id, proUserID).Scan(
		&p.ID, &p.ProUserID, &p.Title, &p.Description, &existingStepsRaw, &p.Category, &p.Status,
		&p.ModerationStatus, &p.ModerationNote, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found or not yours")
		}
		return nil, err
	}
	p.Steps = parseProjectSteps(existingStepsRaw)
	p.ItemCount = 0
	p.TotalWeightGrams = 0
	p.TotalWeightKg = 0
	p.UpcyclingScore = 0
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_items WHERE project_id = $1`, p.ID).Scan(&p.ItemCount)
	_ = r.db.QueryRow(`
		SELECT COALESCE(SUM(COALESCE(i.weight_grams, 0)), 0)
		FROM upcycling_project_items upi
		JOIN items i ON i.id = upi.item_id
		WHERE upi.project_id = $1
	`, p.ID).Scan(&p.TotalWeightGrams)
	_ = r.db.QueryRow(`
		SELECT COALESCE(SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1)), 0)
		FROM upcycling_project_items upi
		JOIN items i ON i.id = upi.item_id
		LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		WHERE upi.project_id = $1
	`, p.ID).Scan(&p.UpcyclingScore)
	p.TotalWeightKg = p.TotalWeightGrams / 1000.0
	_ = r.db.QueryRow(`SELECT COUNT(*)::int FROM upcycling_project_likes WHERE project_id = $1`, p.ID).Scan(&p.LikeCount)
	_ = r.db.QueryRow(`SELECT COUNT(*)::int FROM upcycling_project_bookmarks WHERE project_id = $1`, p.ID).Scan(&p.BookmarkCount)
	return &p, nil
}

// Publish publie un projet (passe son statut à "publie").
func (r *Repository) Publish(id, proUserID int64) error {
	res, err := r.db.Exec(`
		UPDATE upcycling_projects
		SET status = 'brouillon', moderation_status = 'pending', moderation_note = '', updated_at = NOW()
		WHERE id = $1 AND pro_user_id = $2
	`, id, proUserID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("project not found or not yours")
	}
	return nil
}

// ListItems retourne les objets liés à un projet.
func (r *Repository) ListItems(projectID int64) ([]ProjectItem, error) {
	rows, err := r.db.Query(`
		SELECT pi.id, pi.project_id, pi.item_id, COALESCE(i.title, ''),
		       COALESCE(NULLIF(i.image, ''), NULLIF(i.photos[1], ''), ''),
		       COALESCE(i.material, ''),
		       i.weight_value, COALESCE(i.weight_unit, ''), i.weight_grams, pi.added_at
		FROM upcycling_project_items pi
		LEFT JOIN items i ON i.id = pi.item_id
		WHERE pi.project_id = $1
		ORDER BY pi.added_at ASC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ProjectItem
	for rows.Next() {
		var pi ProjectItem
		if err := rows.Scan(&pi.ID, &pi.ProjectID, &pi.ItemID, &pi.ItemTitle, &pi.ItemImage, &pi.Material,
			&pi.WeightValue, &pi.WeightUnit, &pi.WeightGrams, &pi.AddedAt); err != nil {
			return nil, err
		}
		items = append(items, pi)
	}
	if items == nil {
		items = []ProjectItem{}
	}
	return items, nil
}

// AddItem associe un objet récupéré par le professionnel à son projet.
// Vérifie que l'objet appartient bien au professionnel via la table item_logistics (picked_up).
func (r *Repository) AddItem(projectID, itemID, proUserID int64) error {
	// Vérifier que le projet appartient au pro
	var ownerID int64
	err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID)
	if err != nil || ownerID != proUserID {
		return errors.New("project not found or not yours")
	}

	// Vérifier que l'objet a été réellement récupéré par ce professionnel
	var count int
	err = r.db.QueryRow(`
		SELECT COUNT(*)
		FROM item_logistics il
		JOIN items i ON i.id = il.item_id
		WHERE il.item_id = $1
		  AND il.workflow_status = 'picked_up'
		  AND (
		      il.reserved_by_user_id = $2
		      OR (
		          il.reserved_by_user_id IS NULL
		          AND EXISTS (
		              SELECT 1
		              FROM users u
		              WHERE u.id = $2
		                AND (
		                    (TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) <> ''
		                     AND LOWER(TRIM(il.reserved_by_name)) = LOWER(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, ''))))
		                    OR
		                    (TRIM(COALESCE(u.company_name, '')) <> ''
		                     AND LOWER(TRIM(il.reserved_by_name)) = LOWER(TRIM(COALESCE(u.company_name, ''))))
		                )
		          )
		      )
		  )
	`, itemID, proUserID).Scan(&count)
	if err != nil {
		return err
	}
	if count == 0 {
		return errors.New("item not recovered by this professional")
	}

	_, err = r.db.Exec(`
		INSERT INTO upcycling_project_items (project_id, item_id)
		VALUES ($1, $2)
		ON CONFLICT (project_id, item_id) DO NOTHING
	`, projectID, itemID)
	return err
}

// RemoveItem retire un objet d'un projet.
func (r *Repository) RemoveItem(projectID, itemID, proUserID int64) error {
	var ownerID int64
	err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID)
	if err != nil || ownerID != proUserID {
		return errors.New("project not found or not yours")
	}
	_, err = r.db.Exec(`DELETE FROM upcycling_project_items WHERE project_id = $1 AND item_id = $2`, projectID, itemID)
	return err
}

// ListImages retourne les images d'un projet.
func (r *Repository) ListImages(projectID int64) ([]ProjectImage, error) {
	rows, err := r.db.Query(`
		SELECT id, project_id, url, image_type, added_at
		FROM upcycling_project_images
		WHERE project_id = $1 AND COALESCE(is_step_image, FALSE) = FALSE
		ORDER BY added_at ASC
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var images []ProjectImage
	for rows.Next() {
		var img ProjectImage
		if err := rows.Scan(&img.ID, &img.ProjectID, &img.URL, &img.ImageType, &img.AddedAt); err != nil {
			return nil, err
		}
		images = append(images, img)
	}
	if images == nil {
		images = []ProjectImage{}
	}
	return images, nil
}

// AddImage ajoute une image à un projet.
func (r *Repository) AddImage(projectID, proUserID int64, url, imageType string) (*ProjectImage, error) {
	var ownerID int64
	err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID)
	if err != nil || ownerID != proUserID {
		return nil, errors.New("project not found or not yours")
	}
	if err := validateImagePayload(url); err != nil {
		return nil, err
	}
	validTypes := map[string]bool{"avant": true, "apres": true, "autre": true}
	if !validTypes[imageType] {
		return nil, errors.New("type d'image invalide")
	}

	var subscriptionType string
	err = r.db.QueryRow(`
		SELECT COALESCE(u.subscription_type, 'decouverte')
		FROM upcycling_projects p
		JOIN users u ON u.id = p.pro_user_id
		WHERE p.id = $1 AND p.pro_user_id = $2
	`, projectID, proUserID).Scan(&subscriptionType)
	if err != nil {
		return nil, err
	}
	subscriptionType = strings.TrimSpace(strings.ToLower(subscriptionType))
	if imageType == "autre" {
		switch subscriptionType {
		case "", "decouverte", "gratuit":
			return nil, errors.New("les images detail ne sont pas disponibles avec l'offre Decouverte")
		case "pro_essentiel":
			var detailCount int
			err = r.db.QueryRow(`
				SELECT COUNT(*)
				FROM upcycling_project_images
				WHERE project_id = $1 AND image_type = 'autre' AND COALESCE(is_step_image, FALSE) = FALSE
			`, projectID).Scan(&detailCount)
			if err != nil {
				return nil, err
			}
			if detailCount >= maxProjectDetailImagesEssential {
				return nil, errors.New("vous avez atteint la limite de 3 images detail pour l'offre Pro Essentiel")
			}
		}
	}
	var imageCount int
	err = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_images WHERE project_id = $1 AND COALESCE(is_step_image, FALSE) = FALSE`, projectID).Scan(&imageCount)
	if err != nil {
		return nil, err
	}
	if imageCount >= maxProjectImageCount {
		return nil, errors.New("image limit reached for this project")
	}
	var img ProjectImage
	err = r.db.QueryRow(`
		INSERT INTO upcycling_project_images (project_id, url, image_type, is_step_image)
		VALUES ($1, $2, $3, FALSE)
		RETURNING id, project_id, url, image_type, added_at
	`, projectID, url, imageType).Scan(&img.ID, &img.ProjectID, &img.URL, &img.ImageType, &img.AddedAt)
	if err != nil {
		return nil, err
	}
	return &img, nil
}

// AddStepImage ajoute une image dédiée à une étape, sans l'inclure dans la galerie avant/après/autre.
func (r *Repository) AddStepImage(projectID, proUserID int64, url string) (*ProjectImage, error) {
	var ownerID int64
	err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID)
	if err != nil || ownerID != proUserID {
		return nil, errors.New("project not found or not yours")
	}
	if err := validateImagePayload(url); err != nil {
		return nil, err
	}
	subscriptionType, err := r.getSubscriptionTypeForPro(proUserID)
	if err != nil {
		return nil, err
	}
	if err := validateProjectStepsForSubscription(subscriptionType, []ProjectStep{{Text: "step", ImageURL: url}}); err != nil {
		return nil, err
	}

	var img ProjectImage
	err = r.db.QueryRow(`
		INSERT INTO upcycling_project_images (project_id, url, image_type, is_step_image)
		VALUES ($1, $2, 'autre', TRUE)
		RETURNING id, project_id, url, image_type, added_at
	`, projectID, url).Scan(&img.ID, &img.ProjectID, &img.URL, &img.ImageType, &img.AddedAt)
	if err != nil {
		return nil, err
	}
	return &img, nil
}

// RemoveImage supprime une image d'un projet.
func (r *Repository) RemoveImage(imageID, proUserID int64) error {
	var ownerID int64
	err := r.db.QueryRow(`
		SELECT p.pro_user_id FROM upcycling_project_images img
		JOIN upcycling_projects p ON p.id = img.project_id
		WHERE img.id = $1
	`, imageID).Scan(&ownerID)
	if err != nil || ownerID != proUserID {
		return errors.New("image not found or not yours")
	}
	_, err = r.db.Exec(`DELETE FROM upcycling_project_images WHERE id = $1`, imageID)
	return err
}

// ListRecoveredItems retourne les objets récupérés par un professionnel
// (workflow_status = picked_up) pour les proposer lors de l'association.
func (r *Repository) ListRecoveredItems(proUserID int64) ([]map[string]any, error) {
	rows, err := r.db.Query(`
		SELECT i.id, i.title, i.category,
		       COALESCE(NULLIF(i.image, ''), NULLIF(i.photos[1], ''), ''),
		       COALESCE(i.material, ''), i.weight_value, COALESCE(i.weight_unit, ''), i.weight_grams,
		       COALESCE(im.impact_coefficient, 1),
		       il.updated_at AS picked_up_at
		FROM item_logistics il
		JOIN items i ON i.id = il.item_id
		LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		WHERE il.workflow_status = 'picked_up'
		  AND (
		      il.reserved_by_user_id = $1
		      OR (
		          il.reserved_by_user_id IS NULL
		          AND EXISTS (
		              SELECT 1
		              FROM users u
		              WHERE u.id = $1
		                AND (
		                    (TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) <> ''
		                     AND LOWER(TRIM(il.reserved_by_name)) = LOWER(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, ''))))
		                    OR
		                    (TRIM(COALESCE(u.company_name, '')) <> ''
		                     AND LOWER(TRIM(il.reserved_by_name)) = LOWER(TRIM(COALESCE(u.company_name, ''))))
		                )
		          )
		      )
		  )
		ORDER BY il.updated_at DESC
	`, proUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []map[string]any
	for rows.Next() {
		var id int64
		var title, category, image, material, weightUnit string
		var weightValue, weightGrams any
		var impactCoefficient float64
		var pickedUpAt any
		if err := rows.Scan(&id, &title, &category, &image, &material, &weightValue, &weightUnit, &weightGrams, &impactCoefficient, &pickedUpAt); err != nil {
			return nil, err
		}
		result = append(result, map[string]any{
			"id":                id,
			"title":             title,
			"category":          category,
			"image":             image,
			"material":          material,
			"weightValue":       weightValue,
			"weightUnit":        weightUnit,
			"weightGrams":       weightGrams,
			"impactCoefficient": impactCoefficient,
			"pickedUpAt":        pickedUpAt,
		})
	}
	if result == nil {
		result = []map[string]any{}
	}
	return result, nil
}

// --- Méthodes admin ---

// AdminListAll retourne les projets pour l'admin, avec filtres optionnels.
// Liste allégée : pas de score UC corrélé (calcul lourd, sensible au schéma) — le détail admin peut le recalculer.
func (r *Repository) AdminListAll(statusFilter, moderationStatusFilter string) ([]Project, error) {
	query := `
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       COALESCE(preview.url, ''),
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       (SELECT COUNT(*)::bigint FROM upcycling_project_items pi WHERE pi.project_id = p.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       (0)::double precision AS upcycling_score,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE
			ORDER BY CASE
				WHEN img.image_type = 'apres' THEN 0
				WHEN img.image_type = 'avant' THEN 1
				ELSE 2
			END,
			img.added_at DESC
			LIMIT 1
		) preview ON TRUE
		JOIN users u ON u.id = p.pro_user_id
	`
	var args []any
	clauses := []string{}
	if statusFilter != "" {
		clauses = append(clauses, `p.status = $1`)
		args = append(args, statusFilter)
	}
	if moderationStatusFilter != "" {
		clauses = append(clauses, `p.moderation_status = $`+itoa(len(args)+1))
		args = append(args, moderationStatusFilter)
	}
	if len(clauses) > 0 {
		query += ` WHERE ` + strings.Join(clauses, ` AND `)
	}
	query += ` ORDER BY p.updated_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []Project
	for rows.Next() {
		var p Project
		var itemCount int64
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.PreviewImage,
			&p.Title, &p.Description, &p.Category, &p.Status,
			&p.ModerationStatus, &p.ModerationNote,
			&itemCount, &p.TotalWeightGrams, &p.UpcyclingScore, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		if itemCount > 0x7fffffff {
			p.ItemCount = 0x7fffffff
		} else {
			p.ItemCount = int(itemCount)
		}
		p.TotalWeightKg = p.TotalWeightGrams / 1000.0
		projects = append(projects, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, nil
}

// ParticulierListPosted retourne les projets publiés et validés pour l'espace particulier.
func (r *Repository) ParticulierListPosted(userID int64) ([]Project, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       u.created_at,
		       `+sqlExprCorrelatedProUCConnectScore+` AS pro_total_uc_score,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM upcycling_projects p3
		         WHERE p3.pro_user_id = u.id
		           AND p3.created_at >= u.created_at
		       )::int, 0) AS pro_projects_since_signup,
		       COALESCE(preview.url, ''),
		       COALESCE(before_img.url, ''),
		       COALESCE(after_img.url, ''),
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       COUNT(pi.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i2.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i2 ON i2.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       `+sqlExprCorrelatedProjectPublishedUCScore+` AS upcycling_score,
		       (SELECT COUNT(*) FROM upcycling_project_likes WHERE project_id = p.id) AS like_count,
		       (SELECT COUNT(*) FROM upcycling_project_bookmarks WHERE project_id = p.id) AS bookmark_count,
		       EXISTS(SELECT 1 FROM upcycling_project_likes WHERE project_id = p.id AND user_id = $1) AS is_liked,
		       EXISTS(SELECT 1 FROM upcycling_project_bookmarks WHERE project_id = p.id AND user_id = $1) AS is_bookmarked,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		LEFT JOIN upcycling_project_items pi ON pi.project_id = p.id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE
			ORDER BY CASE
				WHEN img.image_type = 'apres' THEN 0
				WHEN img.image_type = 'avant' THEN 1
				ELSE 2
			END,
			img.added_at DESC
			LIMIT 1
		) preview ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'avant'
			ORDER BY img.added_at DESC
			LIMIT 1
		) before_img ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'apres'
			ORDER BY img.added_at DESC
			LIMIT 1
		) after_img ON TRUE
		JOIN users u ON u.id = p.pro_user_id
		WHERE p.status = 'publie' AND p.moderation_status = 'approved'
		GROUP BY p.id, preview.url, before_img.url, after_img.url, u.id, u.firstname, u.lastname, u.created_at
		ORDER BY p.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.ProJoinedAt, &p.ProTotalUCScore, &p.ProProjectsSinceSignup,
			&p.PreviewImage, &p.BeforeImage, &p.AfterImage,
			&p.Title, &p.Description, &p.Category, &p.Status,
			&p.ModerationStatus, &p.ModerationNote,
			&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore,
			&p.LikeCount, &p.BookmarkCount, &p.IsLiked, &p.IsBookmarked,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.TotalWeightKg = p.TotalWeightGrams / 1000.0
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, nil
}

// ProPublishedProjectsForMyUpcycle liste les projets publiés et validés du professionnel (page "My Upcycle" pro).
// viewerUserID sert aux indicateurs like/favori ; ownerProUserID filtre les projets du pro (souvent identiques).
func (r *Repository) ProPublishedProjectsForMyUpcycle(viewerUserID, ownerProUserID int64) ([]Project, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       COALESCE(NULLIF(TRIM(u.company_name), ''), 'Professionnel'),
		       u.created_at,
		       `+sqlExprCorrelatedProUCConnectScore+` AS pro_total_uc_score,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM upcycling_projects p3
		         WHERE p3.pro_user_id = u.id
		           AND p3.created_at >= u.created_at
		       )::int, 0) AS pro_projects_since_signup,
		       COALESCE(preview.url, ''),
		       COALESCE(before_img.url, ''),
		       COALESCE(after_img.url, ''),
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       COUNT(pi.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i2.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i2 ON i2.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       `+sqlExprCorrelatedProjectPublishedUCScore+` AS upcycling_score,
		       (SELECT COUNT(*) FROM upcycling_project_likes WHERE project_id = p.id) AS like_count,
		       (SELECT COUNT(*) FROM upcycling_project_bookmarks WHERE project_id = p.id) AS bookmark_count,
		       EXISTS(SELECT 1 FROM upcycling_project_likes WHERE project_id = p.id AND user_id = $1) AS is_liked,
		       EXISTS(SELECT 1 FROM upcycling_project_bookmarks WHERE project_id = p.id AND user_id = $1) AS is_bookmarked,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		LEFT JOIN upcycling_project_items pi ON pi.project_id = p.id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE
			ORDER BY CASE
				WHEN img.image_type = 'apres' THEN 0
				WHEN img.image_type = 'avant' THEN 1
				ELSE 2
			END,
			img.added_at DESC
			LIMIT 1
		) preview ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'avant'
			ORDER BY img.added_at DESC
			LIMIT 1
		) before_img ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'apres'
			ORDER BY img.added_at DESC
			LIMIT 1
		) after_img ON TRUE
		JOIN users u ON u.id = p.pro_user_id
		WHERE p.status = 'publie' AND p.moderation_status = 'approved' AND p.pro_user_id = $2
		GROUP BY p.id, preview.url, before_img.url, after_img.url, u.id, u.firstname, u.lastname, u.company_name, u.created_at
		ORDER BY p.updated_at DESC
	`, viewerUserID, ownerProUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.ProCompanyName, &p.ProJoinedAt, &p.ProTotalUCScore, &p.ProProjectsSinceSignup,
			&p.PreviewImage, &p.BeforeImage, &p.AfterImage,
			&p.Title, &p.Description, &p.Category, &p.Status,
			&p.ModerationStatus, &p.ModerationNote,
			&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore,
			&p.LikeCount, &p.BookmarkCount, &p.IsLiked, &p.IsBookmarked,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.TotalWeightKg = p.TotalWeightGrams / 1000.0
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, nil
}

// ParticulierListParticipated retourne les projets publiés et validés auxquels l'utilisateur a participé via ses objets.
func (r *Repository) ParticulierListParticipated(userID int64) ([]Project, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       COALESCE(NULLIF(TRIM(u.company_name), ''), 'Professionnel'),
		       u.created_at,
		       `+sqlExprCorrelatedProUCConnectScore+` AS pro_total_uc_score,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM upcycling_projects p3
		         WHERE p3.pro_user_id = u.id
		           AND p3.created_at >= u.created_at
		       )::int, 0) AS pro_projects_since_signup,
		       COALESCE(preview.url, ''),
		       COALESCE(before_img.url, ''),
		       COALESCE(after_img.url, ''),
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       COUNT(DISTINCT pi.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i3.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i3 ON i3.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       `+sqlExprCorrelatedProjectPublishedUCScore+` AS upcycling_score,
		       (SELECT COUNT(*) FROM upcycling_project_likes WHERE project_id = p.id) AS like_count,
		       (SELECT COUNT(*) FROM upcycling_project_bookmarks WHERE project_id = p.id) AS bookmark_count,
		       EXISTS(SELECT 1 FROM upcycling_project_likes WHERE project_id = p.id AND user_id = $1) AS is_liked,
		       EXISTS(SELECT 1 FROM upcycling_project_bookmarks WHERE project_id = p.id AND user_id = $1) AS is_bookmarked,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		JOIN upcycling_project_items pi ON pi.project_id = p.id
		JOIN items i ON i.id = pi.item_id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE
			ORDER BY CASE
				WHEN img.image_type = 'apres' THEN 0
				WHEN img.image_type = 'avant' THEN 1
				ELSE 2
			END,
			img.added_at DESC
			LIMIT 1
		) preview ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'avant'
			ORDER BY img.added_at DESC
			LIMIT 1
		) before_img ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'apres'
			ORDER BY img.added_at DESC
			LIMIT 1
		) after_img ON TRUE
		JOIN users u ON u.id = p.pro_user_id
		WHERE i.user_id = $1 AND p.status = 'publie' AND p.moderation_status = 'approved'
		GROUP BY p.id, preview.url, before_img.url, after_img.url, u.id, u.firstname, u.lastname, u.company_name, u.created_at
		ORDER BY p.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.ProCompanyName, &p.ProJoinedAt, &p.ProTotalUCScore, &p.ProProjectsSinceSignup,
			&p.PreviewImage, &p.BeforeImage, &p.AfterImage,
			&p.Title, &p.Description, &p.Category, &p.Status,
			&p.ModerationStatus, &p.ModerationNote,
			&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore,
			&p.LikeCount, &p.BookmarkCount, &p.IsLiked, &p.IsBookmarked,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.TotalWeightKg = p.TotalWeightGrams / 1000.0
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, nil
}

// GetUserPersonalScore calcule le score UC personnel du particulier.
// Il tient compte uniquement des objets lui appartenant dans des projets publiés et approuvés.
func (r *Repository) GetUserPersonalScore(userID int64) (float64, error) {
	var score float64
	err := r.db.QueryRow(`
		SELECT COALESCE(SUM(
			(COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1)
		), 0)
		FROM upcycling_project_items upi
		JOIN items i ON i.id = upi.item_id
		JOIN upcycling_projects p ON p.id = upi.project_id
		LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		WHERE i.user_id = $1
		  AND p.status = 'publie'
		  AND p.moderation_status = 'approved'
	`, userID).Scan(&score)
	return score, err
}

// GetUserPersonalWeight calcule la masse totale revalorisée par le particulier (en kg).
func (r *Repository) GetUserPersonalWeight(userID int64) (float64, error) {
	var grams float64
	err := r.db.QueryRow(`
		SELECT COALESCE(SUM(COALESCE(i.weight_grams, 0)), 0)
		FROM upcycling_project_items upi
		JOIN items i ON i.id = upi.item_id
		JOIN upcycling_projects p ON p.id = upi.project_id
		WHERE i.user_id = $1
		  AND p.status = 'publie'
		  AND p.moderation_status = 'approved'
	`, userID).Scan(&grams)
	return grams / 1000.0, err
}

// AdminModerate met à jour le statut de modération d'un projet.
func (r *Repository) AdminModerate(projectID int64, moderationStatus, note string) error {
	valid := map[string]bool{"pending": true, "approved": true, "rejected": true}
	if !valid[moderationStatus] {
		return errors.New("invalid moderation status")
	}

	if moderationStatus == "approved" {
		var proUserID int64
		err := r.db.QueryRow("SELECT pro_user_id FROM upcycling_projects WHERE id = $1", projectID).Scan(&proUserID)
		if err != nil {
			return err
		}
		if err := r.ValidatePublishReadiness(projectID, proUserID); err != nil {
			return err
		}
		var subscriptionType string
		err = r.db.QueryRow("SELECT COALESCE(subscription_type, 'decouverte') FROM users WHERE id = $1", proUserID).Scan(&subscriptionType)
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
				_ = r.db.QueryRow("SELECT COUNT(*) FROM upcycling_projects WHERE pro_user_id = $1 AND status = 'publie' AND id != $2", proUserID, projectID).Scan(&publishedCount)
				if publishedCount >= limit {
					return errors.New("Cet utilisateur a déjà atteint la limite de " + strconv.Itoa(limit) + " projets publiés pour son abonnement " + planName + ".")
				}
			}
		}
	}

	res, err := r.db.Exec(`
		UPDATE upcycling_projects
		SET moderation_status = CASE WHEN $1 = 'rejected' THEN '' ELSE $1 END,
		    moderation_note = $2,
		    status = CASE WHEN $1 = 'approved' THEN 'publie' ELSE 'brouillon' END,
		    updated_at = NOW()
		WHERE id = $3
	`, moderationStatus, note, projectID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return errors.New("project not found")
	}
	return nil
}

func (r *Repository) ValidatePublishReadiness(projectID, proUserID int64) error {
	var ownerID int64
	err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("project not found")
		}
		return err
	}
	if ownerID != proUserID {
		return errors.New("project not found or not yours")
	}

	var itemCount int
	err = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_items WHERE project_id = $1`, projectID).Scan(&itemCount)
	if err != nil {
		return err
	}
	if itemCount < 1 {
		return errors.New("at least one recovered item is required to publish")
	}

	var imageCount int
	err = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_images WHERE project_id = $1 AND COALESCE(is_step_image, FALSE) = FALSE`, projectID).Scan(&imageCount)
	if err != nil {
		return err
	}
	if imageCount < 1 {
		return errors.New("at least one image is required to publish")
	}

	var subscriptionType string
	err = r.db.QueryRow(`SELECT COALESCE(subscription_type, 'decouverte') FROM users WHERE id = $1`, proUserID).Scan(&subscriptionType)
	if err != nil {
		return err
	}
	subscriptionType = strings.TrimSpace(strings.ToLower(subscriptionType))

	var detailImageCount int
	err = r.db.QueryRow(`
		SELECT COUNT(*)
		FROM upcycling_project_images
		WHERE project_id = $1 AND image_type = 'autre' AND COALESCE(is_step_image, FALSE) = FALSE
	`, projectID).Scan(&detailImageCount)
	if err != nil {
		return err
	}

	switch subscriptionType {
	case "", "decouverte", "gratuit", "none":
		if detailImageCount > 0 {
			return errors.New("les images detail ne sont pas disponibles avec l'offre Decouverte")
		}
	case "pro_essentiel":
		if detailImageCount > 3 {
			return errors.New("vous avez atteint la limite de 3 images detail pour l'offre Pro Essentiel")
		}
	}

	var stepsRaw string
	err = r.db.QueryRow(`SELECT COALESCE(project_steps::text, '[]') FROM upcycling_projects WHERE id = $1`, projectID).Scan(&stepsRaw)
	if err != nil {
		return err
	}
	if err := validateProjectStepsForSubscription(subscriptionType, parseProjectSteps(stepsRaw)); err != nil {
		return err
	}

	return nil
}

func validateImagePayload(dataURL string) error {
	trimmed := strings.TrimSpace(dataURL)
	if trimmed == "" {
		return errors.New("image url is required")
	}
	if !strings.HasPrefix(trimmed, "data:") {
		return errors.New("invalid image format: data URL expected")
	}
	comma := strings.Index(trimmed, ",")
	if comma <= 0 || comma >= len(trimmed)-1 {
		return errors.New("invalid image payload")
	}
	header := strings.ToLower(trimmed[:comma])
	if !strings.Contains(header, ";base64") {
		return errors.New("invalid image payload: base64 expected")
	}
	allowedFormats := []string{"data:image/jpeg", "data:image/jpg", "data:image/png", "data:image/webp"}
	allowed := false
	for _, format := range allowedFormats {
		if strings.HasPrefix(header, format) {
			allowed = true
			break
		}
	}
	if !allowed {
		return errors.New("unsupported image format; allowed: jpg, jpeg, png, webp")
	}
	payload := trimmed[comma+1:]
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		decoded, err = base64.RawStdEncoding.DecodeString(payload)
		if err != nil {
			return errors.New("invalid base64 image payload")
		}
	}
	if len(decoded) > maxProjectImageBytes {
		return errors.New("image too large (max 5MB)")
	}
	return nil
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	buf := [20]byte{}
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + (v % 10))
		v /= 10
	}
	return string(buf[i:])
}

// ToggleLike ajoute ou retire un like d'un projet par un utilisateur.
func (r *Repository) ToggleLike(projectID, userID int64) (bool, int, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM upcycling_project_likes WHERE project_id = $1 AND user_id = $2)`, projectID, userID).Scan(&exists)
	if err != nil {
		return false, 0, err
	}

	if exists {
		_, err = r.db.Exec(`DELETE FROM upcycling_project_likes WHERE project_id = $1 AND user_id = $2`, projectID, userID)
	} else {
		_, err = r.db.Exec(`INSERT INTO upcycling_project_likes (project_id, user_id) VALUES ($1, $2)`, projectID, userID)
	}
	if err != nil {
		return false, 0, err
	}

	var count int
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_likes WHERE project_id = $1`, projectID).Scan(&count)
	return !exists, count, nil
}

// ToggleBookmark ajoute ou retire un favori d'un projet par un utilisateur.
func (r *Repository) ToggleBookmark(projectID, userID int64) (bool, int, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM upcycling_project_bookmarks WHERE project_id = $1 AND user_id = $2)`, projectID, userID).Scan(&exists)
	if err != nil {
		return false, 0, err
	}

	if exists {
		_, err = r.db.Exec(`DELETE FROM upcycling_project_bookmarks WHERE project_id = $1 AND user_id = $2`, projectID, userID)
	} else {
		_, err = r.db.Exec(`INSERT INTO upcycling_project_bookmarks (project_id, user_id) VALUES ($1, $2)`, projectID, userID)
	}
	if err != nil {
		return false, 0, err
	}

	var count int
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_bookmarks WHERE project_id = $1`, projectID).Scan(&count)
	return !exists, count, nil
}

// ParticulierListFavorites retourne la liste des projets likés ou enregistrés par l'utilisateur.
func (r *Repository) ParticulierListFavorites(userID int64) ([]Project, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       COALESCE(NULLIF(TRIM(u.company_name), ''), 'Professionnel'),
		       u.created_at,
		       `+sqlExprCorrelatedProUCConnectScore+` AS pro_total_uc_score,
		       COALESCE((
		         SELECT COUNT(*)
		         FROM upcycling_projects p3
		         WHERE p3.pro_user_id = u.id
		           AND p3.created_at >= u.created_at
		       )::int, 0) AS pro_projects_since_signup,
		       COALESCE(preview.url, ''),
		       COALESCE(before_img.url, ''),
		       COALESCE(after_img.url, ''),
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       (SELECT COUNT(pi.id) FROM upcycling_project_items pi WHERE pi.project_id = p.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i3.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i3 ON i3.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       `+sqlExprCorrelatedProjectPublishedUCScore+` AS upcycling_score,
		       (SELECT COUNT(*) FROM upcycling_project_likes WHERE project_id = p.id) AS like_count,
		       (SELECT COUNT(*) FROM upcycling_project_bookmarks WHERE project_id = p.id) AS bookmark_count,
		       EXISTS(SELECT 1 FROM upcycling_project_likes WHERE project_id = p.id AND user_id = $1) AS is_liked,
		       EXISTS(SELECT 1 FROM upcycling_project_bookmarks WHERE project_id = p.id AND user_id = $1) AS is_bookmarked,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		JOIN users u ON u.id = p.pro_user_id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE
			ORDER BY CASE
				WHEN img.image_type = 'apres' THEN 0
				WHEN img.image_type = 'avant' THEN 1
				ELSE 2
			END,
			img.added_at DESC
			LIMIT 1
		) preview ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'avant'
			ORDER BY img.added_at DESC
			LIMIT 1
		) before_img ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND COALESCE(img.is_step_image, FALSE) = FALSE AND img.image_type = 'apres'
			ORDER BY img.added_at DESC
			LIMIT 1
		) after_img ON TRUE
		WHERE (
		  EXISTS(SELECT 1 FROM upcycling_project_likes l WHERE l.project_id = p.id AND l.user_id = $1)
		  OR
		  EXISTS(SELECT 1 FROM upcycling_project_bookmarks b WHERE b.project_id = p.id AND b.user_id = $1)
		)
		AND p.status = 'publie' AND p.moderation_status = 'approved'
		GROUP BY p.id, preview.url, before_img.url, after_img.url, u.id, u.firstname, u.lastname, u.company_name, u.created_at
		ORDER BY p.updated_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.ProCompanyName, &p.ProJoinedAt, &p.ProTotalUCScore, &p.ProProjectsSinceSignup,
			&p.PreviewImage, &p.BeforeImage, &p.AfterImage,
			&p.Title, &p.Description, &p.Category, &p.Status,
			&p.ModerationStatus, &p.ModerationNote,
			&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore,
			&p.LikeCount, &p.BookmarkCount, &p.IsLiked, &p.IsBookmarked,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.TotalWeightKg = p.TotalWeightGrams / 1000.0
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []Project{}
	}
	return projects, nil
}

// TrackFeedImpressions incrémente les impressions des projets affichés dans le fil pour un utilisateur.
func (r *Repository) TrackFeedImpressions(projectIDs []int64, userID int64) error {
	if userID <= 0 || len(projectIDs) == 0 {
		return nil
	}
	for _, projectID := range projectIDs {
		if projectID <= 0 {
			continue
		}
		var ownerID int64
		if err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID); err != nil {
			continue
		}
		if ownerID == userID {
			continue
		}
		_, err := r.db.Exec(`
			INSERT INTO upcycling_project_feed_metrics (project_id, user_id, impressions, clicks, last_seen_at)
			VALUES ($1, $2, 1, 0, NOW())
			ON CONFLICT (project_id, user_id)
			DO UPDATE SET impressions = upcycling_project_feed_metrics.impressions + 1,
			              last_seen_at = NOW()
		`, projectID, userID)
		if err != nil {
			return err
		}
	}
	return nil
}

// TrackProjectClick incrémente le nombre de clics depuis le fil pour un projet et un utilisateur.
func (r *Repository) TrackProjectClick(projectID, userID int64) error {
	if projectID <= 0 || userID <= 0 {
		return nil
	}
	var ownerID int64
	if err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID); err != nil {
		return nil
	}
	if ownerID == userID {
		return nil
	}
	_, err := r.db.Exec(`
		INSERT INTO upcycling_project_feed_metrics (project_id, user_id, impressions, clicks, last_seen_at)
		VALUES ($1, $2, 0, 1, NOW())
		ON CONFLICT (project_id, user_id)
		DO UPDATE SET clicks = upcycling_project_feed_metrics.clicks + 1,
		              last_seen_at = NOW()
	`, projectID, userID)
	return err
}

// GetProjectAnalytics retourne les statistiques d'un projet pour son propriétaire (offres Essentiel/Premium).
func (r *Repository) GetProjectAnalytics(projectID, proUserID int64) (*ProjectAnalytics, error) {
	var ownerID int64
	if err := r.db.QueryRow(`SELECT pro_user_id FROM upcycling_projects WHERE id = $1`, projectID).Scan(&ownerID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}
	if ownerID != proUserID {
		return nil, errors.New("project not found or not yours")
	}

	subscriptionType, err := r.getSubscriptionTypeForPro(proUserID)
	if err != nil {
		return nil, err
	}
	switch subscriptionType {
	case "", "decouverte", "gratuit", "none":
		return nil, errors.New("stats reservees aux offres Pro Essentiel et Premium Atelier")
	}

	stats := &ProjectAnalytics{}
	_ = r.db.QueryRow(`
		SELECT COALESCE(SUM(impressions), 0), COALESCE(SUM(clicks), 0)
		FROM upcycling_project_feed_metrics
		WHERE project_id = $1 AND user_id <> $2
	`, projectID, proUserID).Scan(&stats.ImpressionCount, &stats.ClickCount)
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_likes WHERE project_id = $1 AND user_id <> $2`, projectID, proUserID).Scan(&stats.LikeCount)
	_ = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_bookmarks WHERE project_id = $1 AND user_id <> $2`, projectID, proUserID).Scan(&stats.BookmarkCount)

	if stats.ClickCount > 0 {
		stats.LikeConversionPct = (float64(stats.LikeCount) / float64(stats.ClickCount)) * 100.0
		stats.BookmarkConversionPct = (float64(stats.BookmarkCount) / float64(stats.ClickCount)) * 100.0
	}

	return stats, nil
}
