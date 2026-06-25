package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const defaultI18nLocale = "fr"

var localeCodePattern = regexp.MustCompile(`^[a-z]{2,3}(-[a-z0-9]{2,8})?$`)

type i18nPattern struct {
	Match   string `json:"match"`
	Replace string `json:"replace"`
}

type i18nLanguagePayload struct {
	Code        string            `json:"code"`
	Label       string            `json:"label"`
	NativeLabel string            `json:"nativeLabel"`
	Dir         string            `json:"dir"`
	Enabled     *bool             `json:"enabled"`
	Phrases     map[string]string `json:"phrases"`
	Patterns    []i18nPattern     `json:"patterns"`
}

type i18nLanguageRecord struct {
	Code         string
	Label        string
	NativeLabel  string
	Dir          string
	Enabled      bool
	IsBuiltin    bool
	Phrases      map[string]string
	Patterns     []i18nPattern
	PhraseCount  int
	PatternCount int
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

var builtinI18nLanguages = []i18nLanguageRecord{
	{Code: "fr", Label: "Français", NativeLabel: "Français", Dir: "ltr", Enabled: true, IsBuiltin: true},
	{
		Code:        "en",
		Label:       "Anglais",
		NativeLabel: "English",
		Dir:         "ltr",
		Enabled:     true,
		IsBuiltin:   true,
		Phrases: map[string]string{
			"Connexion":                  "Login",
			"Se connecter":               "Log in",
			"S'inscrire":                 "Sign up",
			"Votre email":                "Your email",
			"Mot de passe":               "Password",
			"Mot de passe oublie ?":      "Forgot password?",
			"Afficher le mot de passe":   "Show password",
			"Pas encore de compte ?":     "No account yet?",
			"Console de gestion":         "Management console",
			"Vérification de session...": "Checking session...",
			"Se déconnecter":             "Log out",
			"Notifications":              "Notifications",
			"Navigation principale":      "Main navigation",
			"Vue globale":                "Overview",
			"Annonces":                   "Listings",
			"Utilisateurs":               "Users",
			"Paramètres":                 "Settings",
			"Configuration":              "Configuration",
			"Préférences générales":      "General preferences",
			"Langues de l'interface":     "Interface languages",
			"Nouvelle langue":            "New language",
			"Catégories d'objets":        "Item categories",
			"États des objets":           "Item conditions",
			"Matériaux":                  "Materials",
			"Pays":                       "Countries",
			"Types de points de dépôt":   "Drop-off point types",
			"Catégories de prestations":  "Service categories",
			"Catégories de conseils":     "Advice categories",
			"Motifs de modération":       "Moderation reasons",
			"Ajouter":                    "Add",
			"Annuler":                    "Cancel",
			"Enregistrer":                "Save",
			"Modifier":                   "Edit",
			"Supprimer":                  "Delete",
			"Chargement...":              "Loading...",
			"Aucun élément. Ajoutez-en un ci-dessus.": "No item yet. Add one above.",
		},
	},
}

func ensureI18nSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS i18n_languages (
			code         TEXT PRIMARY KEY,
			label        TEXT NOT NULL,
			native_label TEXT NOT NULL,
			dir          TEXT NOT NULL DEFAULT 'ltr',
			enabled      BOOLEAN NOT NULL DEFAULT TRUE,
			is_builtin   BOOLEAN NOT NULL DEFAULT FALSE,
			phrases      JSONB NOT NULL DEFAULT '{}'::jsonb,
			patterns     JSONB NOT NULL DEFAULT '[]'::jsonb,
			created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT i18n_languages_code_check CHECK (code ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})?$'),
			CONSTRAINT i18n_languages_dir_check CHECK (dir IN ('ltr', 'rtl'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_i18n_languages_enabled ON i18n_languages(enabled)`,
		`CREATE INDEX IF NOT EXISTS idx_i18n_languages_builtin ON i18n_languages(is_builtin)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	for _, language := range builtinI18nLanguages {
		phrasesJSON, patternsJSON, err := marshalI18nCatalog(language.Phrases, language.Patterns)
		if err != nil {
			return err
		}
		if _, err := db.Exec(`
			INSERT INTO i18n_languages (code, label, native_label, dir, enabled, is_builtin, phrases, patterns)
			VALUES ($1, $2, $3, $4, TRUE, TRUE, $5::jsonb, $6::jsonb)
			ON CONFLICT (code) DO UPDATE SET
				label = EXCLUDED.label,
				native_label = EXCLUDED.native_label,
				dir = EXCLUDED.dir,
				enabled = TRUE,
				is_builtin = TRUE,
				phrases = CASE
					WHEN i18n_languages.phrases = '{}'::jsonb THEN EXCLUDED.phrases
					ELSE i18n_languages.phrases
				END,
				patterns = CASE
					WHEN i18n_languages.patterns = '[]'::jsonb THEN EXCLUDED.patterns
					ELSE i18n_languages.patterns
				END
		`, language.Code, language.Label, language.NativeLabel, language.Dir, string(phrasesJSON), string(patternsJSON)); err != nil {
			return err
		}
	}

	if _, err := db.Exec(`DELETE FROM i18n_languages WHERE code = 'es' AND is_builtin = TRUE`); err != nil {
		return err
	}

	return nil
}

func i18nLanguagesPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT code, label, native_label, dir
		FROM i18n_languages
		WHERE enabled = TRUE
		ORDER BY CASE code WHEN 'fr' THEN 0 WHEN 'en' THEN 1 ELSE 3 END, code ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list languages")
		return
	}
	defer rows.Close()

	locales := make([]map[string]interface{}, 0)
	for rows.Next() {
		var code, label, nativeLabel, dir string
		if err := rows.Scan(&code, &label, &nativeLabel, &dir); err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse language")
			return
		}
		locales = append(locales, map[string]interface{}{
			"code":        code,
			"label":       label,
			"nativeLabel": nativeLabel,
			"dir":         dir,
		})
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "could not list languages")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"defaultLocale": defaultI18nLocale,
		"locales":       locales,
	})
}

func i18nMessagesPublicHandler(w http.ResponseWriter, r *http.Request) {
	code := normalizeLocaleCode(r.PathValue("locale"))
	if !isValidLocaleCode(code) {
		writeError(w, http.StatusBadRequest, "invalid locale code")
		return
	}

	language, err := getI18nLanguage(code)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "language not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load language")
		return
	}

	if !language.Enabled {
		writeError(w, http.StatusNotFound, "language not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"meta": map[string]interface{}{
			"locale": language.Code,
			"name":   language.NativeLabel,
		},
		"i18n": map[string]interface{}{
			"language": language.NativeLabel,
		},
		"phrases":  language.Phrases,
		"patterns": language.Patterns,
	})
}

func i18nLanguagesAdminHandler(w http.ResponseWriter, r *http.Request) {
	if !requireI18nAdmin(w, r) {
		return
	}

	switch r.Method {
	case http.MethodGet:
		listI18nLanguagesAdmin(w)
	case http.MethodPost:
		createI18nLanguageAdmin(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func i18nLanguageByCodeAdminHandler(w http.ResponseWriter, r *http.Request) {
	if !requireI18nAdmin(w, r) {
		return
	}

	code := normalizeLocaleCode(strings.TrimPrefix(r.URL.Path, "/api/admin/i18n/languages/"))
	if !isValidLocaleCode(code) {
		writeError(w, http.StatusBadRequest, "invalid locale code")
		return
	}

	switch r.Method {
	case http.MethodPut:
		updateI18nLanguageAdmin(w, r, code)
	case http.MethodDelete:
		deleteI18nLanguageAdmin(w, code)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func requireI18nAdmin(w http.ResponseWriter, r *http.Request) bool {
	claims, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok || claims["role"] != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return false
	}
	return true
}

func listI18nLanguagesAdmin(w http.ResponseWriter) {
	rows, err := db.Query(`
		SELECT code, label, native_label, dir, enabled, is_builtin,
			(SELECT COUNT(*)::int FROM jsonb_object_keys(phrases)) AS phrase_count,
			COALESCE(jsonb_array_length(patterns), 0) AS pattern_count,
			phrases::text,
			patterns::text,
			created_at,
			updated_at
		FROM i18n_languages
		ORDER BY CASE code WHEN 'fr' THEN 0 WHEN 'en' THEN 1 ELSE 3 END, code ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list languages")
		return
	}
	defer rows.Close()

	items := make([]map[string]interface{}, 0)
	for rows.Next() {
		language, err := scanI18nLanguage(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not parse language")
			return
		}
		items = append(items, i18nLanguageAdminPayload(language))
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "could not list languages")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items})
}

func createI18nLanguageAdmin(w http.ResponseWriter, r *http.Request) {
	payload, err := decodeI18nPayload(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	code := normalizeLocaleCode(payload.Code)
	if !isValidLocaleCode(code) {
		writeError(w, http.StatusBadRequest, "invalid locale code")
		return
	}

	label := strings.TrimSpace(payload.Label)
	nativeLabel := strings.TrimSpace(payload.NativeLabel)
	dir := normalizeI18nDir(payload.Dir)
	if label == "" || nativeLabel == "" {
		writeError(w, http.StatusBadRequest, "label and nativeLabel are required")
		return
	}

	enabled := true
	if payload.Enabled != nil {
		enabled = *payload.Enabled
	}

	phrasesJSON, patternsJSON, err := marshalI18nCatalog(payload.Phrases, payload.Patterns)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	_, err = db.Exec(`
		INSERT INTO i18n_languages (code, label, native_label, dir, enabled, is_builtin, phrases, patterns)
		VALUES ($1, $2, $3, $4, $5, FALSE, $6::jsonb, $7::jsonb)
	`, code, label, nativeLabel, dir, enabled, string(phrasesJSON), string(patternsJSON))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			writeError(w, http.StatusConflict, "language code already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create language")
		return
	}

	language, err := getI18nLanguage(code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load created language")
		return
	}

	writeJSON(w, http.StatusCreated, i18nLanguageAdminPayload(language))
}

func updateI18nLanguageAdmin(w http.ResponseWriter, r *http.Request, code string) {
	current, err := getI18nLanguage(code)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "language not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load language")
		return
	}

	payload, err := decodeI18nPayload(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	label := strings.TrimSpace(payload.Label)
	nativeLabel := strings.TrimSpace(payload.NativeLabel)
	dir := normalizeI18nDir(payload.Dir)
	if label == "" || nativeLabel == "" {
		writeError(w, http.StatusBadRequest, "label and nativeLabel are required")
		return
	}

	enabled := current.Enabled
	if payload.Enabled != nil {
		enabled = *payload.Enabled
	}
	if current.IsBuiltin {
		enabled = true
	}

	phrasesJSON, patternsJSON, err := marshalI18nCatalog(payload.Phrases, payload.Patterns)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	_, err = db.Exec(`
		UPDATE i18n_languages
		SET label = $1,
			native_label = $2,
			dir = $3,
			enabled = $4,
			phrases = $5::jsonb,
			patterns = $6::jsonb,
			updated_at = NOW()
		WHERE code = $7
	`, label, nativeLabel, dir, enabled, string(phrasesJSON), string(patternsJSON), code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update language")
		return
	}

	language, err := getI18nLanguage(code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load updated language")
		return
	}

	writeJSON(w, http.StatusOK, i18nLanguageAdminPayload(language))
}

func deleteI18nLanguageAdmin(w http.ResponseWriter, code string) {
	language, err := getI18nLanguage(code)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "language not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load language")
		return
	}
	if language.IsBuiltin || language.Code == defaultI18nLocale {
		writeError(w, http.StatusBadRequest, "builtin language cannot be deleted")
		return
	}

	if _, err := db.Exec(`DELETE FROM i18n_languages WHERE code = $1`, code); err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete language")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"deleted": true, "code": code})
}

func decodeI18nPayload(r *http.Request) (i18nLanguagePayload, error) {
	var payload i18nLanguagePayload
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		return payload, err
	}
	if payload.Phrases == nil {
		payload.Phrases = map[string]string{}
	}
	if payload.Patterns == nil {
		payload.Patterns = []i18nPattern{}
	}
	return payload, nil
}

func marshalI18nCatalog(phrases map[string]string, patterns []i18nPattern) ([]byte, []byte, error) {
	cleanPhrases := make(map[string]string, len(phrases))
	for source, translated := range phrases {
		key := strings.TrimSpace(source)
		if key == "" {
			continue
		}
		cleanPhrases[key] = translated
	}

	cleanPatterns := make([]i18nPattern, 0, len(patterns))
	for _, pattern := range patterns {
		match := strings.TrimSpace(pattern.Match)
		replace := strings.TrimSpace(pattern.Replace)
		if match == "" && replace == "" {
			continue
		}
		if match == "" || replace == "" {
			return nil, nil, &i18nValidationError{message: "patterns require match and replace"}
		}
		cleanPatterns = append(cleanPatterns, i18nPattern{Match: match, Replace: replace})
	}

	phrasesJSON, err := json.Marshal(cleanPhrases)
	if err != nil {
		return nil, nil, err
	}
	patternsJSON, err := json.Marshal(cleanPatterns)
	if err != nil {
		return nil, nil, err
	}

	return phrasesJSON, patternsJSON, nil
}

type i18nValidationError struct {
	message string
}

func (e *i18nValidationError) Error() string {
	return e.message
}

type i18nRowScanner interface {
	Scan(dest ...interface{}) error
}

func scanI18nLanguage(scanner i18nRowScanner) (i18nLanguageRecord, error) {
	var language i18nLanguageRecord
	var phrasesRaw string
	var patternsRaw string

	err := scanner.Scan(
		&language.Code,
		&language.Label,
		&language.NativeLabel,
		&language.Dir,
		&language.Enabled,
		&language.IsBuiltin,
		&language.PhraseCount,
		&language.PatternCount,
		&phrasesRaw,
		&patternsRaw,
		&language.CreatedAt,
		&language.UpdatedAt,
	)
	if err != nil {
		return language, err
	}

	if err := json.Unmarshal([]byte(phrasesRaw), &language.Phrases); err != nil {
		return language, err
	}
	if err := json.Unmarshal([]byte(patternsRaw), &language.Patterns); err != nil {
		return language, err
	}
	if language.Phrases == nil {
		language.Phrases = map[string]string{}
	}
	if language.Patterns == nil {
		language.Patterns = []i18nPattern{}
	}

	return language, nil
}

func getI18nLanguage(code string) (i18nLanguageRecord, error) {
	row := db.QueryRow(`
		SELECT code, label, native_label, dir, enabled, is_builtin,
			(SELECT COUNT(*)::int FROM jsonb_object_keys(phrases)) AS phrase_count,
			COALESCE(jsonb_array_length(patterns), 0) AS pattern_count,
			phrases::text,
			patterns::text,
			created_at,
			updated_at
		FROM i18n_languages
		WHERE code = $1
	`, code)
	return scanI18nLanguage(row)
}

func i18nLanguageAdminPayload(language i18nLanguageRecord) map[string]interface{} {
	return map[string]interface{}{
		"code":         language.Code,
		"label":        language.Label,
		"nativeLabel":  language.NativeLabel,
		"dir":          language.Dir,
		"enabled":      language.Enabled,
		"isBuiltin":    language.IsBuiltin,
		"canDelete":    !language.IsBuiltin && language.Code != defaultI18nLocale,
		"phraseCount":  language.PhraseCount,
		"patternCount": language.PatternCount,
		"phrases":      language.Phrases,
		"patterns":     language.Patterns,
		"createdAt":    language.CreatedAt.UTC().Format(time.RFC3339),
		"updatedAt":    language.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func normalizeLocaleCode(value string) string {
	return strings.ToLower(strings.TrimSpace(strings.ReplaceAll(value, "_", "-")))
}

func isValidLocaleCode(value string) bool {
	return localeCodePattern.MatchString(value)
}

func normalizeI18nDir(value string) string {
	if strings.ToLower(strings.TrimSpace(value)) == "rtl" {
		return "rtl"
	}
	return "ltr"
}
