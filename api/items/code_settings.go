package items

import (
	"context"
)

type CodeConfig struct {
	Length      int  `json:"length"`
	NoAmbiguous bool `json:"noAmbiguous"`
	UseSpecial  bool `json:"useSpecial"`
	UseSpaces   bool `json:"useSpaces"`
}

func (r *Repository) EnsureCodeSettingsSchema() error {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS code_settings (
			id INT PRIMARY KEY DEFAULT 1,
			length INT NOT NULL DEFAULT 6,
			no_ambiguous BOOLEAN NOT NULL DEFAULT true,
			use_special BOOLEAN NOT NULL DEFAULT false,
			use_spaces BOOLEAN NOT NULL DEFAULT false
		);
		INSERT INTO code_settings (id, length, no_ambiguous, use_special, use_spaces)
		VALUES (1, 6, true, false, false)
		ON CONFLICT DO NOTHING;
	`)
	return err
}

func (r *Repository) GetCodeConfig(ctx context.Context) (CodeConfig, error) {
	var c CodeConfig
	err := r.db.QueryRowContext(ctx, `SELECT length, no_ambiguous, use_special, use_spaces FROM code_settings WHERE id = 1`).
		Scan(&c.Length, &c.NoAmbiguous, &c.UseSpecial, &c.UseSpaces)
	return c, err
}

func (r *Repository) UpdateCodeConfig(ctx context.Context, c CodeConfig) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE code_settings SET length = $1, no_ambiguous = $2, use_special = $3, use_spaces = $4 WHERE id = 1
	`, c.Length, c.NoAmbiguous, c.UseSpecial, c.UseSpaces)
	return err
}
