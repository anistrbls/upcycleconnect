package items

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"time"
)

// frontendBaseURL retourne l'URL de base du frontend (pour les redirections Stripe), avec une valeur par défaut en dev.
func frontendBaseURL() string {
	base := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if base == "" {
		base = "http://localhost:3000"
	}
	return base
}

// Tarifs et durée par défaut des options payantes de mise en avant des annonces et des projets.
// Ces valeurs ne servent que de secours tant que `boost_pricing_config` n'a pas encore de ligne ;
// la configuration réelle est modifiable par un admin via /api/admin/finances/boost-pricing.
const (
	ItemFeaturePriceCents = 499
	ItemBumpPriceCents    = 149

	ProjectFeaturePriceCents = 499
	ProjectBumpPriceCents    = 149

	DefaultFeatureDurationDays = 7
)

// BoostPricingConfig regroupe les tarifs et la durée des options payantes "mise à la une" / "remonter".
type BoostPricingConfig struct {
	ItemFeaturePriceCents    int64 `json:"itemFeaturePriceCents"`
	ItemBumpPriceCents       int64 `json:"itemBumpPriceCents"`
	ProjectFeaturePriceCents int64 `json:"projectFeaturePriceCents"`
	ProjectBumpPriceCents    int64 `json:"projectBumpPriceCents"`
	FeatureDurationDays      int   `json:"featureDurationDays"`
}

// FeatureDuration convertit la durée configurée (en jours) en time.Duration.
func (c BoostPricingConfig) FeatureDuration() time.Duration {
	days := c.FeatureDurationDays
	if days <= 0 {
		days = DefaultFeatureDurationDays
	}
	return time.Duration(days) * 24 * time.Hour
}

// GetBoostPricingConfig lit la configuration tarifaire courante (créée avec des valeurs par défaut si absente).
func GetBoostPricingConfig(ctx context.Context, db *sql.DB) (BoostPricingConfig, error) {
	cfg := BoostPricingConfig{
		ItemFeaturePriceCents:    ItemFeaturePriceCents,
		ItemBumpPriceCents:       ItemBumpPriceCents,
		ProjectFeaturePriceCents: ProjectFeaturePriceCents,
		ProjectBumpPriceCents:    ProjectBumpPriceCents,
		FeatureDurationDays:      DefaultFeatureDurationDays,
	}
	err := db.QueryRowContext(ctx, `
		SELECT item_feature_price_cents, item_bump_price_cents, project_feature_price_cents, project_bump_price_cents, feature_duration_days
		FROM boost_pricing_config WHERE id = 1
	`).Scan(
		&cfg.ItemFeaturePriceCents, &cfg.ItemBumpPriceCents,
		&cfg.ProjectFeaturePriceCents, &cfg.ProjectBumpPriceCents,
		&cfg.FeatureDurationDays,
	)
	if err != nil && err != sql.ErrNoRows {
		return cfg, err
	}
	return cfg, nil
}

// SetBoostPricingConfig enregistre la configuration tarifaire (upsert sur la ligne unique id=1).
func SetBoostPricingConfig(ctx context.Context, db *sql.DB, cfg BoostPricingConfig) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO boost_pricing_config (id, item_feature_price_cents, item_bump_price_cents, project_feature_price_cents, project_bump_price_cents, feature_duration_days)
		VALUES (1, $1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			item_feature_price_cents = EXCLUDED.item_feature_price_cents,
			item_bump_price_cents = EXCLUDED.item_bump_price_cents,
			project_feature_price_cents = EXCLUDED.project_feature_price_cents,
			project_bump_price_cents = EXCLUDED.project_bump_price_cents,
			feature_duration_days = EXCLUDED.feature_duration_days
	`, cfg.ItemFeaturePriceCents, cfg.ItemBumpPriceCents, cfg.ProjectFeaturePriceCents, cfg.ProjectBumpPriceCents, cfg.FeatureDurationDays)
	return err
}
