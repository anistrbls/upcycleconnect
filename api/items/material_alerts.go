package items

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type MaterialAlertSubscription struct {
	MaterialLabel string    `json:"materialLabel"`
	CreatedAt      time.Time `json:"createdAt"`
}

func normalizeMaterialAlertLabel(label string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(label))), " ")
}

func (r *Repository) EnsureMaterialAlertSubscriptionsSchema() error {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS material_alert_subscriptions (
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			material_label TEXT NOT NULL,
			material_label_normalized TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, material_label_normalized)
		);
		CREATE INDEX IF NOT EXISTS idx_material_alert_subscriptions_user ON material_alert_subscriptions(user_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_material_alert_subscriptions_label ON material_alert_subscriptions(material_label_normalized);
	`)
	return err
}

func (r *Repository) ListMaterialAlertSubscriptions(ctx context.Context, userID int64) ([]MaterialAlertSubscription, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT material_label, created_at
		FROM material_alert_subscriptions
		WHERE user_id = $1
		ORDER BY created_at DESC, material_label ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []MaterialAlertSubscription
	for rows.Next() {
		var sub MaterialAlertSubscription
		if err := rows.Scan(&sub.MaterialLabel, &sub.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}
	if subs == nil {
		subs = []MaterialAlertSubscription{}
	}
	return subs, nil
}

func (r *Repository) UpsertMaterialAlertSubscription(ctx context.Context, userID int64, materialLabel string) error {
	normalized := normalizeMaterialAlertLabel(materialLabel)
	if normalized == "" {
		return fmt.Errorf("material label is required")
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO material_alert_subscriptions (user_id, material_label, material_label_normalized)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, material_label_normalized) DO UPDATE SET
			material_label = EXCLUDED.material_label
	`, userID, strings.TrimSpace(materialLabel), normalized)
	return err
}

func (r *Repository) DeleteMaterialAlertSubscription(ctx context.Context, userID int64, materialLabel string) error {
	normalized := normalizeMaterialAlertLabel(materialLabel)
	if normalized == "" {
		return fmt.Errorf("material label is required")
	}
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM material_alert_subscriptions
		WHERE user_id = $1 AND material_label_normalized = $2
	`, userID, normalized)
	return err
}

func (r *Repository) notifyMaterialAlertSubscribers(ctx context.Context, itemTitle, itemMaterial string, ownerID int64) error {
	itemLabel := normalizeMaterialAlertLabel(itemMaterial)
	if itemLabel == "" {
		return nil
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT s.user_id, s.material_label
		FROM material_alert_subscriptions s
		JOIN users u ON u.id = s.user_id
		LEFT JOIN user_notification_settings ns ON ns.user_id = u.id
		WHERE u.id <> $1
		  AND COALESCE(u.status, 'active') = 'active'
		  AND COALESCE(ns.app_enabled, true) = true
		  AND COALESCE(ns.app_material_alerts, true) = true
		  AND (
			   s.material_label_normalized = $2
			OR $2 LIKE '%' || s.material_label_normalized || '%'
			OR s.material_label_normalized LIKE '%' || $2 || '%'
		  )
		ORDER BY s.created_at DESC
	`, ownerID, itemLabel)
	if err != nil {
		return err
	}
	defer rows.Close()

	matched := map[int64]string{}
	for rows.Next() {
		var userID int64
		var materialLabel string
		if err := rows.Scan(&userID, &materialLabel); err != nil {
			return err
		}
		if userID > 0 {
			if _, exists := matched[userID]; !exists {
				matched[userID] = materialLabel
			}
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	for userID, matchedLabel := range matched {
		msg := fmt.Sprintf("Une nouvelle annonce \"%s\" correspond à votre alerte matériau \"%s\".", strings.TrimSpace(itemTitle), strings.TrimSpace(matchedLabel))
		_ = CreateNotification(ctx, r.db, userID, "Alerte matériau", msg, "material_alert")
	}
	return nil
}

// CountMaterialAlertSubscriptions returns the number of active material alert subscriptions for a user.
func (r *Repository) CountMaterialAlertSubscriptions(ctx context.Context, userID int64) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM material_alert_subscriptions WHERE user_id = $1`,
		userID,
	).Scan(&count)
	return count, err
}

// materialAlertLimitForPlan returns the maximum number of material alerts allowed for a given subscription plan.
// Returns 0 for plans that do not include this feature.
func materialAlertLimitForPlan(subscriptionType string) int {
	switch subscriptionType {
	case "pro_essentiel":
		return 5
	case "premium_atelier":
		return 20
	default:
		return 0
	}
}

// GetUserSubscriptionType returns the subscription_type of a user.
func (r *Repository) GetUserSubscriptionType(ctx context.Context, userID int64) (string, error) {
	var sub string
	err := r.db.QueryRowContext(ctx,
		`SELECT COALESCE(subscription_type, '') FROM users WHERE id = $1`,
		userID,
	).Scan(&sub)
	return sub, err
}