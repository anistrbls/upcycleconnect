package reservations

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
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

// EnsureSchema crée/migre la table service_bookings.
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
		// Nouvelles colonnes (migrations douces)
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS slot_id BIGINT REFERENCES service_slots(id) ON DELETE SET NULL`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS employee_id BIGINT REFERENCES users(id) ON DELETE SET NULL`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS booking_type TEXT NOT NULL DEFAULT 'booking'`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT 'none'`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS refund_error TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS refund_request_reason TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT NOT NULL DEFAULT ''`,
		// Réservations payées mais encore « pending » (ancien comportement) → confirmées
		`UPDATE service_bookings
		 SET status = 'confirmed'
		 WHERE status = 'pending'
		   AND payment_status = 'paid'
		   AND booking_type = 'booking'`,
	}
	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

const bookingSelect = `
	SELECT
		sb.id,
		sb.user_id,
		COALESCE(u.firstname || ' ' || u.lastname, 'Utilisateur #' || sb.user_id::TEXT) AS user_name,
		sb.service_id,
		COALESCE(s.name, 'Prestation #' || sb.service_id::TEXT) AS service_name,
		COALESCE(s.image_url, '') AS service_image_url,
		sb.booking_date,
		sb.status,
		sb.payment_status,
		sb.amount,
		sb.notes,
		sb.slot_id,
		sb.employee_id,
		COALESCE(emp.firstname || ' ' || emp.lastname, '') AS employee_name,
		sb.message,
		sb.booking_type,
		COALESCE(s.duration_minutes, 60) AS duration_minutes,
		COALESCE(sb.refund_status, 'none') AS refund_status,
		COALESCE(sb.refund_amount, 0)::float8 AS refund_amount,
		COALESCE(sb.refund_error, '') AS refund_error,
		sb.cancelled_at,
		sb.created_at
	FROM service_bookings sb
	LEFT JOIN users u    ON u.id = sb.user_id
	LEFT JOIN services s ON s.id = sb.service_id
	LEFT JOIN users emp  ON emp.id = sb.employee_id
`

// List retourne toutes les réservations avec filtres optionnels.
func (r *Repository) List(f ListFilters) ([]Booking, error) {
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
	var userParam interface{}
	if f.UserID > 0 {
		userParam = f.UserID
	}
	var employeeParam interface{}
	if f.EmployeeID > 0 {
		employeeParam = f.EmployeeID
	}

	rows, err := r.db.Query(bookingSelect+`
		WHERE ($1::TEXT   IS NULL OR sb.status         = $1)
		  AND ($2::TEXT   IS NULL OR sb.payment_status = $2)
		  AND ($3::BIGINT IS NULL OR sb.service_id     = $3)
		  AND ($4::BIGINT IS NULL OR sb.user_id        = $4)
		  AND ($5::BIGINT IS NULL OR sb.employee_id    = $5)
		ORDER BY sb.booking_date ASC
	`, statusParam, paymentParam, serviceParam, userParam, employeeParam)
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

// Delete supprime une réservation par son identifiant.
func (r *Repository) Delete(id int64) error {
	res, err := r.db.Exec(`DELETE FROM service_bookings WHERE id = $1`, id)
	if err != nil {
		return err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// GetByID retourne une réservation par son identifiant.
func (r *Repository) GetByID(id int64) (Booking, error) {
	row := r.db.QueryRow(bookingSelect+`WHERE sb.id = $1`, id)
	return scanBooking(row)
}

// UpdateStatus met à jour le statut et/ou le statut de paiement d'une réservation.
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

// CreateBooking crée une nouvelle demande ou réservation depuis l'utilisateur connecté.
func (r *Repository) CreateBooking(userID int64, p CreateBookingPayload, bookingDate time.Time) (Booking, error) {
	var amount float64
	_ = r.db.QueryRow(`SELECT price FROM services WHERE id = $1 AND status = 'actif'`, p.ServiceID).Scan(&amount)

	btype := NormalizeBookingType(p.BookingType)
	if bookingDate.IsZero() {
		bookingDate = time.Now()
	}

	paymentStatus := PaymentPending
	if amount <= 0 {
		paymentStatus = PaymentPaid
	}

	// Réservation avec créneau : confirmée dès que le paiement est réglé (ou gratuit).
	// Les demandes simples restent en attente de validation admin.
	bookingStatus := BookingPending
	if btype == BookingTypeBooking && paymentStatus == PaymentPaid {
		bookingStatus = BookingConfirmed
	}

	var id int64
	var createdAt time.Time
	err := r.db.QueryRow(`
		INSERT INTO service_bookings
			(user_id, service_id, booking_date, status, payment_status, amount, notes, slot_id, employee_id, message, booking_type)
		VALUES ($1, $2, $3, $4, $5, $6, '', $7, $8, $9, $10)
		RETURNING id, created_at
	`, userID, p.ServiceID, bookingDate, bookingStatus, paymentStatus, amount, p.SlotID, p.EmployeeID, p.Message, btype).Scan(&id, &createdAt)
	if err != nil {
		return Booking{}, err
	}
	return r.GetByID(id)
}

// AssignEmployee assigne un salarié à une réservation existante.
func (r *Repository) AssignEmployee(bookingID, employeeID int64) (Booking, error) {
	res, err := r.db.Exec(
		`UPDATE service_bookings SET employee_id = $1 WHERE id = $2`,
		employeeID, bookingID,
	)
	if err != nil {
		return Booking{}, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return Booking{}, sql.ErrNoRows
	}
	return r.GetByID(bookingID)
}

// SaveStripeSession enregistre l'identifiant de session Checkout sur une réservation.
func (r *Repository) SaveStripeSession(bookingID int64, sessionID string) error {
	_, err := r.db.Exec(
		`UPDATE service_bookings SET stripe_session_id = $1, payment_status = 'pending' WHERE id = $2`,
		sessionID, bookingID,
	)
	return err
}

// ConfirmPayment marque une réservation comme payée et confirmée après validation Stripe.
func (r *Repository) ConfirmPayment(bookingID int64, sessionID, paymentIntentID string) (Booking, error) {
	res, err := r.db.Exec(`
		UPDATE service_bookings
		SET payment_status = 'paid',
		    status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
		    stripe_session_id = $2,
		    stripe_payment_intent_id = $3
		WHERE id = $1 AND payment_status = 'pending'
	`, bookingID, sessionID, paymentIntentID)
	if err != nil {
		return Booking{}, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return r.GetByID(bookingID)
	}
	return r.GetByID(bookingID)
}

// GetBookingForCheckout charge une réservation pour initier le paiement.
func (r *Repository) GetBookingForCheckout(bookingID, userID int64) (Booking, error) {
	row := r.db.QueryRow(bookingSelect+` WHERE sb.id = $1 AND sb.user_id = $2`, bookingID, userID)
	return scanBooking(row)
}

// GetCancelContext charge le contexte d'annulation pour l'utilisateur propriétaire.
func (r *Repository) GetCancelContext(bookingID, userID int64) (CancelContext, error) {
	var c CancelContext
	err := r.db.QueryRow(`
		SELECT sb.id, sb.user_id, sb.amount, sb.payment_status, sb.status,
		       COALESCE(sb.refund_status, 'none'), COALESCE(sb.stripe_session_id, ''),
		       COALESCE(sb.stripe_payment_intent_id, ''), sb.booking_date,
		       COALESCE(s.duration_minutes, 60), COALESCE(sb.booking_type, 'booking')
		FROM service_bookings sb
		JOIN services s ON s.id = sb.service_id
		WHERE sb.id = $1 AND sb.user_id = $2
	`, bookingID, userID).Scan(
		&c.ID, &c.UserID, &c.Amount, &c.PaymentStatus, &c.Status,
		&c.RefundStatus, &c.StripeSessionID, &c.StripePaymentIntentID, &c.BookingDate,
		&c.DurationMinutes, &c.BookingType,
	)
	if err != nil {
		return CancelContext{}, err
	}
	return c, nil
}

// scanBooking factorise le scan — fonctionne avec *sql.Row et *sql.Rows.
func scanBooking(s scanner) (Booking, error) {
	var b Booking
	var cancelledAt sql.NullTime
	err := s.Scan(
		&b.ID, &b.UserID, &b.UserName,
		&b.ServiceID, &b.ServiceName, &b.ServiceImageURL,
		&b.BookingDate, &b.Status, &b.PaymentStatus,
		&b.Amount, &b.Notes,
		&b.SlotID, &b.EmployeeID, &b.EmployeeName,
		&b.Message, &b.BookingType,
		&b.DurationMinutes,
		&b.RefundStatus, &b.RefundAmount, &b.RefundError,
		&cancelledAt,
		&b.CreatedAt,
	)
	if cancelledAt.Valid {
		t := cancelledAt.Time
		b.CancelledAt = &t
	}
	return b, err
}
