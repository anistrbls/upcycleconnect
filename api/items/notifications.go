package items

import (
	"context"
	"database/sql"
	"time"
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
	_, err := db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, title, message, type, unread)
		VALUES ($1, $2, $3, $4, TRUE)
	`, userID, title, message, notifType)
	return err
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
