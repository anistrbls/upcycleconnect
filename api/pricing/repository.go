package pricing

import "database/sql"

// Repository contient la connexion à la base de données.
type Repository struct {
	db *sql.DB
}

// NewRepository crée un nouveau Repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// EnsureSchema crée la table pricing_rules si elle n'existe pas encore.
func (r *Repository) EnsureSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS pricing_rules (
			id         BIGSERIAL PRIMARY KEY,
			label      TEXT NOT NULL,
			type       TEXT NOT NULL,
			amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
			is_active  BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT pricing_rules_type_check CHECK (type IN ('commission','subscription','promotion','flat_fee'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_pricing_rules_type      ON pricing_rules(type)`,
		`CREATE INDEX IF NOT EXISTS idx_pricing_rules_is_active ON pricing_rules(is_active)`,
	}
	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

// List retourne toutes les règles tarifaires, de la plus récente à la plus ancienne.
func (r *Repository) List() ([]PricingRule, error) {
	rows, err := r.db.Query(`
		SELECT id, label, type, amount, is_active, created_at, updated_at
		FROM pricing_rules
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]PricingRule, 0)
	for rows.Next() {
		var p PricingRule
		if err := rows.Scan(&p.ID, &p.Label, &p.Type, &p.Amount, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, nil
}

// Create insère une nouvelle règle et retourne la ligne créée.
func (r *Repository) Create(payload CreatePayload) (PricingRule, error) {
	var p PricingRule
	err := r.db.QueryRow(`
		INSERT INTO pricing_rules (label, type, amount, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id, label, type, amount, is_active, created_at, updated_at
	`, payload.Label, payload.Type, payload.Amount, payload.IsActive).Scan(
		&p.ID, &p.Label, &p.Type, &p.Amount, &p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

// Update met à jour une règle existante et retourne la ligne mise à jour.
func (r *Repository) Update(id int64, payload UpdatePayload) (PricingRule, error) {
	var p PricingRule
	err := r.db.QueryRow(`
		UPDATE pricing_rules
		SET label = $1, type = $2, amount = $3, is_active = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING id, label, type, amount, is_active, created_at, updated_at
	`, payload.Label, payload.Type, payload.Amount, payload.IsActive, id).Scan(
		&p.ID, &p.Label, &p.Type, &p.Amount, &p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return PricingRule{}, sql.ErrNoRows
	}
	return p, err
}
