package users

import (
	"database/sql"
	"fmt"
	"strings"
)

// Repository gère tous les accès à la base de données pour les utilisateurs.
// Il reçoit *sql.DB à l'initialisation, ce qui évite de dépendre de variables globales.
type Repository struct {
	db *sql.DB
}

// NewRepository crée un Repository avec la connexion DB fournie.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// EnsureSchema crée la table users si elle n'existe pas encore.
// Appelé une fois au démarrage de l'application.
func (r *Repository) EnsureSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id            BIGSERIAL PRIMARY KEY,
			firstname     TEXT NOT NULL,
			lastname      TEXT NOT NULL,
			email         TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role              TEXT NOT NULL DEFAULT 'particulier',
			status            TEXT NOT NULL DEFAULT 'pending',
			employment_status TEXT NOT NULL DEFAULT '',
			job_function      TEXT NOT NULL DEFAULT '',
			admin_note        TEXT NOT NULL DEFAULT '',
			created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			last_login_at     TIMESTAMPTZ,
			CONSTRAINT users_role_check   CHECK (role   IN ('particulier', 'professionnel', 'salarie', 'admin')),
			CONSTRAINT users_status_check CHECK (status IN ('active', 'pending', 'suspended'))
		)`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_function TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
		`UPDATE users SET role = 'professionnel' WHERE role = 'prestataire'`,
		`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('particulier', 'professionnel', 'salarie', 'admin'))`,
		`CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role)`,
		`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
	}

	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return fmt.Errorf("users schema: %w", err)
		}
	}
	return nil
}

// List retourne tous les utilisateurs filtrés selon les critères fournis.
func (r *Repository) List(f ListFilters) ([]User, error) {
	q := strings.TrimSpace(f.Query)
	role := NormalizeRole(f.Role)
	status := NormalizeStatus(f.Status)

	rows, err := r.db.Query(`
		SELECT id, firstname, lastname, email, role, status,
		       employment_status, job_function, admin_note,
		       created_at, updated_at, last_login_at
		FROM users
		WHERE ($1 = '' OR firstname ILIKE '%' || $1 || '%'
		                OR lastname  ILIKE '%' || $1 || '%'
		                OR email     ILIKE '%' || $1 || '%')
		  AND ($2 = '' OR role   = $2)
		  AND ($3 = '' OR status = $3)
		ORDER BY created_at DESC
	`, q, role, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []User
	for rows.Next() {
		u, err := scanRows(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	if result == nil {
		result = []User{}
	}
	return result, nil
}

// GetByID retourne un utilisateur par son ID, ou sql.ErrNoRows si introuvable.
func (r *Repository) GetByID(id int64) (User, error) {
	row := r.db.QueryRow(`
		SELECT id, firstname, lastname, email, role, status,
		       employment_status, job_function, admin_note,
		       created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`, id)
	return scanRow(row)
}

// GetAuthByEmail retourne les infos minimales et le hash password pour l'authentification.
func (r *Repository) GetAuthByEmail(email string) (int64, string, string, string, error) {
	var id int64
	var hash, role, status string
	err := r.db.QueryRow(`
		SELECT id, password_hash, role, status
		FROM users
		WHERE email = $1
	`, strings.ToLower(strings.TrimSpace(email))).Scan(&id, &hash, &role, &status)
	if err != nil {
		return 0, "", "", "", err
	}
	return id, hash, role, status, nil
}

// Create insère un nouvel utilisateur et retourne l'enregistrement créé.
func (r *Repository) Create(p CreatePayload, passwordHash string) (User, error) {
	role := NormalizeRole(p.Role)
	if role == "" {
		role = RoleParticulier
	}
	status := NormalizeStatus(p.Status)
	if status == "" {
		status = StatusPending
	}

	row := r.db.QueryRow(`
		INSERT INTO users (firstname, lastname, email, password_hash, role, status, employment_status, job_function)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, firstname, lastname, email, role, status,
		          employment_status, job_function, admin_note,
		          created_at, updated_at, last_login_at
	`,
		strings.TrimSpace(p.Firstname),
		strings.TrimSpace(p.Lastname),
		strings.ToLower(strings.TrimSpace(p.Email)),
		passwordHash,
		role,
		status,
		p.EmploymentStatus,
		p.JobFunction,
	)
	return scanRow(row)
}

// Update met à jour les champs modifiables d'un utilisateur.
func (r *Repository) Update(id int64, p UpdatePayload) (User, error) {
	role := NormalizeRole(p.Role)
	if role == "" {
		role = RoleParticulier
	}
	status := NormalizeStatus(p.Status)
	if status == "" {
		status = StatusPending
	}

	row := r.db.QueryRow(`
		UPDATE users
		SET firstname    = $1,
		    lastname     = $2,
		    email        = $3,
		    role              = $4,
		    status            = $5,
		    employment_status = $6,
		    job_function      = $7,
		    admin_note        = $8,
		    updated_at        = NOW()
		WHERE id = $9
		RETURNING id, firstname, lastname, email, role, status,
		          employment_status, job_function, admin_note,
		          created_at, updated_at, last_login_at
	`,
		strings.TrimSpace(p.Firstname),
		strings.TrimSpace(p.Lastname),
		strings.ToLower(strings.TrimSpace(p.Email)),
		role,
		status,
		p.EmploymentStatus,
		p.JobFunction,
		strings.TrimSpace(p.AdminNote),
		id,
	)
	return scanRow(row)
}

// Delete supprime un utilisateur par son ID.
func (r *Repository) Delete(id int64) (bool, error) {
	result, err := r.db.Exec(`DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}

// SetStatus met à jour uniquement le statut d'un utilisateur.
func (r *Repository) SetStatus(id int64, status string) (User, error) {
	row := r.db.QueryRow(`
		UPDATE users
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, firstname, lastname, email, role, status,
		          employment_status, job_function, admin_note,
		          created_at, updated_at, last_login_at
	`, status, id)
	return scanRow(row)
}



// EmailExists retourne true si l'email est déjà utilisé (optionnellement en excluant un ID).
func (r *Repository) EmailExists(email string, excludeID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id != $2)`,
		strings.ToLower(strings.TrimSpace(email)),
		excludeID,
	).Scan(&exists)
	return exists, err
}

// --- helpers internes de scan ---

// scanRows scanne une ligne depuis *sql.Rows (résultat de Query).
func scanRows(rows *sql.Rows) (User, error) {
	var u User
	var lastLogin sql.NullTime
	err := rows.Scan(
		&u.ID, &u.Firstname, &u.Lastname, &u.Email,
		&u.Role, &u.Status,
		&u.EmploymentStatus, &u.JobFunction,
		&u.AdminNote, &u.CreatedAt, &u.UpdatedAt, &lastLogin,
	)
	if err != nil {
		return User{}, err
	}
	if lastLogin.Valid {
		t := lastLogin.Time
		u.LastLoginAt = &t
	}
	return u, nil
}

// scanRow scanne une ligne depuis *sql.Row (résultat de QueryRow).
func scanRow(row *sql.Row) (User, error) {
	var u User
	var lastLogin sql.NullTime
	err := row.Scan(
		&u.ID, &u.Firstname, &u.Lastname, &u.Email,
		&u.Role, &u.Status,
		&u.EmploymentStatus, &u.JobFunction,
		&u.AdminNote, &u.CreatedAt, &u.UpdatedAt, &lastLogin,
	)
	if err != nil {
		return User{}, err
	}
	if lastLogin.Valid {
		t := lastLogin.Time
		u.LastLoginAt = &t
	}
	return u, nil
}
