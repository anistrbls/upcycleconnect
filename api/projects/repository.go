package projects

import (
	"encoding/base64"
	"database/sql"
	"errors"
	"log"
	"strings"
)

const (
	maxProjectImageCount = 20
	maxProjectImageBytes = 5 * 1024 * 1024
)

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
			category          TEXT NOT NULL DEFAULT '',
			status            TEXT NOT NULL DEFAULT 'brouillon',
			moderation_status TEXT NOT NULL DEFAULT 'pending',
			moderation_note   TEXT NOT NULL DEFAULT '',
			created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT upcycling_projects_status_check CHECK (status IN ('brouillon', 'publie')),
			CONSTRAINT upcycling_projects_modstatus_check CHECK (moderation_status IN ('pending', 'approved', 'rejected'))
		)`,
		`ALTER TABLE upcycling_projects ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending'`,
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
			added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT upcycling_project_images_type_check CHECK (image_type IN ('avant', 'apres', 'autre'))
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
		       COALESCE((
		         SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		         WHERE upi.project_id = p.id
		       ), 0) AS upcycling_score,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id
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
		       COALESCE((
		         SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
		         FROM upcycling_projects p2
		         LEFT JOIN upcycling_project_items upi ON upi.project_id = p2.id
		         LEFT JOIN items i ON i.id = upi.item_id
		         LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		         WHERE p2.pro_user_id = u.id
		       )::double precision, 0::double precision) AS total_uc_score,
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
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       (SELECT COUNT(*) FROM upcycling_project_items pi WHERE pi.project_id = p.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       COALESCE((
		         SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		         WHERE upi.project_id = p.id
		       ), 0) AS upcycling_score,
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
	err := r.db.QueryRow(query, args...).Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.Title, &p.Description,
		&p.Category, &p.Status, &p.ModerationStatus, &p.ModerationNote,
		&p.ItemCount, &p.TotalWeightGrams, &p.UpcyclingScore, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found")
		}
		return nil, err
	}
	p.TotalWeightKg = p.TotalWeightGrams / 1000.0
	return &p, nil
}

// Create crée un nouveau projet et retourne l'entité créée.
func (r *Repository) Create(proUserID int64, payload CreatePayload) (*Project, error) {
	status := StatusDraft
	if payload.Status == StatusPublished {
		status = StatusPublished
	}
	var p Project
	err := r.db.QueryRow(`
		INSERT INTO upcycling_projects (pro_user_id, title, description, category, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, pro_user_id, title, description, category, status, moderation_status, moderation_note, created_at, updated_at
	`, proUserID, payload.Title, payload.Description, payload.Category, status).Scan(
		&p.ID, &p.ProUserID, &p.Title, &p.Description, &p.Category, &p.Status,
		&p.ModerationStatus, &p.ModerationNote, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
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
	var p Project
	err := r.db.QueryRow(`
		UPDATE upcycling_projects
		SET title = $1, description = $2, category = $3, status = $4, updated_at = NOW()
		WHERE id = $5 AND pro_user_id = $6
		RETURNING id, pro_user_id, title, description, category, status, moderation_status, moderation_note, created_at, updated_at
	`, payload.Title, payload.Description, payload.Category, status, id, proUserID).Scan(
		&p.ID, &p.ProUserID, &p.Title, &p.Description, &p.Category, &p.Status,
		&p.ModerationStatus, &p.ModerationNote, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("project not found or not yours")
		}
		return nil, err
	}
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
		WHERE project_id = $1
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
	var imageCount int
	err = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_images WHERE project_id = $1`, projectID).Scan(&imageCount)
	if err != nil {
		return nil, err
	}
	if imageCount >= maxProjectImageCount {
		return nil, errors.New("image limit reached for this project")
	}
	validTypes := map[string]bool{"avant": true, "apres": true, "autre": true}
	if !validTypes[imageType] {
		imageType = "autre"
	}
	var img ProjectImage
	err = r.db.QueryRow(`
		INSERT INTO upcycling_project_images (project_id, url, image_type)
		VALUES ($1, $2, $3)
		RETURNING id, project_id, url, image_type, added_at
	`, projectID, url, imageType).Scan(&img.ID, &img.ProjectID, &img.URL, &img.ImageType, &img.AddedAt)
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
func (r *Repository) AdminListAll(statusFilter, moderationStatusFilter string) ([]Project, error) {
	query := `
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       COALESCE(preview.url, ''),
		       p.title, p.description, p.category, p.status,
		       p.moderation_status, p.moderation_note,
		       COUNT(pi.id) AS item_count,
		       COALESCE((
		         SELECT SUM(COALESCE(i.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       COALESCE((
		         SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		         WHERE upi.project_id = p.id
		       ), 0) AS upcycling_score,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		LEFT JOIN upcycling_project_items pi ON pi.project_id = p.id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id
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
	query += ` GROUP BY p.id, preview.url, u.firstname, u.lastname ORDER BY p.updated_at DESC`

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var projects []Project
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.ProUserID, &p.ProDisplayName, &p.PreviewImage,
			&p.Title, &p.Description, &p.Category, &p.Status,
			&p.ModerationStatus, &p.ModerationNote,
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

// ParticulierListPosted retourne les projets publiés et validés pour l'espace particulier.
func (r *Repository) ParticulierListPosted() ([]Project, error) {
	rows, err := r.db.Query(`
		SELECT p.id, p.pro_user_id,
		       TRIM(COALESCE(u.firstname,'') || ' ' || COALESCE(u.lastname,'')),
		       u.created_at,
		       COALESCE((
		         SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
		         FROM upcycling_projects p2
		         LEFT JOIN upcycling_project_items upi ON upi.project_id = p2.id
		         LEFT JOIN items i ON i.id = upi.item_id
		         LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		         WHERE p2.pro_user_id = u.id
		       ), 0) AS pro_total_uc_score,
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
		         SELECT SUM(COALESCE(i.weight_grams, 0))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         WHERE upi.project_id = p.id
		       ), 0) AS total_weight_grams,
		       COALESCE((
		         SELECT SUM((COALESCE(i.weight_grams, 0) / 1000.0) * COALESCE(im.impact_coefficient, 1))
		         FROM upcycling_project_items upi
		         JOIN items i ON i.id = upi.item_id
		         LEFT JOIN item_materials im ON LOWER(TRIM(im.label)) = LOWER(TRIM(i.material))
		         WHERE upi.project_id = p.id
		       ), 0) AS upcycling_score,
		       p.created_at, p.updated_at
		FROM upcycling_projects p
		LEFT JOIN upcycling_project_items pi ON pi.project_id = p.id
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id
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
			WHERE img.project_id = p.id AND img.image_type = 'avant'
			ORDER BY img.added_at DESC
			LIMIT 1
		) before_img ON TRUE
		LEFT JOIN LATERAL (
			SELECT img.url
			FROM upcycling_project_images img
			WHERE img.project_id = p.id AND img.image_type = 'apres'
			ORDER BY img.added_at DESC
			LIMIT 1
		) after_img ON TRUE
		JOIN users u ON u.id = p.pro_user_id
		WHERE p.status = 'publie' AND p.moderation_status = 'approved'
		GROUP BY p.id, preview.url, before_img.url, after_img.url, u.id, u.firstname, u.lastname, u.created_at
		ORDER BY p.updated_at DESC
	`)
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

// AdminModerate met à jour le statut de modération d'un projet.
func (r *Repository) AdminModerate(projectID int64, moderationStatus, note string) error {
	valid := map[string]bool{"pending": true, "approved": true, "rejected": true}
	if !valid[moderationStatus] {
		return errors.New("invalid moderation status")
	}
	res, err := r.db.Exec(`
		UPDATE upcycling_projects
		SET moderation_status = $1,
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
	err = r.db.QueryRow(`SELECT COUNT(*) FROM upcycling_project_images WHERE project_id = $1`, projectID).Scan(&imageCount)
	if err != nil {
		return err
	}
	if imageCount < 1 {
		return errors.New("at least one image is required to publish")
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
