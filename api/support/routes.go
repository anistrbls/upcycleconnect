package support

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"upcycleconnect/api/items"

	"github.com/golang-jwt/jwt/v5"
)

const (
	statusOpen       = "open"
	statusInProgress = "in_progress"
	statusResolved   = "resolved"
)

const (
	maxSupportImages     = 4
	maxSupportImageBytes = 5 * 1024 * 1024
)

type conversationSummary struct {
	ID                    int64      `json:"id"`
	UserID                int64      `json:"userId"`
	UserName              string     `json:"userName"`
	UserEmail             string     `json:"userEmail"`
	UserRole              string     `json:"userRole"`
	SubscriptionKey       string     `json:"subscriptionKey"`
	SubscriptionName      string     `json:"subscriptionName"`
	SubscriptionPriceEuro int        `json:"subscriptionPriceEuro"`
	SupportPriority       int        `json:"supportPriority"`
	AssignedTo            *int64     `json:"assignedTo,omitempty"`
	AssignedName          string     `json:"assignedName"`
	Subject               string     `json:"subject"`
	Status                string     `json:"status"`
	LastMessage           string     `json:"lastMessage"`
	LastImages            []string   `json:"lastImages"`
	LastMessageAt         *time.Time `json:"lastMessageAt,omitempty"`
	MessageCount          int        `json:"messageCount"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

type supportMessage struct {
	ID             int64     `json:"id"`
	ConversationID int64     `json:"conversationId"`
	SenderID       int64     `json:"senderId"`
	SenderName     string    `json:"senderName"`
	SenderRole     string    `json:"senderRole"`
	Body           string    `json:"body"`
	Images         []string  `json:"images"`
	CreatedAt      time.Time `json:"createdAt"`
}

type conversationDetail struct {
	Conversation conversationSummary `json:"conversation"`
	Messages     []supportMessage    `json:"messages"`
}

type authInfo struct {
	UserID       int64
	Email        string
	Role         string
	EmployeeRole string
}

func RegisterRoutes(mux *http.ServeMux, db *sql.DB, authMiddleware func(http.Handler) http.Handler) {
	if err := EnsureSchema(db); err != nil {
		log.Fatalf("Support schema error: %v", err)
	}
	log.Println("✓ Support schema initialized")

	h := handler{db: db}

	mux.Handle("GET /api/support/conversations", authMiddleware(http.HandlerFunc(h.listConversations)))
	mux.Handle("POST /api/support/conversations", authMiddleware(http.HandlerFunc(h.createConversation)))
	mux.Handle("GET /api/support/conversations/{id}", authMiddleware(http.HandlerFunc(h.getConversation)))
	mux.Handle("PATCH /api/support/conversations/{id}", authMiddleware(http.HandlerFunc(h.updateConversation)))
	mux.Handle("POST /api/support/conversations/{id}/messages", authMiddleware(http.HandlerFunc(h.createMessage)))
}

func EnsureSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS support_conversations (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
			subject TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'open',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT support_conversations_status_check CHECK (status IN ('open', 'in_progress', 'resolved'))
		);

		CREATE TABLE IF NOT EXISTS support_messages (
			id BIGSERIAL PRIMARY KEY,
			conversation_id BIGINT NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
			sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			body TEXT NOT NULL,
			images TEXT NOT NULL DEFAULT '[]',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS images TEXT NOT NULL DEFAULT '[]';

		CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
		CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
		CREATE INDEX IF NOT EXISTS idx_support_conversations_updated_at ON support_conversations(updated_at DESC);
		CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
	`)
	return err
}

type handler struct {
	db *sql.DB
}

func (h handler) listConversations(w http.ResponseWriter, r *http.Request) {
	auth, ok := authFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.QueryContext(r.Context(), conversationListQuery(isSupportUser(auth)), auth.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load support conversations")
		return
	}
	defer rows.Close()

	conversations := []conversationSummary{}
	for rows.Next() {
		c, err := scanConversation(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read support conversation")
			return
		}
		conversations = append(conversations, c)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load support conversations")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"conversations": conversations})
}

func (h handler) createConversation(w http.ResponseWriter, r *http.Request) {
	auth, ok := authFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var payload struct {
		Subject string   `json:"subject"`
		Message string   `json:"message"`
		Images  []string `json:"images"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	subject := strings.TrimSpace(payload.Subject)
	message := strings.TrimSpace(payload.Message)
	if subject == "" {
		subject = "Demande d'assistance"
	}
	if subjectRunes := []rune(subject); len(subjectRunes) > 160 {
		subject = string(subjectRunes[:160])
	}
	if message == "" {
		if len(payload.Images) == 0 {
			writeError(w, http.StatusBadRequest, "message or image is required")
			return
		}
	}
	imagesJSON, err := normalizeSupportImagesJSON(payload.Images)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support conversation")
		return
	}
	defer tx.Rollback()

	var conversationID int64
	err = tx.QueryRowContext(r.Context(), `
		INSERT INTO support_conversations (user_id, subject, status)
		VALUES ($1, $2, $3)
		RETURNING id
	`, auth.UserID, subject, statusOpen).Scan(&conversationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support conversation")
		return
	}

	if _, err = tx.ExecContext(r.Context(), `
		INSERT INTO support_messages (conversation_id, sender_id, body, images)
		VALUES ($1, $2, $3, $4)
	`, conversationID, auth.UserID, message, imagesJSON); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support message")
		return
	}

	if err = tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support conversation")
		return
	}

	h.notifySupportTeam(r.Context(), auth.UserID, "Nouvelle demande d'assistance", fmt.Sprintf("Une nouvelle conversation support a été ouverte : %s", subject))

	detail, err := h.loadConversationDetail(r.Context(), conversationID, auth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load support conversation")
		return
	}
	writeJSON(w, http.StatusCreated, detail)
}

func (h handler) getConversation(w http.ResponseWriter, r *http.Request) {
	auth, ok := authFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := parseID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	detail, err := h.loadConversationDetail(r.Context(), id, auth)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "support conversation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load support conversation")
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (h handler) createMessage(w http.ResponseWriter, r *http.Request) {
	auth, ok := authFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := parseID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	var payload struct {
		Message string   `json:"message"`
		Images  []string `json:"images"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	message := strings.TrimSpace(payload.Message)
	if message == "" {
		if len(payload.Images) == 0 {
			writeError(w, http.StatusBadRequest, "message or image is required")
			return
		}
	}
	imagesJSON, err := normalizeSupportImagesJSON(payload.Images)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	conversation, err := h.loadConversationSummary(r.Context(), id, auth)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "support conversation not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to load support conversation")
		return
	}

	nextStatus := conversation.Status
	if isSupportUser(auth) {
		nextStatus = statusInProgress
	} else if conversation.Status == statusResolved {
		nextStatus = statusOpen
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support message")
		return
	}
	defer tx.Rollback()

	if _, err = tx.ExecContext(r.Context(), `
		INSERT INTO support_messages (conversation_id, sender_id, body, images)
		VALUES ($1, $2, $3, $4)
	`, id, auth.UserID, message, imagesJSON); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support message")
		return
	}
	if _, err = tx.ExecContext(r.Context(), `
		UPDATE support_conversations
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`, id, nextStatus); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update support conversation")
		return
	}
	if err = tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create support message")
		return
	}

	if isSupportUser(auth) && conversation.UserID != auth.UserID {
		_ = items.CreateNotification(r.Context(), h.db, conversation.UserID, "Réponse du support", fmt.Sprintf("Une réponse a été ajoutée à votre demande : %s", conversation.Subject), "support_message")
	} else {
		h.notifySupportRecipients(r.Context(), auth.UserID, conversation, "Nouveau message d'assistance", fmt.Sprintf("Un utilisateur a répondu dans la conversation : %s", conversation.Subject))
	}

	detail, err := h.loadConversationDetail(r.Context(), id, auth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load support conversation")
		return
	}
	writeJSON(w, http.StatusCreated, detail)
}

func (h handler) updateConversation(w http.ResponseWriter, r *http.Request) {
	auth, ok := authFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if !isSupportUser(auth) {
		writeError(w, http.StatusForbidden, "support only")
		return
	}
	id, err := parseID(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid conversation id")
		return
	}

	var payload struct {
		Status     string `json:"status"`
		AssignToMe bool   `json:"assignToMe"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	status := normalizeStatus(payload.Status)
	if status == "" {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	result, err := h.db.ExecContext(r.Context(), `
		UPDATE support_conversations
		SET status = $2,
		    assigned_to = CASE WHEN $3 THEN $4 ELSE assigned_to END,
		    updated_at = NOW()
		WHERE id = $1
	`, id, status, payload.AssignToMe, auth.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update support conversation")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeError(w, http.StatusNotFound, "support conversation not found")
		return
	}

	detail, err := h.loadConversationDetail(r.Context(), id, auth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load support conversation")
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (h handler) loadConversationDetail(ctx context.Context, id int64, auth authInfo) (conversationDetail, error) {
	conversation, err := h.loadConversationSummary(ctx, id, auth)
	if err != nil {
		return conversationDetail{}, err
	}

	rows, err := h.db.QueryContext(ctx, `
		SELECT m.id,
		       m.conversation_id,
		       m.sender_id,
		       COALESCE(NULLIF(TRIM(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')), ''), NULLIF(TRIM(u.company_name), ''), u.email) AS sender_name,
		       COALESCE(u.role, '') AS sender_role,
		       m.body,
		       m.images,
		       m.created_at
		FROM support_messages m
		JOIN users u ON u.id = m.sender_id
		WHERE m.conversation_id = $1
		ORDER BY m.created_at ASC, m.id ASC
	`, id)
	if err != nil {
		return conversationDetail{}, err
	}
	defer rows.Close()

	messages := []supportMessage{}
	for rows.Next() {
		var m supportMessage
		var imagesJSON string
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.SenderName, &m.SenderRole, &m.Body, &imagesJSON, &m.CreatedAt); err != nil {
			return conversationDetail{}, err
		}
		m.Images = parseStringArrayJSON(imagesJSON)
		messages = append(messages, m)
	}
	if err := rows.Err(); err != nil {
		return conversationDetail{}, err
	}

	return conversationDetail{Conversation: conversation, Messages: messages}, nil
}

func (h handler) loadConversationSummary(ctx context.Context, id int64, auth authInfo) (conversationSummary, error) {
	row := h.db.QueryRowContext(ctx, conversationDetailQuery(isSupportUser(auth)), id, auth.UserID)
	return scanConversation(row)
}

func conversationListQuery(canSeeAll bool) string {
	where := "WHERE c.user_id = $1"
	if canSeeAll {
		where = "WHERE TRUE OR $1 > 0"
	}
	return fmt.Sprintf(`
		SELECT c.id,
		       c.user_id,
		       COALESCE(NULLIF(TRIM(COALESCE(owner.firstname, '') || ' ' || COALESCE(owner.lastname, '')), ''), NULLIF(TRIM(owner.company_name), ''), owner.email) AS user_name,
		       owner.email,
		       COALESCE(owner.role, '') AS user_role,
		       CASE
		           WHEN owner.role = 'professionnel' THEN COALESCE(NULLIF(owner.subscription_type, ''), 'decouverte')
		           ELSE ''
		       END AS subscription_key,
		       CASE
		           WHEN owner.role = 'professionnel' THEN COALESCE(sp.name, COALESCE(NULLIF(owner.subscription_type, ''), 'decouverte'))
		           ELSE ''
		       END AS subscription_name,
		       CASE WHEN owner.role = 'professionnel' THEN COALESCE(sp.price_euro, 0) ELSE 0 END AS subscription_price_euro,
		       CASE
		           WHEN owner.role = 'professionnel' AND COALESCE(sp.price_euro, 0) > 0 THEN COALESCE(sp.price_euro, 0)
		           ELSE 0
		       END AS support_priority,
		       c.assigned_to,
		       COALESCE(NULLIF(TRIM(COALESCE(assigned.firstname, '') || ' ' || COALESCE(assigned.lastname, '')), ''), assigned.email, '') AS assigned_name,
		       c.subject,
		       c.status,
		       COALESCE(last_message.body, '') AS last_message,
		       COALESCE(last_message.images, '[]') AS last_images,
		       last_message.created_at AS last_message_at,
		       COALESCE(message_counts.message_count, 0) AS message_count,
		       c.created_at,
		       c.updated_at
		FROM support_conversations c
		JOIN users owner ON owner.id = c.user_id
		LEFT JOIN subscription_plans sp ON sp.key = COALESCE(NULLIF(owner.subscription_type, ''), 'decouverte')
		LEFT JOIN users assigned ON assigned.id = c.assigned_to
		LEFT JOIN LATERAL (
			SELECT body, images, created_at
			FROM support_messages
			WHERE conversation_id = c.id
			ORDER BY created_at DESC, id DESC
			LIMIT 1
		) last_message ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::INT AS message_count
			FROM support_messages
			WHERE conversation_id = c.id
		) message_counts ON TRUE
		%s
		ORDER BY
		       CASE
		           WHEN owner.role = 'professionnel' AND COALESCE(sp.price_euro, 0) > 0 THEN 0
		           WHEN owner.role = 'professionnel' THEN 1
		           WHEN owner.role = 'particulier' THEN 2
		           ELSE 3
		       END ASC,
		       CASE WHEN owner.role = 'professionnel' THEN COALESCE(sp.price_euro, 0) ELSE 0 END DESC,
		       c.updated_at DESC,
		       c.id DESC
	`, where)
}

func conversationDetailQuery(canSeeAll bool) string {
	where := "WHERE c.id = $1 AND c.user_id = $2"
	if canSeeAll {
		where = "WHERE c.id = $1 AND (TRUE OR c.user_id = $2)"
	}
	return fmt.Sprintf(`
		SELECT c.id,
		       c.user_id,
		       COALESCE(NULLIF(TRIM(COALESCE(owner.firstname, '') || ' ' || COALESCE(owner.lastname, '')), ''), NULLIF(TRIM(owner.company_name), ''), owner.email) AS user_name,
		       owner.email,
		       COALESCE(owner.role, '') AS user_role,
		       CASE
		           WHEN owner.role = 'professionnel' THEN COALESCE(NULLIF(owner.subscription_type, ''), 'decouverte')
		           ELSE ''
		       END AS subscription_key,
		       CASE
		           WHEN owner.role = 'professionnel' THEN COALESCE(sp.name, COALESCE(NULLIF(owner.subscription_type, ''), 'decouverte'))
		           ELSE ''
		       END AS subscription_name,
		       CASE WHEN owner.role = 'professionnel' THEN COALESCE(sp.price_euro, 0) ELSE 0 END AS subscription_price_euro,
		       CASE
		           WHEN owner.role = 'professionnel' AND COALESCE(sp.price_euro, 0) > 0 THEN COALESCE(sp.price_euro, 0)
		           ELSE 0
		       END AS support_priority,
		       c.assigned_to,
		       COALESCE(NULLIF(TRIM(COALESCE(assigned.firstname, '') || ' ' || COALESCE(assigned.lastname, '')), ''), assigned.email, '') AS assigned_name,
		       c.subject,
		       c.status,
		       COALESCE(last_message.body, '') AS last_message,
		       COALESCE(last_message.images, '[]') AS last_images,
		       last_message.created_at AS last_message_at,
		       COALESCE(message_counts.message_count, 0) AS message_count,
		       c.created_at,
		       c.updated_at
		FROM support_conversations c
		JOIN users owner ON owner.id = c.user_id
		LEFT JOIN subscription_plans sp ON sp.key = COALESCE(NULLIF(owner.subscription_type, ''), 'decouverte')
		LEFT JOIN users assigned ON assigned.id = c.assigned_to
		LEFT JOIN LATERAL (
			SELECT body, images, created_at
			FROM support_messages
			WHERE conversation_id = c.id
			ORDER BY created_at DESC, id DESC
			LIMIT 1
		) last_message ON TRUE
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::INT AS message_count
			FROM support_messages
			WHERE conversation_id = c.id
		) message_counts ON TRUE
		%s
	`, where)
}

type conversationScanner interface {
	Scan(dest ...any) error
}

func scanConversation(row conversationScanner) (conversationSummary, error) {
	var c conversationSummary
	var assignedTo sql.NullInt64
	var assignedName sql.NullString
	var lastMessage sql.NullString
	var lastImages string
	var lastMessageAt sql.NullTime

	err := row.Scan(
		&c.ID,
		&c.UserID,
		&c.UserName,
		&c.UserEmail,
		&c.UserRole,
		&c.SubscriptionKey,
		&c.SubscriptionName,
		&c.SubscriptionPriceEuro,
		&c.SupportPriority,
		&assignedTo,
		&assignedName,
		&c.Subject,
		&c.Status,
		&lastMessage,
		&lastImages,
		&lastMessageAt,
		&c.MessageCount,
		&c.CreatedAt,
		&c.UpdatedAt,
	)
	if err != nil {
		return conversationSummary{}, err
	}
	if assignedTo.Valid {
		value := assignedTo.Int64
		c.AssignedTo = &value
	}
	if assignedName.Valid {
		c.AssignedName = assignedName.String
	}
	if lastMessage.Valid {
		c.LastMessage = lastMessage.String
	}
	c.LastImages = parseStringArrayJSON(lastImages)
	if lastMessageAt.Valid {
		value := lastMessageAt.Time
		c.LastMessageAt = &value
	}
	return c, nil
}

func normalizeSupportImagesJSON(images []string) (string, error) {
	clean := make([]string, 0, len(images))
	seen := map[string]bool{}
	for _, image := range images {
		trimmed := strings.TrimSpace(image)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		if err := validateSupportImageDataURL(trimmed); err != nil {
			return "", err
		}
		seen[trimmed] = true
		clean = append(clean, trimmed)
		if len(clean) >= maxSupportImages {
			break
		}
	}
	return encodeStringArrayJSON(clean), nil
}

func validateSupportImageDataURL(dataURL string) error {
	trimmed := strings.TrimSpace(dataURL)
	if trimmed == "" {
		return fmt.Errorf("empty image")
	}
	if !strings.HasPrefix(trimmed, "data:") {
		return fmt.Errorf("invalid image format: data URL expected")
	}
	comma := strings.Index(trimmed, ",")
	if comma <= 0 || comma >= len(trimmed)-1 {
		return fmt.Errorf("invalid image payload")
	}
	header := strings.ToLower(trimmed[:comma])
	if !strings.Contains(header, ";base64") {
		return fmt.Errorf("invalid image payload: base64 expected")
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
		return fmt.Errorf("unsupported image format; allowed: jpg, jpeg, png, webp")
	}

	payload := trimmed[comma+1:]
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		decoded, err = base64.RawStdEncoding.DecodeString(payload)
		if err != nil {
			return fmt.Errorf("invalid base64 image payload")
		}
	}
	if len(decoded) > maxSupportImageBytes {
		return fmt.Errorf("image too large (max 5MB)")
	}
	return nil
}

func encodeStringArrayJSON(values []string) string {
	b, err := json.Marshal(values)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func parseStringArrayJSON(raw string) []string {
	var values []string
	if err := json.Unmarshal([]byte(strings.TrimSpace(raw)), &values); err != nil {
		return []string{}
	}
	clean := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			clean = append(clean, trimmed)
		}
	}
	return clean
}

func (h handler) notifySupportTeam(ctx context.Context, senderID int64, title, message string) {
	rows, err := h.db.QueryContext(ctx, `
		SELECT id
		FROM users
		WHERE status = 'active'
		  AND (role = 'admin' OR (role = 'salarie' AND employee_role = 'moderateur'))
		  AND id <> $1
	`, senderID)
	if err != nil {
		log.Printf("[support] failed to load support recipients: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var userID int64
		if err := rows.Scan(&userID); err == nil && userID > 0 {
			_ = items.CreateNotification(ctx, h.db, userID, title, message, "support_message")
		}
	}
}

func (h handler) notifySupportRecipients(ctx context.Context, senderID int64, conversation conversationSummary, title, message string) {
	if conversation.AssignedTo != nil && *conversation.AssignedTo != senderID {
		_ = items.CreateNotification(ctx, h.db, *conversation.AssignedTo, title, message, "support_message")
		return
	}
	h.notifySupportTeam(ctx, senderID, title, message)
}

func authFromRequest(r *http.Request) (authInfo, bool) {
	claims, ok := r.Context().Value("authClaims").(jwt.MapClaims)
	if !ok {
		return authInfo{}, false
	}

	userID := claimInt64(claims["userId"])
	if userID <= 0 {
		return authInfo{}, false
	}
	email, _ := claims["email"].(string)
	if email == "" {
		email, _ = claims["sub"].(string)
	}
	role, _ := claims["role"].(string)
	employeeRole, _ := claims["employeeRole"].(string)

	return authInfo{
		UserID:       userID,
		Email:        strings.TrimSpace(strings.ToLower(email)),
		Role:         strings.TrimSpace(strings.ToLower(role)),
		EmployeeRole: strings.TrimSpace(strings.ToLower(employeeRole)),
	}, true
}

func claimInt64(value any) int64 {
	switch v := value.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case json.Number:
		n, _ := v.Int64()
		return n
	case string:
		n, _ := strconv.ParseInt(v, 10, 64)
		return n
	default:
		return 0
	}
}

func isSupportUser(auth authInfo) bool {
	return auth.Role == "admin" || (auth.Role == "salarie" && auth.EmployeeRole == "moderateur")
}

func parseID(value string) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(value), 10, 64)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("invalid id")
	}
	return id, nil
}

func normalizeStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case statusOpen:
		return statusOpen
	case statusInProgress, "in-progress", "en_cours", "encours":
		return statusInProgress
	case statusResolved, "closed", "ferme", "fermé", "resolu", "résolu":
		return statusResolved
	default:
		return ""
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
