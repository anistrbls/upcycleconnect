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
		ON CONFLICT (key) DO UPDATE SET
			name = EXCLUDED.name,
			price_euro = EXCLUDED.price_euro,
			features = EXCLUDED.features;
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

func (r *Repository) UpdateSubscriptionPlan(ctx context.Context, key string, name string, priceEuro int, features []string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE subscription_plans
		SET name = $1, price_euro = $2, features = $3
		WHERE key = $4
	`, name, priceEuro, pq.Array(features), key)
	return err
}
