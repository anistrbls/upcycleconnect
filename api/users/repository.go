package users

import (
	"database/sql"
	"fmt"
	"strings"
)

// Repository gère tous les accès à la base de données pour les utilisateurs.
type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// DB expose la connexion pour des agrégations transverses (ex. score UC projets).
func (r *Repository) DB() *sql.DB {
	return r.db
}

// EnsureSchema crée/migre la table users.
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
		// Champs existants (idempotents)
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_function TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
		`UPDATE users SET role = 'professionnel' WHERE role = 'prestataire'`,
		`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('particulier', 'professionnel', 'salarie', 'admin'))`,

		// Nouveaux champs communs
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT ''`,

		// Nouveaux champs Professionnel
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_manager TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS siret TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS zip_code TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS intervention_zone TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type TEXT NOT NULL DEFAULT 'decouverte'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_billing_cycle TEXT NOT NULL DEFAULT 'month'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NOT NULL DEFAULT ''`,

		// Nouveaux champs Salarié
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_role TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS site_location TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT NOT NULL DEFAULT ''`,

		// Nouveaux champs Admin
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role TEXT NOT NULL DEFAULT ''`,

		// Tutoriel
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false`,

		// Index
		`CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role)`,
		`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,

		// Invalidation de session
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_invalid_before TIMESTAMPTZ`,
	}

	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return fmt.Errorf("users schema: %w", err)
		}
	}
	return nil
}

// List retourne tous les utilisateurs filtrés.
func (r *Repository) List(f ListFilters) ([]User, error) {
	q := strings.TrimSpace(f.Query)
	role := NormalizeRole(f.Role)
	status := NormalizeStatus(f.Status)

	rows, err := r.db.Query(`
		SELECT id, firstname, lastname, email, role, status,
		       phone, city,
		       company_name, company_manager, siret, address, zip_code,
		       activity_type, intervention_zone, subscription_type, subscription_start,
		       employment_status, job_function, employee_role, site_location, skills,
		       admin_role, admin_note,
		       tutorial_completed,
		       created_at, updated_at, last_login_at, sessions_invalid_before
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

// GetByID retourne un utilisateur par son ID.
func (r *Repository) GetByID(id int64) (User, error) {
	row := r.db.QueryRow(`
		SELECT id, firstname, lastname, email, role, status,
		       phone, city,
		       company_name, company_manager, siret, address, zip_code,
		       activity_type, intervention_zone, subscription_type, subscription_start,
		       employment_status, job_function, employee_role, site_location, skills,
		       admin_role, admin_note,
		       tutorial_completed,
		       created_at, updated_at, last_login_at, sessions_invalid_before
		FROM users
		WHERE id = $1
	`, id)
	return scanRow(row)
}

// GetAuthByEmail retourne le minimum nécessaire à l'authentification.
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

// Create insère un nouvel utilisateur.
func (r *Repository) Create(p CreatePayload, passwordHash string) (User, error) {
	role := NormalizeRole(p.Role)
	if role == "" {
		role = RoleParticulier
	}
	status := NormalizeStatus(p.Status)
	if status == "" {
		status = StatusPending
	}
	p.SubscriptionType = normalizeSubscriptionType(p.SubscriptionType)
	if p.SubscriptionType == "" {
		p.SubscriptionType = "decouverte"
	}

	row := r.db.QueryRow(`
		INSERT INTO users (
			firstname, lastname, email, password_hash, role, status,
			phone, city,
			company_name, company_manager, siret, address, zip_code,
			activity_type, intervention_zone, subscription_type, subscription_start,
			employment_status, job_function, employee_role, site_location, skills,
			admin_role
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
		RETURNING id, firstname, lastname, email, role, status,
		          phone, city,
		          company_name, company_manager, siret, address, zip_code,
		          activity_type, intervention_zone, subscription_type, subscription_start,
		          employment_status, job_function, employee_role, site_location, skills,
		          admin_role, admin_note,
		          tutorial_completed,
		          created_at, updated_at, last_login_at, sessions_invalid_before
	`,
		strings.TrimSpace(p.Firstname),
		strings.TrimSpace(p.Lastname),
		strings.ToLower(strings.TrimSpace(p.Email)),
		passwordHash,
		role,
		status,
		p.Phone,
		p.City,
		p.CompanyName,
		p.CompanyManager,
		p.Siret,
		p.Address,
		p.ZipCode,
		p.ActivityType,
		p.InterventionZone,
		p.SubscriptionType,
		p.SubscriptionStart,
		p.EmploymentStatus,
		p.JobFunction,
		p.EmployeeRole,
		p.SiteLocation,
		p.Skills,
		p.AdminRole,
	)
	return scanRow(row)
}

// Update met à jour les champs modifiables.
func (r *Repository) Update(id int64, p UpdatePayload) (User, error) {
	role := NormalizeRole(p.Role)
	if role == "" {
		role = RoleParticulier
	}
	status := NormalizeStatus(p.Status)
	if status == "" {
		status = StatusPending
	}
	p.SubscriptionType = normalizeSubscriptionType(p.SubscriptionType)
	if p.SubscriptionType == "" {
		p.SubscriptionType = "decouverte"
	}

	row := r.db.QueryRow(`
		UPDATE users
		SET firstname    = $1,
		    lastname     = $2,
		    email        = $3,
		    role         = $4,
		    status       = $5,
		    phone             = $6,
		    city              = $7,
		    company_name      = $8,
		    company_manager   = $9,
		    siret             = $10,
		    address           = $11,
		    zip_code          = $12,
		    activity_type     = $13,
		    intervention_zone = $14,
		    subscription_type  = $15,
		    subscription_start = $16,
		    employment_status = $17,
		    job_function      = $18,
		    employee_role     = $19,
		    site_location     = $20,
		    skills            = $21,
		    admin_role        = $22,
		    admin_note        = $23,
		    updated_at        = NOW()
		WHERE id = $24
		RETURNING id, firstname, lastname, email, role, status,
		          phone, city,
		          company_name, company_manager, siret, address, zip_code,
		          activity_type, intervention_zone, subscription_type, subscription_start,
		          employment_status, job_function, employee_role, site_location, skills,
		          admin_role, admin_note,
		          tutorial_completed,
		          created_at, updated_at, last_login_at, sessions_invalid_before
	`,
		strings.TrimSpace(p.Firstname),
		strings.TrimSpace(p.Lastname),
		strings.ToLower(strings.TrimSpace(p.Email)),
		role,
		status,
		p.Phone,
		p.City,
		p.CompanyName,
		p.CompanyManager,
		p.Siret,
		p.Address,
		p.ZipCode,
		p.ActivityType,
		p.InterventionZone,
		p.SubscriptionType,
		p.SubscriptionStart,
		p.EmploymentStatus,
		p.JobFunction,
		p.EmployeeRole,
		p.SiteLocation,
		p.Skills,
		p.AdminRole,
		strings.TrimSpace(p.AdminNote),
		id,
	)
	return scanRow(row)
}

// Delete supprime un utilisateur.
func (r *Repository) Delete(id int64) (bool, error) {
	result, err := r.db.Exec(`DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return false, err
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}

// SetStatus met à jour uniquement le statut.
func (r *Repository) SetStatus(id int64, status string) (User, error) {
	row := r.db.QueryRow(`
		UPDATE users
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, firstname, lastname, email, role, status,
		          phone, city,
		          company_name, company_manager, siret, address, zip_code,
		          activity_type, intervention_zone, subscription_type, subscription_start,
		          employment_status, job_function, employee_role, site_location, skills,
		          admin_role, admin_note,
		          tutorial_completed,
		          created_at, updated_at, last_login_at, sessions_invalid_before
	`, status, id)
	return scanRow(row)
}

// EmailExists retourne true si l'email est déjà utilisé.
func (r *Repository) EmailExists(email string, excludeID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id != $2)`,
		strings.ToLower(strings.TrimSpace(email)),
		excludeID,
	).Scan(&exists)
	return exists, err
}

// SetPassword met à jour le mot de passe d'un utilisateur.
func (r *Repository) SetPassword(id int64, hash string, invalidateSessions bool) error {
	query := `UPDATE users SET password_hash = $1, updated_at = NOW()`
	if invalidateSessions {
		query += `, sessions_invalid_before = NOW()`
	}
	query += ` WHERE id = $2`
	_, err := r.db.Exec(query, hash, id)
	return err
}

// UpdateProfile met à jour les informations de base de l'utilisateur.
func (r *Repository) UpdateProfile(id int64, p UpdateProfilePayload) (User, error) {
	row := r.db.QueryRow(`
		UPDATE users
		SET firstname = $1,
		    lastname  = $2,
		    email     = $3,
		    phone     = $4,
		    city      = $5,
		    updated_at = NOW()
		WHERE id = $6
		RETURNING id, firstname, lastname, email, role, status,
		          phone, city,
		          company_name, company_manager, siret, address, zip_code,
		          activity_type, intervention_zone, subscription_type, subscription_start,
		          employment_status, job_function, employee_role, site_location, skills,
		          admin_role, admin_note,
		          tutorial_completed,
		          created_at, updated_at, last_login_at, sessions_invalid_before
	`,
		strings.TrimSpace(p.Firstname),
		strings.TrimSpace(p.Lastname),
		strings.ToLower(strings.TrimSpace(p.Email)),
		strings.TrimSpace(p.Phone),
		strings.TrimSpace(p.City),
		id,
	)
	return scanRow(row)
}

// GetPasswordHash retourne le hash du mot de passe pour vérification.
func (r *Repository) GetPasswordHash(id int64) (string, error) {
	var hash string
	err := r.db.QueryRow(`SELECT password_hash FROM users WHERE id = $1`, id).Scan(&hash)
	return hash, err
}

// --- helpers scan ---

func scanRows(rows *sql.Rows) (User, error) {
	var u User
	var lastLogin sql.NullTime
	var subscriptionStart sql.NullTime
	var sessionsInvalidBefore sql.NullTime
	err := rows.Scan(
		&u.ID, &u.Firstname, &u.Lastname, &u.Email,
		&u.Role, &u.Status,
		&u.Phone, &u.City,
		&u.CompanyName, &u.CompanyManager, &u.Siret, &u.Address, &u.ZipCode,
		&u.ActivityType, &u.InterventionZone, &u.SubscriptionType, &subscriptionStart,
		&u.EmploymentStatus, &u.JobFunction, &u.EmployeeRole, &u.SiteLocation, &u.Skills,
		&u.AdminRole, &u.AdminNote,
		&u.TutorialCompleted,
		&u.CreatedAt, &u.UpdatedAt, &lastLogin, &sessionsInvalidBefore,
	)
	if err != nil {
		return User{}, err
	}
	if lastLogin.Valid {
		t := lastLogin.Time
		u.LastLoginAt = &t
	}
	if subscriptionStart.Valid {
		t := subscriptionStart.Time
		u.SubscriptionStart = &t
	}
	if sessionsInvalidBefore.Valid {
		t := sessionsInvalidBefore.Time
		u.SessionsInvalidBefore = &t
	}
	if u.Role == "professionnel" {
		u.SubscriptionType = normalizeSubscriptionType(u.SubscriptionType)
		if u.SubscriptionType == "" {
			u.SubscriptionType = "decouverte"
		}
	}
	return u, nil
}

// GetSellerRatingAggregate retourne la moyenne et le nombre d'avis dans pro_seller_ratings pour ce vendeur (seller_user_id).
func (r *Repository) GetSellerRatingAggregate(sellerUserID int64) (avg *float64, count int64, err error) {
	var avgNull sql.NullFloat64
	err = r.db.QueryRow(`
		SELECT AVG(stars)::float8, COUNT(*)::bigint
		FROM pro_seller_ratings
		WHERE seller_user_id = $1
	`, sellerUserID).Scan(&avgNull, &count)
	if err != nil {
		return nil, 0, err
	}
	if count > 0 && avgNull.Valid {
		v := avgNull.Float64
		return &v, count, nil
	}
	return nil, count, nil
}

// GetProRatingAggregate retourne la moyenne et le nombre d'avis dans seller_pro_ratings pour ce professionnel (pro_user_id).
func (r *Repository) GetProRatingAggregate(proUserID int64) (avg *float64, count int64, err error) {
	var avgNull sql.NullFloat64
	err = r.db.QueryRow(`
		SELECT AVG(stars)::float8, COUNT(*)::bigint
		FROM seller_pro_ratings
		WHERE pro_user_id = $1
	`, proUserID).Scan(&avgNull, &count)
	if err != nil {
		return nil, 0, err
	}
	if count > 0 && avgNull.Valid {
		v := avgNull.Float64
		return &v, count, nil
	}
	return nil, count, nil
}

func scanRow(row *sql.Row) (User, error) {
	var u User
	var lastLogin sql.NullTime
	var subscriptionStart sql.NullTime
	var sessionsInvalidBefore sql.NullTime
	err := row.Scan(
		&u.ID, &u.Firstname, &u.Lastname, &u.Email,
		&u.Role, &u.Status,
		&u.Phone, &u.City,
		&u.CompanyName, &u.CompanyManager, &u.Siret, &u.Address, &u.ZipCode,
		&u.ActivityType, &u.InterventionZone, &u.SubscriptionType, &subscriptionStart,
		&u.EmploymentStatus, &u.JobFunction, &u.EmployeeRole, &u.SiteLocation, &u.Skills,
		&u.AdminRole, &u.AdminNote,
		&u.TutorialCompleted,
		&u.CreatedAt, &u.UpdatedAt, &lastLogin, &sessionsInvalidBefore,
	)
	if err != nil {
		return User{}, err
	}
	if lastLogin.Valid {
		t := lastLogin.Time
		u.LastLoginAt = &t
	}
	if subscriptionStart.Valid {
		t := subscriptionStart.Time
		u.SubscriptionStart = &t
	}
	if sessionsInvalidBefore.Valid {
		t := sessionsInvalidBefore.Time
		u.SessionsInvalidBefore = &t
	}
	if u.Role == "professionnel" {
		u.SubscriptionType = normalizeSubscriptionType(u.SubscriptionType)
		if u.SubscriptionType == "" {
			u.SubscriptionType = "decouverte"
		}
	}
	return u, nil
}

func normalizeSubscriptionType(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	switch value {
	case "", "gratuit", "none":
		return "decouverte"
	default:
		return value
	}
}
