package items

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"upcycleconnect/api/mailer"
)

type Notification struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"userId"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"`
	Unread    bool      `json:"unread"`
	CreatedAt time.Time `json:"createdAt"`
}

type notificationPreferenceColumns struct {
	app   string
	email string
}

type notificationDeliveryPreferences struct {
	appEnabled   bool
	emailEnabled bool
	email        string
}

var notificationPreferencesByType = map[string]notificationPreferenceColumns{
	"material":                     {app: "app_moderation", email: "email_moderation"},
	"tip":                          {app: "app_moderation", email: "email_moderation"},
	"moderation":                   {app: "app_moderation", email: "email_moderation"},
	"admin_moderation":             {app: "app_moderation", email: "email_moderation"},
	"booking_received":             {app: "app_booking_received", email: "email_booking_received"},
	"point_assigned":               {app: "app_point_assigned", email: "email_point_assigned"},
	"material_deposited":           {app: "app_material_deposited", email: "email_material_deposited"},
	"material_recovered":           {app: "app_material_recovered", email: "email_material_recovered"},
	"rating_received":              {app: "app_rating_received", email: "email_rating_received"},
	"booking_cancelled":            {app: "app_booking_cancelled", email: "email_booking_cancelled"},
	"booking_expired":              {app: "app_booking_expired", email: "email_booking_expired"},
	"deposit_reminder":             {app: "app_deposit_reminder", email: "email_deposit_reminder"},
	"material_alert":               {app: "app_material_alerts", email: "email_material_alerts"},
	"conseil_moderation":           {app: "app_conseil_moderation", email: "email_conseil_moderation"},
	"new_conseil":                  {app: "app_new_conseil", email: "email_new_conseil"},
	"conseil_engagement":           {app: "app_conseil_engagement", email: "email_conseil_engagement"},
	"admin_new_conseil":            {app: "app_admin_new_conseil", email: "email_admin_new_conseil"},
	"project_engagement":           {app: "app_project_engagement", email: "email_project_engagement"},
	"service_completed":            {app: "app_service_completed", email: "email_service_completed"},
	"booking_confirmed":            {app: "app_booking_confirmed", email: "email_booking_confirmed"},
	"booking_request_received":     {app: "app_booking_request_received", email: "email_booking_request_received"},
	"prestation_booking_cancelled": {app: "app_prestation_booking_cancelled", email: "email_prestation_booking_cancelled"},
	"service_reminder":             {app: "app_service_reminder", email: "email_service_reminder"},
	"event_registration":           {app: "app_event_registration", email: "email_event_registration"},
	"event_cancellation":           {app: "app_event_cancellation", email: "email_event_cancellation"},
	"event_reminder":               {app: "app_event_reminder", email: "email_event_reminder"},
	"event_moderation":             {app: "app_event_moderation", email: "email_event_moderation"},
	"forum_new_reply":              {app: "app_forum_new_reply", email: "email_forum_new_reply"},
	"forum_mention":                {app: "app_forum_mention", email: "email_forum_mention"},
	"forum_moderation":             {app: "app_forum_moderation", email: "email_forum_moderation"},
	"admin_forum_report":           {app: "app_admin_forum_report", email: "email_admin_forum_report"},
	"finance_payment_confirmed":    {app: "app_finance_payment_confirmed", email: "email_finance_payment_confirmed"},
	"finance_payment_received":     {app: "app_finance_payment_received", email: "email_finance_payment_received"},
	"finance_payment_failed":       {app: "app_finance_payment_failed", email: "email_finance_payment_failed"},
	"finance_refund_issued":        {app: "app_finance_refund_issued", email: "email_finance_refund_issued"},
	"finance_subscription_active":  {app: "app_finance_subscription_active", email: "email_finance_subscription_active"},
	"subscription_price_change":    {app: "app_finance_subscription_active", email: "email_finance_subscription_active"},
	"support_message":              {app: "app_new_message_received", email: "email_new_message_received"},
}

func EnsureNotificationsSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS notifications (
			id BIGSERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			message TEXT NOT NULL,
			type TEXT NOT NULL,
			unread BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
	`)
	return err
}

func CreateNotification(ctx context.Context, db *sql.DB, userID int64, title, message, notifType string) error {
	if userID <= 0 {
		return nil
	}
	preferences := loadNotificationDeliveryPreferences(ctx, db, userID, notifType)
	var insertErr error
	if preferences.appEnabled {
		_, insertErr = db.ExecContext(ctx, `
			INSERT INTO notifications (user_id, title, message, type, unread)
			VALUES ($1, $2, $3, $4, TRUE)
		`, userID, title, message, notifType)
	}
	if preferences.emailEnabled {
		sendNotificationEmailAsync(preferences.email, title, message)
	}
	return insertErr
}

func loadNotificationDeliveryPreferences(ctx context.Context, db *sql.DB, userID int64, notifType string) notificationDeliveryPreferences {
	prefs := notificationDeliveryPreferences{appEnabled: true, emailEnabled: true}
	columns := notificationPreferencesByType[strings.TrimSpace(notifType)]

	appExpr := "COALESCE(s.app_enabled, true)"
	if strings.TrimSpace(columns.app) != "" {
		appExpr = fmt.Sprintf("%s AND COALESCE(s.%s, true)", appExpr, columns.app)
	}
	emailExpr := "COALESCE(s.email_enabled, true)"
	if strings.TrimSpace(columns.email) != "" {
		emailExpr = fmt.Sprintf("%s AND COALESCE(s.%s, true)", emailExpr, columns.email)
	}

	query := fmt.Sprintf(`
		SELECT %s, %s, COALESCE(u.email, '')
		FROM users u
		LEFT JOIN user_notification_settings s ON s.user_id = u.id
		WHERE u.id = $1
	`, appExpr, emailExpr)
	err := db.QueryRowContext(ctx, query, userID).Scan(&prefs.appEnabled, &prefs.emailEnabled, &prefs.email)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("[notifications] failed to load preferences for user %d and type %q: %v", userID, notifType, err)
		}
		return prefs
	}
	return prefs
}

func sendNotificationEmailAsync(to, title, message string) {
	to = strings.TrimSpace(to)
	if to == "" {
		return
	}
	cfg := mailer.ConfigFromEnv()
	if !cfg.Configured() {
		return
	}
	subject := strings.TrimSpace(title)
	if subject == "" {
		subject = "Notification UpcycleConnect"
	}
	body := buildNotificationEmailBody(title, message)
	go func() {
		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = 15 * time.Second
		}
		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		if err := mailer.Send(ctx, cfg, mailer.Message{To: []string{to}, Subject: subject, Text: body}); err != nil {
			log.Printf("[notifications] failed to send email notification to %s: %v", to, err)
		}
	}()
}

func buildNotificationEmailBody(title, message string) string {
	parts := []string{
		"Bonjour,",
		"",
	}
	if t := strings.TrimSpace(title); t != "" {
		parts = append(parts, t, "")
	}
	if m := strings.TrimSpace(message); m != "" {
		parts = append(parts, m, "")
	}
	parts = append(parts,
		"Vous recevez cet email selon vos preferences de notification UpcycleConnect.",
		"Vous pouvez modifier ces preferences depuis votre espace Parametres.",
	)
	return strings.Join(parts, "\n")
}

func GetNotifications(ctx context.Context, db *sql.DB, userID int64) ([]Notification, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, user_id, title, message, type, unread, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.Type, &n.Unread, &n.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	if result == nil {
		result = []Notification{}
	}
	return result, nil
}

func MarkNotificationAsRead(ctx context.Context, db *sql.DB, id, userID int64) error {
	_, err := db.ExecContext(ctx, `
		UPDATE notifications
		SET unread = FALSE
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	return err
}

func MarkAllNotificationsAsRead(ctx context.Context, db *sql.DB, userID int64) error {
	_, err := db.ExecContext(ctx, `
		UPDATE notifications
		SET unread = FALSE
		WHERE user_id = $1
	`, userID)
	return err
}

func DeleteNotification(ctx context.Context, db *sql.DB, id, userID int64) error {
	_, err := db.ExecContext(ctx, `
		DELETE FROM notifications
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	return err
}
