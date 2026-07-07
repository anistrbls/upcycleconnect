package items

import (
	"context"
	"strings"

	"github.com/lib/pq"
)

type SubscriptionPlan struct {
	Key       string   `json:"key"`
	Name      string   `json:"name"`
	PriceEuro int      `json:"price_euro"`
	Features  []string `json:"features"`
}

type SubscriptionPlanSubscriber struct {
	ID           int64
	Email        string
	DisplayName  string
	BillingCycle string
}

const (
	SubscriptionBillingCycleMonth = "month"
	SubscriptionBillingCycleYear  = "year"
)

func NormalizeSubscriptionBillingCycle(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "year", "annual", "annuel", "annee", "année":
		return SubscriptionBillingCycleYear
	default:
		return SubscriptionBillingCycleMonth
	}
}

func (p SubscriptionPlan) PriceEuroForBillingCycle(cycle string) int {
	if NormalizeSubscriptionBillingCycle(cycle) == SubscriptionBillingCycleYear {
		return p.PriceEuro * 12
	}
	return p.PriceEuro
}

func NormalizeSubscriptionPlanKey(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func IsFreeSubscriptionPlanKey(value string) bool {
	switch NormalizeSubscriptionPlanKey(value) {
	case "", "decouverte", "gratuit", "none":
		return true
	default:
		return false
	}
}

func cleanSubscriptionPlanFeatures(features []string) []string {
	cleaned := make([]string, 0, len(features))
	for _, feature := range features {
		feature = strings.TrimSpace(feature)
		if feature != "" {
			cleaned = append(cleaned, feature)
		}
	}
	return cleaned
}

func (r *Repository) EnsureSubscriptionPlansSchema() error {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS subscription_plans (
			key TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			price_euro INTEGER NOT NULL,
			features TEXT[] NOT NULL
		);
	`)
	if err != nil {
		return err
	}

	_, err = r.db.Exec(`
		INSERT INTO subscription_plans (key, name, price_euro, features) VALUES
		('decouverte', 'Découverte', 0, ARRAY[
			'Offre gratuite par défaut pour les professionnels',
			'Accès aux annonces publiques',
			'Réservation/récupération standard',
			'Historique simple des récupérations',
			'Justificatifs individuels',
			'Gestion simple des projets',
			'Accès aux conseils',
			'Accès aux événements publics',
			'Accès au forum',
			'Notifications standards',
			'Maximum 3 projets actif'
		]),
		('pro_essentiel', 'Pro Essentiel', 15, ARRAY[
			'Tout ce qui est inclus dans Découverte',
			'Maximum 10 projets actifs',
			'Jusqu’à 5 alertes personnalisées',
			'Alertes sur matériaux recherchés',
			'Filtres avancés sur les annonces',
			'Dashboard professionnel simple',
			'Statistiques basiques',
			'Export simple de l’historique',
			'Notifications ciblées',
			'Suivi et gestion amélioré des projets'
		]),
		('premium_atelier', 'Premium Atelier', 30, ARRAY[
			'Tout ce qui est inclus dans Pro Essentiel',
			'Projets actifs illimités',
			'Jusqu’à 20 alertes personnalisées',
			'Accès prioritaire limité aux annonces marquées premium',
			'Dashboard professionnel avancé',
			'Analyse d’impact écologique détaillée',
			'Rapports PDF mensuels',
			'Export groupé des données',
			'Mise en avant du profil professionnel ou d’un projet',
			'Support prioritaire'
		])
		ON CONFLICT (key) DO NOTHING;
	`)
	return err
}

func (r *Repository) GetSubscriptionPlans(ctx context.Context) ([]SubscriptionPlan, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT key, name, price_euro, features FROM subscription_plans ORDER BY price_euro ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []SubscriptionPlan
	for rows.Next() {
		var p SubscriptionPlan
		var features []string
		if err := rows.Scan(&p.Key, &p.Name, &p.PriceEuro, pq.Array(&features)); err != nil {
			return nil, err
		}
		p.Features = features
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *Repository) GetSubscriptionPlan(ctx context.Context, key string) (SubscriptionPlan, error) {
	var p SubscriptionPlan
	var features []string
	err := r.db.QueryRowContext(ctx, "SELECT key, name, price_euro, features FROM subscription_plans WHERE key = $1", NormalizeSubscriptionPlanKey(key)).Scan(&p.Key, &p.Name, &p.PriceEuro, pq.Array(&features))
	if err != nil {
		return SubscriptionPlan{}, err
	}
	p.Features = features
	return p, nil
}

func (r *Repository) CreateSubscriptionPlan(ctx context.Context, key string, name string, priceEuro int, features []string) (SubscriptionPlan, error) {
	var p SubscriptionPlan
	var savedFeatures []string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO subscription_plans (key, name, price_euro, features)
		VALUES ($1, $2, $3, $4)
		RETURNING key, name, price_euro, features
	`, NormalizeSubscriptionPlanKey(key), strings.TrimSpace(name), priceEuro, pq.Array(cleanSubscriptionPlanFeatures(features))).Scan(&p.Key, &p.Name, &p.PriceEuro, pq.Array(&savedFeatures))
	if err != nil {
		return SubscriptionPlan{}, err
	}
	p.Features = savedFeatures
	return p, nil
}

func (r *Repository) UpdateSubscriptionPlan(ctx context.Context, key string, priceEuro int, features []string) (SubscriptionPlan, error) {
	var p SubscriptionPlan
	var savedFeatures []string
	err := r.db.QueryRowContext(ctx, `
		UPDATE subscription_plans
		SET price_euro = $1,
		    features = $2
		WHERE key = $3
		RETURNING key, name, price_euro, features
	`, priceEuro, pq.Array(cleanSubscriptionPlanFeatures(features)), NormalizeSubscriptionPlanKey(key)).Scan(&p.Key, &p.Name, &p.PriceEuro, pq.Array(&savedFeatures))
	if err != nil {
		return SubscriptionPlan{}, err
	}
	p.Features = savedFeatures
	return p, nil
}

func (r *Repository) ListActiveSubscribersForSubscriptionPlan(ctx context.Context, key string) ([]SubscriptionPlanSubscriber, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id,
		       email,
		       COALESCE(NULLIF(TRIM(company_name), ''), NULLIF(TRIM(firstname || ' ' || lastname), ''), email) AS display_name,
		       COALESCE(subscription_billing_cycle, 'month') AS subscription_billing_cycle
		FROM users
		WHERE role = 'professionnel'
		  AND status = 'active'
		  AND subscription_type = $1
		  AND subscription_start IS NOT NULL
		  AND (
		      subscription_cancel_at_period_end = false
		      OR subscription_current_period_end IS NULL
		      OR subscription_current_period_end > NOW()
		  )
		ORDER BY id ASC
	`, NormalizeSubscriptionPlanKey(key))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subscribers := []SubscriptionPlanSubscriber{}
	for rows.Next() {
		var subscriber SubscriptionPlanSubscriber
		if err := rows.Scan(&subscriber.ID, &subscriber.Email, &subscriber.DisplayName, &subscriber.BillingCycle); err != nil {
			return nil, err
		}
		subscriber.BillingCycle = NormalizeSubscriptionBillingCycle(subscriber.BillingCycle)
		subscribers = append(subscribers, subscriber)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return subscribers, nil
}

func (r *Repository) HasSubscriptionPlan(ctx context.Context, key string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE key = $1)`, NormalizeSubscriptionPlanKey(key)).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}
