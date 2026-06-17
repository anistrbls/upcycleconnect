package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
)

const defaultI18nLocale = "fr"
const i18nRuntimeMaxTexts = 80
const i18nRuntimeMaxTextLength = 700
const i18nRuntimeMaxTotalChars = 30000

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

type i18nRuntimeTranslatePayload struct {
	TargetLocale string   `json:"targetLocale"`
	Texts        []string `json:"texts"`
}

type deeplTranslateRequest struct {
	Text               []string `json:"text"`
	SourceLang         string   `json:"source_lang,omitempty"`
	TargetLang         string   `json:"target_lang"`
	PreserveFormatting bool     `json:"preserve_formatting"`
	SplitSentences     string   `json:"split_sentences,omitempty"`
	Context            string   `json:"context,omitempty"`
}

type deeplTranslateResponse struct {
	Translations []struct {
		DetectedSourceLanguage string `json:"detected_source_language"`
		Text                   string `json:"text"`
	} `json:"translations"`
}

var builtinI18nLanguages = []i18nLanguageRecord{
	{Code: "fr", Label: "Français", NativeLabel: "Français", Dir: "ltr", Enabled: true, IsBuiltin: true},
	{Code: "en", Label: "Anglais", NativeLabel: "English", Dir: "ltr", Enabled: true, IsBuiltin: true},
	{Code: "es", Label: "Espagnol", NativeLabel: "Español", Dir: "ltr", Enabled: true, IsBuiltin: true},
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
		if _, err := db.Exec(`
			INSERT INTO i18n_languages (code, label, native_label, dir, enabled, is_builtin, phrases, patterns)
			VALUES ($1, $2, $3, $4, TRUE, TRUE, '{}'::jsonb, '[]'::jsonb)
			ON CONFLICT (code) DO UPDATE SET
				is_builtin = TRUE,
				updated_at = i18n_languages.updated_at
		`, language.Code, language.Label, language.NativeLabel, language.Dir); err != nil {
			return err
		}
	}

	return nil
}

func i18nLanguagesPublicHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT code, label, native_label, dir
		FROM i18n_languages
		WHERE enabled = TRUE
		ORDER BY CASE code WHEN 'fr' THEN 0 WHEN 'en' THEN 1 WHEN 'es' THEN 2 ELSE 3 END, code ASC
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

	if !language.Enabled && !language.IsBuiltin {
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

func i18nTranslatePublicHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var payload i18nRuntimeTranslatePayload
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	targetLocale := normalizeLocaleCode(payload.TargetLocale)
	if !isValidLocaleCode(targetLocale) {
		writeError(w, http.StatusBadRequest, "invalid locale code")
		return
	}

	texts := cleanRuntimeTranslationTexts(payload.Texts)
	if len(texts) == 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"provider":     "deepl",
			"sourceLocale": defaultI18nLocale,
			"targetLocale": targetLocale,
			"phrases":      map[string]string{},
			"cachedCount":  0,
			"generated":    0,
		})
		return
	}

	if targetLocale == defaultI18nLocale {
		phrases := make(map[string]string, len(texts))
		for _, text := range texts {
			phrases[text] = text
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"provider":     "source",
			"sourceLocale": defaultI18nLocale,
			"targetLocale": targetLocale,
			"phrases":      phrases,
			"cachedCount":  len(phrases),
			"generated":    0,
		})
		return
	}

	language, err := getI18nLanguage(targetLocale)
	if err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "language not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load language")
		return
	}
	if !language.Enabled && !language.IsBuiltin {
		writeError(w, http.StatusNotFound, "language not found")
		return
	}

	phrases := make(map[string]string, len(texts))
	missing := make([]string, 0)
	for _, text := range texts {
		if translated, ok := language.Phrases[text]; ok {
			phrases[text] = translated
			continue
		}
		missing = append(missing, text)
	}

	generated := map[string]string{}
	if len(missing) > 0 {
		targetLang, err := deeplTargetLang(targetLocale)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		translated, err := translateTextsWithDeepL(missing, targetLang)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		if len(translated) != len(missing) {
			writeError(w, http.StatusBadGateway, "deepl translation count mismatch")
			return
		}

		for index, source := range missing {
			value := strings.TrimSpace(translated[index])
			if value == "" {
				value = source
			}
			generated[source] = value
			phrases[source] = value
		}

		if err := updateI18nLanguagePhrases(targetLocale, generated); err != nil {
			writeError(w, http.StatusInternalServerError, "could not cache translations")
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"provider":       "deepl",
		"sourceLocale":   defaultI18nLocale,
		"targetLocale":   targetLocale,
		"phrases":        phrases,
		"cachedCount":    len(texts) - len(generated),
		"generated":      len(generated),
		"generatedAt":    time.Now().UTC().Format(time.RFC3339),
		"reviewRequired": false,
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
		ORDER BY CASE code WHEN 'fr' THEN 0 WHEN 'en' THEN 1 WHEN 'es' THEN 2 ELSE 3 END, code ASC
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

func cleanRuntimeTranslationTexts(values []string) []string {
	seen := make(map[string]bool, len(values))
	result := make([]string, 0, len(values))
	totalChars := 0

	for _, value := range values {
		cleaned := strings.TrimSpace(strings.Join(strings.Fields(value), " "))
		if cleaned == "" || seen[cleaned] || len([]rune(cleaned)) > i18nRuntimeMaxTextLength || !containsLetter(cleaned) {
			continue
		}

		nextTotal := totalChars + len(cleaned)
		if nextTotal > i18nRuntimeMaxTotalChars {
			break
		}

		seen[cleaned] = true
		totalChars = nextTotal
		result = append(result, cleaned)
		if len(result) >= i18nRuntimeMaxTexts {
			break
		}
	}

	return result
}

func updateI18nLanguagePhrases(code string, phrases map[string]string) error {
	if len(phrases) == 0 {
		return nil
	}

	phrasesJSON, err := json.Marshal(phrases)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		UPDATE i18n_languages
		SET phrases = phrases || $2::jsonb,
			updated_at = NOW()
		WHERE code = $1
	`, code, string(phrasesJSON))
	return err
}

func containsLetter(value string) bool {
	for _, r := range value {
		if unicode.IsLetter(r) {
			return true
		}
	}
	return false
}

func deeplTargetLang(locale string) (string, error) {
	normalized := strings.ToUpper(normalizeLocaleCode(locale))
	switch normalized {
	case "":
		return "", fmt.Errorf("target language is required")
	case "FR":
		return "", fmt.Errorf("target language must be different from French")
	case "EN":
		return "EN-US", nil
	case "PT":
		return "PT-PT", nil
	case "ZH":
		return "ZH-HANS", nil
	default:
		return normalized, nil
	}
}

func translateTextsWithDeepL(texts []string, targetLang string) ([]string, error) {
	authKey := strings.TrimSpace(getEnv("DEEPL_AUTH_KEY", ""))
	if authKey == "" {
		return nil, fmt.Errorf("deepl auth key missing")
	}

	baseURL := strings.TrimRight(strings.TrimSpace(getEnv("DEEPL_API_URL", "")), "/")
	if baseURL == "" {
		baseURL = "https://api.deepl.com"
		if strings.HasSuffix(authKey, ":fx") {
			baseURL = "https://api-free.deepl.com"
		}
	}

	client := &http.Client{Timeout: 45 * time.Second}
	result := make([]string, 0, len(texts))
	for start := 0; start < len(texts); {
		end := deepLBatchEnd(texts, start, targetLang)
		batch := texts[start:end]
		translated, err := translateDeepLBatch(client, baseURL, authKey, batch, targetLang)
		if err != nil {
			return nil, err
		}
		result = append(result, translated...)
		start = end
	}

	return result, nil
}

func deepLBatchEnd(texts []string, start int, targetLang string) int {
	end := start
	for end < len(texts) && end-start < 50 {
		candidate := texts[start : end+1]
		body, _ := json.Marshal(deeplTranslateRequest{
			Text:               candidate,
			SourceLang:         "FR",
			TargetLang:         targetLang,
			PreserveFormatting: true,
			SplitSentences:     "0",
			Context:            deeplUIContext(),
		})
		if len(body) > 110*1024 && end > start {
			break
		}
		end++
	}
	if end == start {
		return start + 1
	}
	return end
}

func translateDeepLBatch(client *http.Client, baseURL, authKey string, texts []string, targetLang string) ([]string, error) {
	requestPayload := deeplTranslateRequest{
		Text:               texts,
		SourceLang:         "FR",
		TargetLang:         targetLang,
		PreserveFormatting: true,
		SplitSentences:     "0",
		Context:            deeplUIContext(),
	}
	body, err := json.Marshal(requestPayload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, baseURL+"/v2/translate", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "DeepL-Auth-Key "+authKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "UpcycleConnect/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("deepl request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		message := readDeepLError(resp.Body)
		if message == "" {
			message = resp.Status
		}
		return nil, fmt.Errorf("deepl error: %s", message)
	}

	var payload deeplTranslateResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("could not parse deepl response: %v", err)
	}
	if len(payload.Translations) != len(texts) {
		return nil, fmt.Errorf("deepl translation count mismatch")
	}

	translated := make([]string, 0, len(payload.Translations))
	for _, translation := range payload.Translations {
		translated = append(translated, translation.Text)
	}
	return translated, nil
}

func readDeepLError(reader io.Reader) string {
	raw, err := io.ReadAll(io.LimitReader(reader, 4096))
	if err != nil {
		return ""
	}
	var payload struct {
		Message string `json:"message"`
		Detail  string `json:"detail"`
	}
	if err := json.Unmarshal(raw, &payload); err == nil {
		if strings.TrimSpace(payload.Message) != "" {
			return strings.TrimSpace(payload.Message)
		}
		if strings.TrimSpace(payload.Detail) != "" {
			return strings.TrimSpace(payload.Detail)
		}
	}
	return strings.TrimSpace(string(raw))
}

func deeplUIContext() string {
	return "Traduction de libellés courts pour l'interface web UpcycleConnect, une plateforme de réemploi, annonces, événements, finances, paramètres et gestion administrative."
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
