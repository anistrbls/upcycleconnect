package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Valeurs autorisées pour les métadonnées des conseils (type = conseil).
// Les catégories et matériaux sont gérés en base (conseil_categories, item_materials).

var validConseilDifficulties = map[string]bool{
	"Débutant": true, "Intermédiaire": true, "Avancé": true,
}

var validConseilAudiences = map[string]bool{
	"Particuliers": true, "Professionnels": true, "Tous": true,
}

// ConseilToolPayload représente un outil lié à un conseil.
type ConseilToolPayload struct {
	ID          int64  `json:"id,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ImageUrl    string `json:"imageUrl"`
	ExternalUrl string `json:"externalUrl"`
	SortOrder   int    `json:"sortOrder"`
}

// ConseilMetaPayload champs pédagogiques d'un conseil.
type ConseilMetaPayload struct {
	Category           string               `json:"category"`
	TargetAudience     []string             `json:"targetAudience"`
	DifficultyLevel    string               `json:"difficultyLevel"`
	EstimatedTime      string               `json:"estimatedTime"` // libellé affiché (généré côté serveur)
	EstimatedTimeValue *float64             `json:"estimatedTimeValue"`
	EstimatedTimeUnit  string               `json:"estimatedTimeUnit"`

	estimatedTimeMinutes     int64
	estimatedTimeValueStored float64
	Materials          []string             `json:"materials"`
	SafetyTips         string               `json:"safetyTips"`
	Summary            string               `json:"summary"`
	Tags               []string             `json:"tags"`
	ExternalUrl        string               `json:"externalUrl"`
	ScheduledPublishAt string               `json:"scheduledPublishAt"`
	Tools              []ConseilToolPayload `json:"tools"`
}

type conseilContentRow struct {
	ID                 int64
	UserID             int64
	ContentType        string
	Title              string
	Body               string
	Status             string
	RejectionComment   string
	ImageURL           string
	PhotosJSON         string
	IsPinned           bool
	Category           string
	TargetAudienceJSON string
	DifficultyLevel    string
	EstimatedTime        string
	EstimatedTimeMinutes int64
	EstimatedTimeValue   float64
	EstimatedTimeUnit    string
	MaterialsJSON        string
	SafetyTips         string
	Summary            string
	TagsJSON           string
	ExternalURL        string
	ScheduledPublishAt sql.NullTime
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func ensureConseilExtendedSchema() error {
	alters := []string{
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT '[]'`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS estimated_time TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS estimated_time_minutes BIGINT NOT NULL DEFAULT 0`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS estimated_time_value DOUBLE PRECISION NOT NULL DEFAULT 0`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS estimated_time_unit TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS materials TEXT NOT NULL DEFAULT '[]'`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS safety_tips TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '[]'`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS external_url TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ`,
		`ALTER TABLE salarie_contents ADD COLUMN IF NOT EXISTS photos TEXT NOT NULL DEFAULT '[]'`,
		`CREATE TABLE IF NOT EXISTS conseil_tools (
			id          BIGSERIAL PRIMARY KEY,
			content_id  BIGINT NOT NULL REFERENCES salarie_contents(id) ON DELETE CASCADE,
			name        TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			image_url   TEXT NOT NULL DEFAULT '',
			external_url TEXT NOT NULL DEFAULT '',
			sort_order  INT NOT NULL DEFAULT 0,
			created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_conseil_tools_content_id ON conseil_tools(content_id)`,
	}
	for _, stmt := range alters {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return ensureConseilCategoriesSchema()
}

func ensureConseilCategoriesSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS conseil_categories (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL UNIQUE,
			position   INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_conseil_categories_position ON conseil_categories(position)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM conseil_categories`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		defaults := []string{
			"Réparation", "Transformation", "Décoration", "Entretien", "Sécurité",
			"Inspiration", "Tri et préparation", "Éco-conception", "Bonnes pratiques", "Tutoriel DIY",
		}
		for i, label := range defaults {
			if _, err := db.Exec(
				`INSERT INTO conseil_categories (label, position) VALUES ($1, $2)`,
				label, i,
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func isValidConseilCategoryLabel(label string) bool {
	var exists bool
	err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM conseil_categories WHERE label = $1)`, label).Scan(&exists)
	return err == nil && exists
}

func conseilMetaSelectCols() string {
	return `sc.category, sc.target_audience, sc.difficulty_level,
		sc.estimated_time, sc.estimated_time_minutes, sc.estimated_time_value, sc.estimated_time_unit,
		sc.materials, sc.safety_tips, sc.summary, sc.tags, sc.external_url, sc.scheduled_publish_at`
}

func parseStringArrayJSON(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "[]" {
		return []string{}
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return []string{}
	}
	return out
}

const maxConseilPhotos = 10

// resolveConseilMedia harmonise la liste de photos et l'URL de couverture (image principale).
func resolveConseilMedia(imageURL string, photos []string) (cover string, photosJSON string) {
	clean := make([]string, 0, len(photos))
	seen := map[string]bool{}
	for _, p := range photos {
		s := strings.TrimSpace(p)
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		clean = append(clean, s)
		if len(clean) >= maxConseilPhotos {
			break
		}
	}
	cover = strings.TrimSpace(imageURL)
	if cover != "" {
		if !seen[cover] {
			clean = append([]string{cover}, clean...)
			if len(clean) > maxConseilPhotos {
				clean = clean[:maxConseilPhotos]
			}
		}
	} else if len(clean) > 0 {
		cover = clean[0]
	}
	return cover, encodeStringArrayJSON(clean)
}

func photosFromContentRow(row conseilContentRow) []string {
	photos := parseStringArrayJSON(row.PhotosJSON)
	if len(photos) == 0 && strings.TrimSpace(row.ImageURL) != "" {
		return []string{row.ImageURL}
	}
	return photos
}

func encodeStringArrayJSON(items []string) string {
	clean := make([]string, 0, len(items))
	seen := map[string]bool{}
	for _, it := range items {
		s := strings.TrimSpace(it)
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		clean = append(clean, s)
	}
	if len(clean) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(clean)
	return string(b)
}

func normalizeConseilMeta(meta *ConseilMetaPayload) {
	if meta == nil {
		return
	}
	meta.Category = strings.TrimSpace(meta.Category)
	meta.DifficultyLevel = strings.TrimSpace(meta.DifficultyLevel)
	meta.EstimatedTimeUnit = strings.TrimSpace(meta.EstimatedTimeUnit)
	meta.SafetyTips = strings.TrimSpace(meta.SafetyTips)
	meta.Summary = strings.TrimSpace(meta.Summary)
	meta.ExternalUrl = strings.TrimSpace(meta.ExternalUrl)
	meta.ScheduledPublishAt = strings.TrimSpace(meta.ScheduledPublishAt)
	meta.TargetAudience = normalizeConseilTargetAudience(meta.TargetAudience)
	meta.Materials = dedupeTrimmed(meta.Materials)
	meta.Tags = dedupeTrimmed(meta.Tags)
}

// normalizeConseilTargetAudience : « Tous » seul ; sinon Particuliers et/ou Professionnels (exclusifs de Tous).
func normalizeConseilTargetAudience(audiences []string) []string {
	clean := make([]string, 0, len(audiences))
	seen := map[string]bool{}
	for _, it := range audiences {
		s := strings.TrimSpace(it)
		if s == "" || s == "Artisans" || seen[s] {
			continue
		}
		if !validConseilAudiences[s] {
			continue
		}
		seen[s] = true
		clean = append(clean, s)
	}
	for _, a := range clean {
		if a == "Tous" {
			return []string{"Tous"}
		}
	}
	return clean
}

// conseilVisibleForRole indique si un conseil publié est visible pour le rôle connecté.
func conseilVisibleForRole(targetAudienceJSON, role string) bool {
	switch role {
	case "admin", "salarie":
		return true
	case "particulier", "professionnel":
		audiences := parseStringArrayJSON(targetAudienceJSON)
		if len(audiences) == 0 {
			return true
		}
		for _, a := range audiences {
			if a == "Tous" {
				return true
			}
		}
		if role == "particulier" {
			for _, a := range audiences {
				if a == "Particuliers" {
					return true
				}
			}
			return false
		}
		for _, a := range audiences {
			if a == "Professionnels" {
				return true
			}
		}
		return false
	default:
		return true
	}
}

func conseilFeedAudienceClause(role string) string {
	switch role {
	case "particulier":
		return ` AND (sc.target_audience LIKE '%"Tous"%' OR sc.target_audience LIKE '%"Particuliers"%' OR sc.target_audience IN ('[]', ''))`
	case "professionnel":
		return ` AND (sc.target_audience LIKE '%"Tous"%' OR sc.target_audience LIKE '%"Professionnels"%' OR sc.target_audience IN ('[]', ''))`
	default:
		return ""
	}
}

func dedupeTrimmed(items []string) []string {
	out := make([]string, 0, len(items))
	seen := map[string]bool{}
	for _, it := range items {
		s := strings.TrimSpace(it)
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}

func validateConseilMeta(meta ConseilMetaPayload, requireFull bool) error {
	normalizeConseilMeta(&meta)
	if err := resolveEstimatedTime(&meta); err != nil {
		return err
	}
	if requireFull {
		if meta.Category == "" {
			return fmt.Errorf("category is required")
		}
		if !isValidConseilCategoryLabel(meta.Category) {
			return fmt.Errorf("invalid category")
		}
		if len(meta.TargetAudience) == 0 {
			return fmt.Errorf("targetAudience is required")
		}
		for _, a := range meta.TargetAudience {
			if !validConseilAudiences[a] {
				return fmt.Errorf("invalid target audience: %s", a)
			}
		}
		if meta.DifficultyLevel == "" {
			return fmt.Errorf("difficultyLevel is required")
		}
		if !validConseilDifficulties[meta.DifficultyLevel] {
			return fmt.Errorf("invalid difficultyLevel")
		}
	}
	if meta.Category != "" && !isValidConseilCategoryLabel(meta.Category) {
		return fmt.Errorf("invalid category")
	}
	if meta.DifficultyLevel != "" && !validConseilDifficulties[meta.DifficultyLevel] {
		return fmt.Errorf("invalid difficultyLevel")
	}
	for _, a := range meta.TargetAudience {
		if !validConseilAudiences[a] {
			return fmt.Errorf("invalid target audience")
		}
	}
	for _, m := range meta.Materials {
		if len([]rune(m)) > 120 {
			return fmt.Errorf("material label must be at most 120 characters")
		}
	}
	if meta.Summary != "" && len([]rune(meta.Summary)) > 250 {
		return fmt.Errorf("summary must be at most 250 characters")
	}
	if meta.ScheduledPublishAt != "" {
		if _, err := time.Parse(time.RFC3339, meta.ScheduledPublishAt); err != nil {
			if _, err2 := time.Parse("2006-01-02T15:04", meta.ScheduledPublishAt); err2 != nil {
				if _, err3 := time.Parse("2006-01-02", meta.ScheduledPublishAt); err3 != nil {
					return fmt.Errorf("invalid scheduledPublishAt")
				}
			}
		}
	}
	for i, tool := range meta.Tools {
		if strings.TrimSpace(tool.Name) == "" {
			return fmt.Errorf("tool name is required at index %d", i)
		}
	}
	return nil
}

func parseScheduledPublishAt(raw string) (sql.NullTime, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return sql.NullTime{}, nil
	}
	formats := []string{time.RFC3339, "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04", "2006-01-02"}
	for _, f := range formats {
		if t, err := time.Parse(f, raw); err == nil {
			return sql.NullTime{Time: t.UTC(), Valid: true}, nil
		}
	}
	return sql.NullTime{}, fmt.Errorf("invalid scheduledPublishAt")
}

func loadConseilTools(contentID int64) ([]map[string]interface{}, error) {
	rows, err := db.Query(`
		SELECT id, name, description, image_url, external_url, sort_order
		FROM conseil_tools
		WHERE content_id = $1
		ORDER BY sort_order ASC, id ASC
	`, contentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var name, description, imageURL, externalURL string
		var sortOrder int
		if err := rows.Scan(&id, &name, &description, &imageURL, &externalURL, &sortOrder); err != nil {
			return nil, err
		}
		items = append(items, map[string]interface{}{
			"id": id, "name": name, "description": description,
			"imageUrl": imageURL, "externalUrl": externalURL, "sortOrder": sortOrder,
		})
	}
	return items, nil
}

func replaceConseilTools(contentID int64, tools []ConseilToolPayload) error {
	if _, err := db.Exec(`DELETE FROM conseil_tools WHERE content_id = $1`, contentID); err != nil {
		return err
	}
	for i, tool := range tools {
		name := strings.TrimSpace(tool.Name)
		if name == "" {
			continue
		}
		sortOrder := tool.SortOrder
		if sortOrder == 0 {
			sortOrder = i + 1
		}
		_, err := db.Exec(`
			INSERT INTO conseil_tools (content_id, name, description, image_url, external_url, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, contentID, name, strings.TrimSpace(tool.Description), strings.TrimSpace(tool.ImageUrl),
			strings.TrimSpace(tool.ExternalUrl), sortOrder)
		if err != nil {
			return err
		}
	}
	return nil
}

func conseilMetaToMap(row conseilContentRow, tools []map[string]interface{}) map[string]interface{} {
	m := map[string]interface{}{
		"category":        row.Category,
		"targetAudience":  parseStringArrayJSON(row.TargetAudienceJSON),
		"difficultyLevel": row.DifficultyLevel,
		"materials":       parseStringArrayJSON(row.MaterialsJSON),
		"safetyTips":      row.SafetyTips,
		"summary":         row.Summary,
		"tags":            parseStringArrayJSON(row.TagsJSON),
		"externalUrl":     row.ExternalURL,
		"tools":           tools,
	}
	if row.ScheduledPublishAt.Valid {
		m["scheduledPublishAt"] = row.ScheduledPublishAt.Time.UTC().Format(time.RFC3339)
	} else {
		m["scheduledPublishAt"] = nil
	}
	appendEstimatedTimeToMap(m, row)
	return m
}

func appendConseilMetaToItem(item map[string]interface{}, row conseilContentRow, tools []map[string]interface{}) {
	if row.ContentType != "conseil" {
		return
	}
	for k, v := range conseilMetaToMap(row, tools) {
		item[k] = v
	}
}

func scanConseilContentRow(scanner interface {
	Scan(dest ...interface{}) error
}, includeMeta bool) (conseilContentRow, error) {
	var row conseilContentRow
	var err error
	if includeMeta {
		err = scanner.Scan(
			&row.ID, &row.UserID, &row.ContentType, &row.Title, &row.Body, &row.Status,
			&row.RejectionComment, &row.ImageURL, &row.PhotosJSON, &row.IsPinned,
			&row.Category, &row.TargetAudienceJSON, &row.DifficultyLevel,
			&row.EstimatedTime, &row.EstimatedTimeMinutes, &row.EstimatedTimeValue, &row.EstimatedTimeUnit,
			&row.MaterialsJSON, &row.SafetyTips, &row.Summary, &row.TagsJSON, &row.ExternalURL,
			&row.ScheduledPublishAt, &row.CreatedAt, &row.UpdatedAt,
		)
	} else {
		err = scanner.Scan(
			&row.ID, &row.UserID, &row.ContentType, &row.Title, &row.Body, &row.Status,
			&row.RejectionComment, &row.ImageURL, &row.CreatedAt, &row.UpdatedAt,
		)
	}
	return row, err
}

func feedScheduledClause() string {
	return ` AND (sc.scheduled_publish_at IS NULL OR sc.scheduled_publish_at <= NOW())`
}

func buildConseilFilterClause(filters map[string]string, startArg int) (string, []interface{}) {
	clauses := make([]string, 0)
	args := make([]interface{}, 0)
	argN := startArg

	add := func(cond string, val interface{}) {
		clauses = append(clauses, cond)
		args = append(args, val)
		argN++
	}

	if v := strings.TrimSpace(filters["category"]); v != "" {
		add(fmt.Sprintf("sc.category = $%d", argN), v)
	}
	if v := strings.TrimSpace(filters["difficulty"]); v != "" {
		add(fmt.Sprintf("sc.difficulty_level = $%d", argN), v)
	}
	if v := strings.TrimSpace(filters["material"]); v != "" {
		add(fmt.Sprintf("sc.materials LIKE $%d", argN), "%\""+strings.ReplaceAll(v, "\"", "")+"\"%")
	}
	if v := strings.TrimSpace(filters["audience"]); v != "" {
		add(fmt.Sprintf("sc.target_audience LIKE $%d", argN), "%\""+strings.ReplaceAll(v, "\"", "")+"\"%")
	}

	if len(clauses) == 0 {
		return "", args
	}
	return " AND " + strings.Join(clauses, " AND "), args
}

func writeConseilValidationError(w http.ResponseWriter, err error) {
	writeError(w, http.StatusBadRequest, err.Error())
}

func insertSalarieContentWithMeta(userID int64, contentType, title, body, status, imageURL, photosJSON string, meta ConseilMetaPayload) (int64, time.Time, time.Time, error) {
	scheduled, err := parseScheduledPublishAt(meta.ScheduledPublishAt)
	if err != nil {
		return 0, time.Time{}, time.Time{}, err
	}
	var id int64
	var createdAt, updatedAt time.Time
	err = db.QueryRow(`
		INSERT INTO salarie_contents (
			user_id, type, title, body, status, image_url, photos,
			category, target_audience, difficulty_level,
			estimated_time, estimated_time_minutes, estimated_time_value, estimated_time_unit,
			materials, safety_tips, summary, tags, external_url, scheduled_publish_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		RETURNING id, created_at, updated_at
	`, userID, contentType, title, body, status, imageURL, photosJSON,
		meta.Category, encodeStringArrayJSON(meta.TargetAudience), meta.DifficultyLevel,
		meta.EstimatedTime, meta.estimatedTimeMinutes, meta.estimatedTimeValueStored, meta.EstimatedTimeUnit,
		encodeStringArrayJSON(meta.Materials), meta.SafetyTips, meta.Summary,
		encodeStringArrayJSON(meta.Tags), meta.ExternalUrl, scheduled,
	).Scan(&id, &createdAt, &updatedAt)
	if err != nil {
		return 0, time.Time{}, time.Time{}, err
	}
	if contentType == "conseil" {
		if err := replaceConseilTools(id, meta.Tools); err != nil {
			return 0, time.Time{}, time.Time{}, err
		}
	}
	return id, createdAt, updatedAt, nil
}

func updateSalarieContentWithMeta(id int64, title, body, status, imageURL, photosJSON string, pinned *bool, meta ConseilMetaPayload) (time.Time, error) {
	scheduled, err := parseScheduledPublishAt(meta.ScheduledPublishAt)
	if err != nil {
		return time.Time{}, err
	}
	var updatedAt time.Time
	if pinned != nil {
		err = db.QueryRow(`
			UPDATE salarie_contents SET
				title = $1, body = $2, status = $3, image_url = $4, photos = $5, is_pinned = $6,
				category = $7, target_audience = $8, difficulty_level = $9,
				estimated_time = $10, estimated_time_minutes = $11, estimated_time_value = $12, estimated_time_unit = $13,
				materials = $14, safety_tips = $15, summary = $16, tags = $17, external_url = $18,
				scheduled_publish_at = $19, updated_at = NOW()
			WHERE id = $20 RETURNING updated_at
		`, title, body, status, imageURL, photosJSON, *pinned,
			meta.Category, encodeStringArrayJSON(meta.TargetAudience), meta.DifficultyLevel,
			meta.EstimatedTime, meta.estimatedTimeMinutes, meta.estimatedTimeValueStored, meta.EstimatedTimeUnit,
			encodeStringArrayJSON(meta.Materials), meta.SafetyTips, meta.Summary,
			encodeStringArrayJSON(meta.Tags), meta.ExternalUrl, scheduled, id,
		).Scan(&updatedAt)
	} else {
		err = db.QueryRow(`
			UPDATE salarie_contents SET
				title = $1, body = $2, status = $3, image_url = $4, photos = $5,
				category = $6, target_audience = $7, difficulty_level = $8,
				estimated_time = $9, estimated_time_minutes = $10, estimated_time_value = $11, estimated_time_unit = $12,
				materials = $13, safety_tips = $14, summary = $15, tags = $16, external_url = $17,
				scheduled_publish_at = $18, updated_at = NOW()
			WHERE id = $19 RETURNING updated_at
		`, title, body, status, imageURL, photosJSON,
			meta.Category, encodeStringArrayJSON(meta.TargetAudience), meta.DifficultyLevel,
			meta.EstimatedTime, meta.estimatedTimeMinutes, meta.estimatedTimeValueStored, meta.EstimatedTimeUnit,
			encodeStringArrayJSON(meta.Materials), meta.SafetyTips, meta.Summary,
			encodeStringArrayJSON(meta.Tags), meta.ExternalUrl, scheduled, id,
		).Scan(&updatedAt)
	}
	if err != nil {
		return time.Time{}, err
	}
	var contentType string
	if err := db.QueryRow(`SELECT type FROM salarie_contents WHERE id = $1`, id).Scan(&contentType); err != nil {
		return time.Time{}, err
	}
	if contentType == "conseil" {
		if err := replaceConseilTools(id, meta.Tools); err != nil {
			return time.Time{}, err
		}
	}
	return updatedAt, nil
}

func buildContentItemFromRow(row conseilContentRow, authorName string, likeCount, favoriteCount int64, includeTools bool) (map[string]interface{}, error) {
	tools := []map[string]interface{}{}
	if includeTools && row.ContentType == "conseil" {
		var err error
		tools, err = loadConseilTools(row.ID)
		if err != nil {
			return nil, err
		}
	}
	photos := photosFromContentRow(row)
	coverURL := strings.TrimSpace(row.ImageURL)
	if coverURL == "" && len(photos) > 0 {
		coverURL = photos[0]
	}
	item := map[string]interface{}{
		"id": row.ID, "userId": row.UserID, "type": row.ContentType,
		"title": row.Title, "body": row.Body, "status": row.Status,
		"rejectionComment": row.RejectionComment, "imageUrl": coverURL,
		"photos": photos, "isPinned": row.IsPinned,
		"createdAt": row.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt": row.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if authorName != "" {
		item["authorName"] = authorName
	}
	if likeCount > 0 || favoriteCount > 0 {
		item["likeCount"] = likeCount
		item["favoriteCount"] = favoriteCount
	}
	appendConseilMetaToItem(item, row, tools)
	return item, nil
}

type conseilCategoryPayload struct {
	Label string `json:"label"`
}

func conseilCategoriesPublicHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	rows, err := db.Query(`SELECT id, label FROM conseil_categories ORDER BY position ASC, id ASC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list conseil categories")
		return
	}
	defer rows.Close()
	result := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int64
		var label string
		if err := rows.Scan(&id, &label); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse conseil category")
			return
		}
		result = append(result, map[string]interface{}{"id": id, "label": label})
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})
}

func conseilCategoriesAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(`SELECT id, label, position, created_at, updated_at FROM conseil_categories ORDER BY position ASC, id ASC`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list conseil categories")
			return
		}
		defer rows.Close()
		result := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id int64
			var pos int
			var label string
			var createdAt, updatedAt time.Time
			if err := rows.Scan(&id, &label, &pos, &createdAt, &updatedAt); err != nil {
				writeError(w, http.StatusInternalServerError, "could not parse conseil category")
				return
			}
			result = append(result, map[string]interface{}{
				"id": id, "label": label,
				"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": result})

	case http.MethodPost:
		var payload conseilCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		var id int64
		var createdAt, updatedAt time.Time
		err := db.QueryRow(`
			INSERT INTO conseil_categories (label, position)
			VALUES ($1, (SELECT COALESCE(MAX(position), -1) + 1 FROM conseil_categories))
			RETURNING id, created_at, updated_at
		`, label).Scan(&id, &createdAt, &updatedAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not create conseil category")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM conseil_categories WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id": id, "label": label,
			"position": pos, "createdAt": createdAt.UTC().Format(time.RFC3339), "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func conseilCategoryByIDAdminHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}
	id, err := parseIDFromPath(r.URL.Path, "/api/admin/conseil-categories/")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category id")
		return
	}
	switch r.Method {
	case http.MethodPut:
		var payload conseilCategoryPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		label := strings.TrimSpace(payload.Label)
		if label == "" {
			writeError(w, http.StatusBadRequest, "label is required")
			return
		}
		var updatedAt time.Time
		err := db.QueryRow(`
			UPDATE conseil_categories SET label = $1, updated_at = NOW()
			WHERE id = $2 RETURNING updated_at
		`, label, id).Scan(&updatedAt)
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") {
				writeError(w, http.StatusConflict, "category label already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "could not update conseil category")
			return
		}
		var pos int
		_ = db.QueryRow(`SELECT position FROM conseil_categories WHERE id = $1`, id).Scan(&pos)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": id, "label": label,
			"position": pos, "updatedAt": updatedAt.UTC().Format(time.RFC3339),
		})

	case http.MethodDelete:
		result, err := db.Exec(`DELETE FROM conseil_categories WHERE id = $1`, id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not delete conseil category")
			return
		}
		n, _ := result.RowsAffected()
		if n == 0 {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

// listConseilMaterialLabelsNotInCatalog retourne les libellés de matériaux utilisés dans des conseils
// publiés ou en brouillon, mais absents du référentiel item_materials.
func listConseilMaterialLabelsNotInCatalog() ([]string, error) {
	catalog := make(map[string]bool)
	catRows, err := db.Query(`SELECT LOWER(TRIM(label)) FROM item_materials`)
	if err != nil {
		return nil, err
	}
	for catRows.Next() {
		var lk string
		if err := catRows.Scan(&lk); err != nil {
			catRows.Close()
			return nil, err
		}
		if lk != "" {
			catalog[lk] = true
		}
	}
	catRows.Close()
	if err := catRows.Err(); err != nil {
		return nil, err
	}

	rows, err := db.Query(`SELECT materials FROM salarie_contents WHERE type = 'conseil'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seen := make(map[string]bool)
	byKey := make(map[string]string)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		for _, label := range parseStringArrayJSON(raw) {
			trimmed := strings.TrimSpace(label)
			if trimmed == "" {
				continue
			}
			key := strings.ToLower(trimmed)
			if catalog[key] || seen[key] {
				continue
			}
			seen[key] = true
			byKey[key] = trimmed
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	out := make([]string, 0, len(byKey))
	for _, label := range byKey {
		out = append(out, label)
	}
	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i]) < strings.ToLower(out[j])
	})
	return out, nil
}
