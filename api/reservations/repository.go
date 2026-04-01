package reservations

import (
	"database/sql"
	"fmt"
	"strings"
)

// Repository contient la connexion à la base de données.
type Repository struct {
	db *sql.DB
}

// NewRepository crée un nouveau Repository.
func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// scanner est une interface commune à *sql.Row et *sql.Rows pour factoriser le scan.
type scanner interface {
	Scan(dest ...any) error
}

// EnsureSchema crée la table service_bookings si elle n'existe pas encore.
// Doit être appelé après la création des tables users et services.
func (r *Repository) EnsureSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS service_bookings (
			id             BIGSERIAL PRIMARY KEY,
			user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
			service_id     BIGINT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
			booking_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			status         TEXT NOT NULL DEFAULT 'pending',
			payment_status TEXT NOT NULL DEFAULT 'pending',
			amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
			notes          TEXT NOT NULL DEFAULT '',
			created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT service_bookings_status_check  CHECK (status IN ('pending','confirmed','cancelled','completed')),
			CONSTRAINT service_bookings_payment_check CHECK (payment_status IN ('paid','pending','refunded'))
		)`,
		`CREATE INDEX IF NOT EXISTS idx_service_bookings_user_id    ON service_bookings(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_service_bookings_service_id ON service_bookings(service_id)`,
		`CREATE INDEX IF NOT EXISTS idx_service_bookings_status     ON service_bookings(status)`,
	}
	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

// List retourne toutes les réservations, avec jointure sur users et services.
func (r *Repository) List(f ListFilters) ([]Booking, error) {
	// nil = pas de filtre sur ce champ (PostgreSQL : $1::TEXT IS NULL → vrai)
	var statusParam interface{}
	if f.Status != "" {
		statusParam = f.Status
	}
	var paymentParam interface{}
	if f.PaymentStatus != "" {
		paymentParam = f.PaymentStatus
	}
	var serviceParam interface{}
	if f.ServiceID > 0 {
		serviceParam = f.ServiceID
	}

	rows, err := r.db.Query(`
		SELECT
			sb.id,
			sb.user_id,
			COALESCE(u.firstname || ' ' || u.lastname, 'Utilisateur #' || sb.user_id::TEXT) AS user_name,
			sb.service_id,
			COALESCE(s.name, 'Prestation #' || sb.service_id::TEXT) AS service_name,
			sb.booking_date,
			sb.status,
			sb.payment_status,
			sb.amount,
			sb.notes,
			sb.created_at
		FROM service_bookings sb
		LEFT JOIN users u    ON u.id = sb.user_id
		LEFT JOIN services s ON s.id = sb.service_id
		WHERE ($1::TEXT   IS NULL OR sb.status         = $1)
		  AND ($2::TEXT   IS NULL OR sb.payment_status = $2)
		  AND ($3::BIGINT IS NULL OR sb.service_id     = $3)
		ORDER BY sb.created_at DESC
	`, statusParam, paymentParam, serviceParam)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]Booking, 0)
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, b)
	}
	return result, nil
}

// GetByID retourne une réservation par son identifiant.
func (r *Repository) GetByID(id int64) (Booking, error) {
	row := r.db.QueryRow(`
		SELECT
			sb.id,
			sb.user_id,
			COALESCE(u.firstname || ' ' || u.lastname, 'Utilisateur #' || sb.user_id::TEXT) AS user_name,
			sb.service_id,
			COALESCE(s.name, 'Prestation #' || sb.service_id::TEXT) AS service_name,
			sb.booking_date,
			sb.status,
			sb.payment_status,
			sb.amount,
			sb.notes,
			sb.created_at
		FROM service_bookings sb
		LEFT JOIN users u    ON u.id = sb.user_id
		LEFT JOIN services s ON s.id = sb.service_id
		WHERE sb.id = $1
	`, id)
	return scanBooking(row)
}

// UpdateStatus met à jour le statut et/ou le statut de paiement d'une réservation.
// Seuls les champs non-vides du payload sont mis à jour.
func (r *Repository) UpdateStatus(id int64, p UpdateStatusPayload) (Booking, error) {
	var setClauses []string
	var args []interface{}

	if p.Status != "" {
		args = append(args, p.Status)
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", len(args)))
	}
	if p.PaymentStatus != "" {
		args = append(args, p.PaymentStatus)
		setClauses = append(setClauses, fmt.Sprintf("payment_status = $%d", len(args)))
	}
	if len(setClauses) == 0 {
		return r.GetByID(id)
	}

	args = append(args, id)
	query := fmt.Sprintf(
		"UPDATE service_bookings SET %s WHERE id = $%d",
		strings.Join(setClauses, ", "),
		len(args),
	)

	res, err := r.db.Exec(query, args...)
	if err != nil {
		return Booking{}, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return Booking{}, sql.ErrNoRows
	}
	return r.GetByID(id)
}

// scanBooking factorise le scan d'une ligne — fonctionne avec *sql.Row et *sql.Rows.
func scanBooking(s scanner) (Booking, error) {
	var b Booking
	err := s.Scan(
		&b.ID, &b.UserID, &b.UserName,
		&b.ServiceID, &b.ServiceName,
		&b.BookingDate, &b.Status, &b.PaymentStatus,
		&b.Amount, &b.Notes, &b.CreatedAt,
	)
	return b, err
}
