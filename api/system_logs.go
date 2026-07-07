package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

func ensureSystemLogsSchema() error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS system_logs (
			id         BIGSERIAL PRIMARY KEY,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			level      TEXT        NOT NULL CHECK (level IN ('INFO','WARN','ERROR','DEBUG')),
			source     TEXT        NOT NULL,
			message    TEXT        NOT NULL,
			metadata   JSONB
		);
		CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs (created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_system_logs_level      ON system_logs (level);
	`)
	return err
}

// ─────────────────────────────────────────────
// Write helpers
// ─────────────────────────────────────────────

// WriteLog insère un log structuré en base de données.
// meta est facultatif (peut être nil).
func WriteLog(level, source, message string, meta map[string]any) {
	var metaJSON []byte
	if meta != nil {
		metaJSON, _ = json.Marshal(meta)
	}
	_, err := db.Exec(
		`INSERT INTO system_logs (level, source, message, metadata) VALUES ($1, $2, $3, $4)`,
		level, source, message, metaJSON,
	)
	if err != nil {
		// Ne pas bloquer l'application si le log échoue — juste stderr
		fmt.Printf("[syslog-error] %v\n", err)
	}
}

func LogInfo(source, message string, meta ...map[string]any) {
	var m map[string]any
	if len(meta) > 0 {
		m = meta[0]
	}
	WriteLog("INFO", source, message, m)
}

func LogWarn(source, message string, meta ...map[string]any) {
	var m map[string]any
	if len(meta) > 0 {
		m = meta[0]
	}
	WriteLog("WARN", source, message, m)
}

func LogError(source, message string, meta ...map[string]any) {
	var m map[string]any
	if len(meta) > 0 {
		m = meta[0]
	}
	WriteLog("ERROR", source, message, m)
}

// ─────────────────────────────────────────────
// HTTP Logging Middleware
// ─────────────────────────────────────────────

// statusRecorder capture le statut HTTP de la réponse.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// systemLogsMiddleware enregistre chaque requête HTTP entrante.
// On ne logge que les routes /api/* et on ignore le polling de santé.
func systemLogsMiddleware(next http.Handler) http.Handler {
	ignorePaths := map[string]bool{
		"/health": true,
		"/ping":   true,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Ignorer les routes de santé (trop fréquentes)
		if ignorePaths[path] {
			next.ServeHTTP(w, r)
			return
		}

		// Seulement les routes /api/*
		if !strings.HasPrefix(path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}

		rec := &statusRecorder{ResponseWriter: w, status: 200}
		start := time.Now()
		next.ServeHTTP(rec, r)
		duration := time.Since(start)

		level := "INFO"
		if rec.status >= 500 {
			level = "ERROR"
		} else if rec.status >= 400 {
			level = "WARN"
		}

		// Ne logger que les erreurs et actions importantes (pas le polling GET répétitif)
		if rec.status < 400 && r.Method == http.MethodGet {
			return
		}

		source := "HTTP"
		msg := fmt.Sprintf("%s %s → %d (%s)", r.Method, path, rec.status, duration.Round(time.Millisecond))

		meta := map[string]any{
			"method":   r.Method,
			"path":     path,
			"status":   rec.status,
			"duration": duration.Milliseconds(),
		}
		if ua := r.Header.Get("User-Agent"); ua != "" {
			meta["user_agent"] = ua
		}

		WriteLog(level, source, msg, meta)
	})
}

// ─────────────────────────────────────────────
// Admin endpoint
// ─────────────────────────────────────────────

type systemLogEntry struct {
	ID        int64           `json:"id"`
	CreatedAt time.Time       `json:"created_at"`
	Level     string          `json:"level"`
	Source    string          `json:"source"`
	Message   string          `json:"message"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
}

// GET /api/admin/system-logs?page=1&limit=50&level=ERROR&search=foo
func systemLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// Vérification admin
	claimsMap, ok := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	role, _ := claimsMap["role"].(string)
	if role != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}

	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset := (page - 1) * limit

	level := strings.ToUpper(strings.TrimSpace(q.Get("level")))
	search := strings.TrimSpace(q.Get("search"))
	source := strings.TrimSpace(q.Get("source"))

	// Construction de la requête avec filtres
	where := []string{"1=1"}
	args := []interface{}{}
	argIdx := 1

	if level != "" && level != "ALL" {
		where = append(where, fmt.Sprintf("level = $%d", argIdx))
		args = append(args, level)
		argIdx++
	}
	if search != "" {
		where = append(where, fmt.Sprintf("(message ILIKE $%d OR source ILIKE $%d)", argIdx, argIdx+1))
		args = append(args, "%"+search+"%", "%"+search+"%")
		argIdx += 2
	}
	if source != "" {
		where = append(where, fmt.Sprintf("source = $%d", argIdx))
		args = append(args, source)
		argIdx++
	}

	whereClause := strings.Join(where, " AND ")

	// Total count
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM system_logs WHERE %s", whereClause)
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}

	// Fetch logs
	dataQuery := fmt.Sprintf(`
		SELECT id, created_at, level, source, message, metadata
		FROM system_logs
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := db.Query(dataQuery, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	logs := []systemLogEntry{}
	for rows.Next() {
		var entry systemLogEntry
		var metaRaw []byte
		if err := rows.Scan(&entry.ID, &entry.CreatedAt, &entry.Level, &entry.Source, &entry.Message, &metaRaw); err != nil {
			continue
		}
		if len(metaRaw) > 0 {
			entry.Metadata = json.RawMessage(metaRaw)
		}
		logs = append(logs, entry)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"logs":       logs,
		"total":      total,
		"page":       page,
		"limit":      limit,
		"totalPages": (total + int64(limit) - 1) / int64(limit),
	})
}

// GET /api/admin/system-logs/sources — liste les sources uniques pour le filtre
func systemLogsSourcesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	claimsMap2, ok2 := r.Context().Value(authClaimsKey).(jwt.MapClaims)
	if !ok2 {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	role2, _ := claimsMap2["role"].(string)
	if role2 != "admin" {
		writeError(w, http.StatusForbidden, "admin only")
		return
	}

	rows, err := db.Query(`SELECT DISTINCT source FROM system_logs ORDER BY source`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	sources := []string{}
	for rows.Next() {
		var s string
		if rows.Scan(&s) == nil {
			sources = append(sources, s)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"sources": sources})
}
