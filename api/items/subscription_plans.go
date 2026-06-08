package items

import (
	"context"
	"github.com/lib/pq"
)

type SubscriptionPlan struct {
	Key       string   `json:"key"`
	Name      string   `json:"name"`
	PriceEuro int      `json:"price_euro"`
	Features  []string `json:"features"`
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

	var count int
	err = r.db.QueryRow("SELECT COUNT(*) FROM subscription_plans").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		_, err = r.db.Exec(`
			INSERT INTO subscription_plans (key, name, price_euro, features) VALUES
			('decouverte', 'Découverte', 0, ARRAY[
				'Dépôt d''annonces de base',
				'Accès au catalogue de matières upcycling',
				'1 point de dépôt actif',
				'Maximum 3 projets publiés',
				'Assistance par email standard'
			]),
			('pro_essentiel', 'Pro Essentiel', 15, ARRAY[
				'Toutes les fonctionnalités Découverte',
				'Accès prioritaire limité aux annonces premium',
				'Jusqu''à 5 points de dépôt actifs',
				'Maximum 10 projets publiés',
				'Statistiques d''impact et de récupération de base',
				'Assistance prioritaire sous 48h'
			]),
			('premium_atelier', 'Premium Atelier', 30, ARRAY[
				'Toutes les fonctionnalités Pro Essentiel',
				'Filtres de recherche avancés et multicritères',
				'Alertes de matières personnalisées en temps réel',
				'Nombre de points de dépôt illimité',
				'Exports de données et bilans RSE',
				'Assistance VIP 7j/7 avec réponse rapide'
			]);
		`)
	}
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

func (r *Repository) UpdateSubscriptionPlan(ctx context.Context, key string, name string, priceEuro int, features []string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE subscription_plans
		SET name = $1, price_euro = $2, features = $3
		WHERE key = $4
	`, name, priceEuro, pq.Array(features), key)
	return err
}
