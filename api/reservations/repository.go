package reservations

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"upcycleconnect/api/items"
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

func financeNotificationColumn(notifType string) string {
	switch strings.TrimSpace(notifType) {
	case "finance_payment_confirmed":
		return "app_finance_payment_confirmed"
	case "finance_payment_received":
		return "app_finance_payment_received"
	case "finance_payment_failed":
		return "app_finance_payment_failed"
	case "finance_refund_issued":
		return "app_finance_refund_issued"
	case "finance_subscription_active":
		return "app_finance_subscription_active"
	default:
		return ""
	}
}

func (r *Repository) createFinanceNotification(ctx context.Context, userID int64, title, message, notifType string) {
	if userID <= 0 {
		return
	}
	column := financeNotificationColumn(notifType)
	if column == "" {
		return
	}

	var enabled bool
	query := fmt.Sprintf(`SELECT COALESCE(app_enabled, true) AND COALESCE(%s, true) FROM user_notification_settings WHERE user_id = $1`, column)
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&enabled)
	if err == nil && !enabled {
		return
	}

	_ = items.CreateNotification(ctx, r.db, userID, title, message, notifType)
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
		// service_reminder_sent : évite d'envoyer plusieurs rappels pour le même rendez-vous
		`ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS service_reminder_sent BOOLEAN NOT NULL DEFAULT false`,
		`CREATE TABLE IF NOT EXISTS user_notification_settings (
			user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			app_enabled BOOLEAN NOT NULL DEFAULT true,
			email_enabled BOOLEAN NOT NULL DEFAULT true,
			app_moderation BOOLEAN NOT NULL DEFAULT true,
			email_moderation BOOLEAN NOT NULL DEFAULT true,
			app_booking_received BOOLEAN NOT NULL DEFAULT true,
			email_booking_received BOOLEAN NOT NULL DEFAULT true,
			app_point_assigned BOOLEAN NOT NULL DEFAULT true,
			email_point_assigned BOOLEAN NOT NULL DEFAULT true,
			app_material_deposited BOOLEAN NOT NULL DEFAULT true,
			email_material_deposited BOOLEAN NOT NULL DEFAULT true,
			app_material_recovered BOOLEAN NOT NULL DEFAULT true,
			email_material_recovered BOOLEAN NOT NULL DEFAULT true,
			app_rating_received BOOLEAN NOT NULL DEFAULT true,
			email_rating_received BOOLEAN NOT NULL DEFAULT true,
			app_booking_cancelled BOOLEAN NOT NULL DEFAULT true,
			email_booking_cancelled BOOLEAN NOT NULL DEFAULT true,
			app_booking_expired BOOLEAN NOT NULL DEFAULT true,
			email_booking_expired BOOLEAN NOT NULL DEFAULT true,
			app_deposit_reminder BOOLEAN NOT NULL DEFAULT true,
			email_deposit_reminder BOOLEAN NOT NULL DEFAULT true,
			app_material_alerts BOOLEAN NOT NULL DEFAULT true,
			display_mode TEXT NOT NULL DEFAULT 'light',
			language TEXT NOT NULL DEFAULT 'fr',
			map_type TEXT NOT NULL DEFAULT 'plan',
			show_phone_publicly BOOLEAN NOT NULL DEFAULT false,
			show_email_publicly BOOLEAN NOT NULL DEFAULT false
		)`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_conseil_moderation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_conseil_moderation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_new_conseil BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_new_conseil BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_conseil_engagement BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_project_engagement BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_admin_new_conseil BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_admin_new_conseil BOOLEAN NOT NULL DEFAULT true`,
		// Prestations — notification de prestation terminée
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_service_completed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_service_completed BOOLEAN NOT NULL DEFAULT true`,
		// Prestations — clés manquantes
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_booking_confirmed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_booking_confirmed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_booking_request_received BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_booking_request_received BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_prestation_booking_cancelled BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_prestation_booking_cancelled BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_service_reminder BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_service_reminder BOOLEAN NOT NULL DEFAULT true`,
		// Événements — clés manquantes
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_event_registration BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_event_registration BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_event_cancellation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_event_cancellation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_event_reminder BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_event_reminder BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_event_moderation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_event_moderation BOOLEAN NOT NULL DEFAULT true`,
		// Forum — clés manquantes
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_forum_new_reply BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_forum_new_reply BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_forum_mention BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_forum_mention BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_forum_moderation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_forum_moderation BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_admin_forum_report BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_admin_forum_report BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_finance_payment_confirmed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_finance_payment_confirmed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_finance_payment_received BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_finance_payment_received BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_finance_payment_failed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_finance_payment_failed BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_finance_refund_issued BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_finance_refund_issued BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_finance_subscription_active BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS email_finance_subscription_active BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE user_notification_settings ADD COLUMN IF NOT EXISTS app_material_alerts BOOLEAN NOT NULL DEFAULT true`,
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

// sendUpcomingServiceReminders envoie une notification 24h avant chaque rendez-vous
// de prestation confirmé qui n'a pas encore reçu de rappel.
func (r *Repository) sendUpcomingServiceReminders() {
	ctx := context.Background()
	rows, err := r.db.QueryContext(ctx, `
		SELECT sb.id, sb.user_id, sb.employee_id,
		       COALESCE(u.firstname || ' ' || u.lastname, 'Client #' || sb.user_id::TEXT),
		       COALESCE(s.name, 'Prestation #' || sb.service_id::TEXT),
		       sb.booking_date
		FROM service_bookings sb
		LEFT JOIN users u    ON u.id = sb.user_id
		LEFT JOIN services s ON s.id = sb.service_id
		WHERE sb.status = 'confirmed'
		  AND sb.booking_date > NOW()
		  AND sb.booking_date <= NOW() + INTERVAL '24 hours'
		  AND sb.service_reminder_sent = false
	`)
	if err != nil {
		return
	}
	defer rows.Close()

	type reminder struct {
		id          int64
		userID      int64
		employeeID  *int64
		clientName  string
		serviceName string
		bookingDate time.Time
	}
	var reminders []reminder
	for rows.Next() {
		var rem reminder
		if err := rows.Scan(&rem.id, &rem.userID, &rem.employeeID,
			&rem.clientName, &rem.serviceName, &rem.bookingDate); err == nil {
			reminders = append(reminders, rem)
		}
	}

	for _, rem := range reminders {
		// Notifier le client
		msgClient := fmt.Sprintf(
			"Rappel : votre rendez-vous pour la prestation \"%s\" est prévu demain à %s.",
			rem.serviceName,
			rem.bookingDate.Format("15h04"),
		)
		_ = items.CreateNotification(ctx, r.db, rem.userID,
			"Rappel de prestation", msgClient, "service_reminder")

		// Notifier le prestataire/salarié assigné
		if rem.employeeID != nil {
			msgEmp := fmt.Sprintf(
				"Rappel : vous avez un rendez-vous pour la prestation \"%s\" demain à %s avec %s.",
				rem.serviceName,
				rem.bookingDate.Format("15h04"),
				rem.clientName,
			)
			_ = items.CreateNotification(ctx, r.db, *rem.employeeID,
				"Rappel de prestation", msgEmp, "service_reminder")
		}

		// Marquer le rappel comme envoyé
		_, _ = r.db.ExecContext(ctx,
			`UPDATE service_bookings SET service_reminder_sent = true WHERE id = $1`,
			rem.id,
		)
	}
}

// List retourne toutes les réservations avec filtres optionnels.
func (r *Repository) List(f ListFilters) ([]Booking, error) {
	r.sendUpcomingServiceReminders()
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
	booking, err := r.GetByID(id)
	if err != nil {
		return Booking{}, err
	}
	if affected > 0 {
		ctx := context.Background()
		dateStr := booking.BookingDate.Format("02/01/2006 à 15h04")
		if p.Status == BookingConfirmed {
			msg := fmt.Sprintf("Votre réservation pour la prestation \"%s\" le %s a été confirmée !", booking.ServiceName, dateStr)
			_ = items.CreateNotification(ctx, r.db, booking.UserID, "Réservation confirmée", msg, "booking_confirmed")
		} else if p.Status == BookingCancelled {
			msg := fmt.Sprintf("Votre réservation pour \"%s\" le %s a été annulée. Un remboursement a été initié le cas échéant.", booking.ServiceName, dateStr)
			_ = items.CreateNotification(ctx, r.db, booking.UserID, "Réservation annulée", msg, "booking_cancelled")
		} else if p.Status == BookingCompleted {
			// Vérifier que le client a activé cette notification
			var enabled bool
			err := r.db.QueryRowContext(ctx,
				`SELECT COALESCE(app_service_completed, true) FROM user_notification_settings WHERE user_id = $1`,
				booking.UserID,
			).Scan(&enabled)
			if err != nil {
				// Ligne absente = préférence par défaut = activé
				enabled = true
			}
			if enabled {
				msg := fmt.Sprintf(
					"Votre prestation \"%s\" du %s est terminée. Merci de votre confiance !",
					booking.ServiceName, dateStr,
				)
				_ = items.CreateNotification(ctx, r.db, booking.UserID, "Prestation terminée", msg, "service_completed")
			}
		}

		if p.PaymentStatus == PaymentPaid {
			msg := fmt.Sprintf("Le paiement de votre réservation pour \"%s\" le %s est confirmé.", booking.ServiceName, dateStr)
			r.createFinanceNotification(ctx, booking.UserID, "Paiement confirmé", msg, "finance_payment_confirmed")
			if booking.EmployeeID != nil && *booking.EmployeeID > 0 && *booking.EmployeeID != booking.UserID {
				receivedMsg := fmt.Sprintf("Paiement reçu pour la prestation \"%s\" du %s.", booking.ServiceName, dateStr)
				r.createFinanceNotification(ctx, *booking.EmployeeID, "Paiement reçu", receivedMsg, "finance_payment_received")
			}
		} else if p.PaymentStatus == PaymentRefunded {
			msg := fmt.Sprintf("Le remboursement de votre réservation pour \"%s\" a été traité.", booking.ServiceName)
			r.createFinanceNotification(ctx, booking.UserID, "Remboursement effectué", msg, "finance_refund_issued")
		}
	}

	return booking, nil
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
	booking, err := r.GetByID(id)
	if err != nil {
		return Booking{}, err
	}

	ctx := context.Background()

	// 1. If it is pending request validation
	if booking.Status == BookingPending {
		msg := fmt.Sprintf("Nouvelle demande de prestation reçue pour \"%s\" de la part de %s.", booking.ServiceName, booking.UserName)
		if booking.EmployeeID != nil && *booking.EmployeeID > 0 {
			_ = items.CreateNotification(ctx, r.db, *booking.EmployeeID, "Nouvelle demande de prestation", msg, "booking_request_received")
		}
		// Also notify admins
		if admins, errAdmins := r.GetAdminIDs(ctx); errAdmins == nil {
			for _, adminID := range admins {
				if booking.EmployeeID == nil || adminID != *booking.EmployeeID {
					_ = items.CreateNotification(ctx, r.db, adminID, "Nouvelle demande de prestation", msg, "booking_request_received")
				}
			}
		}
	}

	// 2. If it is confirmed immediately
	if booking.Status == BookingConfirmed {
		dateStr := booking.BookingDate.Format("02/01/2006 à 15h04")
		msg := fmt.Sprintf("Votre réservation pour la prestation \"%s\" le %s a été confirmée !", booking.ServiceName, dateStr)
		_ = items.CreateNotification(ctx, r.db, booking.UserID, "Réservation confirmée", msg, "booking_confirmed")
	}

	return booking, nil
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
	booking, err := r.GetByID(bookingID)
	if err != nil {
		return Booking{}, err
	}
	if affected > 0 && booking.Status == BookingConfirmed {
		ctx := context.Background()
		dateStr := booking.BookingDate.Format("02/01/2006 à 15h04")
		msg := fmt.Sprintf("Votre réservation pour la prestation \"%s\" le %s a été confirmée !", booking.ServiceName, dateStr)
		_ = items.CreateNotification(ctx, r.db, booking.UserID, "Réservation confirmée", msg, "booking_confirmed")
		r.createFinanceNotification(ctx, booking.UserID, "Paiement confirmé", msg, "finance_payment_confirmed")
		if booking.EmployeeID != nil && *booking.EmployeeID > 0 && *booking.EmployeeID != booking.UserID {
			receivedMsg := fmt.Sprintf("Paiement reçu pour la prestation \"%s\" du %s.", booking.ServiceName, dateStr)
			r.createFinanceNotification(ctx, *booking.EmployeeID, "Paiement reçu", receivedMsg, "finance_payment_received")
		}
	}
	return booking, nil
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

// GetAdminIDs retrieves all user IDs that have the 'admin' role.
func (r *Repository) GetAdminIDs(ctx context.Context) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id FROM users WHERE role = 'admin'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

// NotificationSettings represents user notification preferences.
type NotificationSettings struct {
    UserID                int64 `json:"user_id"`
    AppEnabled            bool  `json:"appEnabled"`
    EmailEnabled          bool  `json:"emailEnabled"`
    AppModeration         bool  `json:"app_moderation"`
    EmailModeration       bool  `json:"email_moderation"`
    AppBookingReceived    bool  `json:"app_booking_received"`
    EmailBookingReceived  bool  `json:"email_booking_received"`
    AppPointAssigned      bool  `json:"app_point_assigned"`
    EmailPointAssigned    bool  `json:"email_point_assigned"`
    AppMaterialDeposited  bool  `json:"app_material_deposited"`
    EmailMaterialDeposited bool `json:"email_material_deposited"`
    AppMaterialRecovered  bool  `json:"app_material_recovered"`
    EmailMaterialRecovered bool `json:"email_material_recovered"`
    AppRatingReceived     bool  `json:"app_rating_received"`
    EmailRatingReceived   bool  `json:"email_rating_received"`
    AppBookingCancelled   bool  `json:"app_booking_cancelled"`
    EmailBookingCancelled bool  `json:"email_booking_cancelled"`
    AppBookingExpired     bool  `json:"app_booking_expired"`
    EmailBookingExpired   bool  `json:"email_booking_expired"`
    AppDepositReminder    bool  `json:"app_deposit_reminder"`
    EmailDepositReminder  bool  `json:"email_deposit_reminder"`
    AppConseilModeration  bool  `json:"app_conseil_moderation"`
    EmailConseilModeration bool `json:"email_conseil_moderation"`
    AppNewConseil         bool  `json:"app_new_conseil"`
    EmailNewConseil       bool  `json:"email_new_conseil"`
    AppConseilEngagement  bool  `json:"app_conseil_engagement"`
    AppProjectEngagement  bool  `json:"app_project_engagement"`
    AppAdminNewConseil    bool  `json:"app_admin_new_conseil"`
    EmailAdminNewConseil  bool  `json:"email_admin_new_conseil"`
    AppServiceCompleted              bool  `json:"app_service_completed"`
    EmailServiceCompleted            bool  `json:"email_service_completed"`
    AppBookingConfirmed              bool  `json:"app_booking_confirmed"`
    EmailBookingConfirmed            bool  `json:"email_booking_confirmed"`
    AppBookingRequestReceived        bool  `json:"app_booking_request_received"`
    EmailBookingRequestReceived      bool  `json:"email_booking_request_received"`
    AppPrestationBookingCancelled    bool  `json:"app_prestation_booking_cancelled"`
    EmailPrestationBookingCancelled  bool  `json:"email_prestation_booking_cancelled"`
    AppServiceReminder               bool  `json:"app_service_reminder"`
    EmailServiceReminder             bool  `json:"email_service_reminder"`
    AppEventRegistration             bool  `json:"app_event_registration"`
    EmailEventRegistration           bool  `json:"email_event_registration"`
    AppEventCancellation             bool  `json:"app_event_cancellation"`
    EmailEventCancellation           bool  `json:"email_event_cancellation"`
    AppEventReminder                 bool  `json:"app_event_reminder"`
    EmailEventReminder               bool  `json:"email_event_reminder"`
    AppEventModeration               bool  `json:"app_event_moderation"`
    EmailEventModeration             bool  `json:"email_event_moderation"`
    AppForumNewReply                 bool  `json:"app_forum_new_reply"`
    EmailForumNewReply               bool  `json:"email_forum_new_reply"`
    AppForumMention                  bool  `json:"app_forum_mention"`
    EmailForumMention                bool  `json:"email_forum_mention"`
    AppForumModeration               bool  `json:"app_forum_moderation"`
    EmailForumModeration             bool  `json:"email_forum_moderation"`
    AppAdminForumReport              bool  `json:"app_admin_forum_report"`
    EmailAdminForumReport            bool  `json:"email_admin_forum_report"`
    AppFinancePaymentConfirmed       bool  `json:"app_finance_payment_confirmed"`
    EmailFinancePaymentConfirmed     bool  `json:"email_finance_payment_confirmed"`
    AppFinancePaymentReceived        bool  `json:"app_finance_payment_received"`
    EmailFinancePaymentReceived      bool  `json:"email_finance_payment_received"`
    AppFinancePaymentFailed          bool  `json:"app_finance_payment_failed"`
    EmailFinancePaymentFailed        bool  `json:"email_finance_payment_failed"`
    AppFinanceRefundIssued           bool  `json:"app_finance_refund_issued"`
    EmailFinanceRefundIssued         bool  `json:"email_finance_refund_issued"`
	AppFinanceSubscriptionActive     bool  `json:"app_finance_subscription_active"`
	EmailFinanceSubscriptionActive   bool  `json:"email_finance_subscription_active"`
	AppMaterialAlerts                bool  `json:"app_material_alerts"`
    DisplayMode           string `json:"displayMode"`
    Language              string `json:"language"`
    MapType               string `json:"mapType"`
    ShowPhonePublicly     bool   `json:"showPhonePublicly"`
    ShowEmailPublicly     bool   `json:"showEmailPublicly"`
}

// GetUserNotificationSettings fetches notification settings for a given user.
func (r *Repository) GetUserNotificationSettings(userID int64) (NotificationSettings, error) {
    var s NotificationSettings
    row := r.db.QueryRow(`SELECT user_id, app_enabled, email_enabled, app_moderation, email_moderation,
        app_booking_received, email_booking_received, app_point_assigned, email_point_assigned,
        app_material_deposited, email_material_deposited, app_material_recovered, email_material_recovered,
        app_rating_received, email_rating_received, app_booking_cancelled, email_booking_cancelled,
        app_booking_expired, email_booking_expired, app_deposit_reminder, email_deposit_reminder,
        app_conseil_moderation, email_conseil_moderation, app_new_conseil, email_new_conseil,
        app_conseil_engagement, app_project_engagement, app_admin_new_conseil, email_admin_new_conseil,
        COALESCE(app_service_completed, true), COALESCE(email_service_completed, true),
        COALESCE(app_booking_confirmed, true), COALESCE(email_booking_confirmed, true),
        COALESCE(app_booking_request_received, true), COALESCE(email_booking_request_received, true),
        COALESCE(app_prestation_booking_cancelled, true), COALESCE(email_prestation_booking_cancelled, true),
        COALESCE(app_service_reminder, true), COALESCE(email_service_reminder, true),
        COALESCE(app_event_registration, true), COALESCE(email_event_registration, true),
        COALESCE(app_event_cancellation, true), COALESCE(email_event_cancellation, true),
        COALESCE(app_event_reminder, true), COALESCE(email_event_reminder, true),
        COALESCE(app_event_moderation, true), COALESCE(email_event_moderation, true),
        COALESCE(app_forum_new_reply, true), COALESCE(email_forum_new_reply, true),
        COALESCE(app_forum_mention, true), COALESCE(email_forum_mention, true),
        COALESCE(app_forum_moderation, true), COALESCE(email_forum_moderation, true),
        COALESCE(app_admin_forum_report, true), COALESCE(email_admin_forum_report, true),
        COALESCE(app_finance_payment_confirmed, true), COALESCE(email_finance_payment_confirmed, true),
        COALESCE(app_finance_payment_received, true), COALESCE(email_finance_payment_received, true),
        COALESCE(app_finance_payment_failed, true), COALESCE(email_finance_payment_failed, true),
		COALESCE(app_finance_refund_issued, true), COALESCE(email_finance_refund_issued, true),
		COALESCE(app_finance_subscription_active, true), COALESCE(email_finance_subscription_active, true),
		COALESCE(app_material_alerts, true),
        display_mode, language, map_type, show_phone_publicly, show_email_publicly
        FROM user_notification_settings WHERE user_id = $1`, userID)
    err := row.Scan(&s.UserID, &s.AppEnabled, &s.EmailEnabled, &s.AppModeration, &s.EmailModeration,
        &s.AppBookingReceived, &s.EmailBookingReceived, &s.AppPointAssigned, &s.EmailPointAssigned,
        &s.AppMaterialDeposited, &s.EmailMaterialDeposited, &s.AppMaterialRecovered, &s.EmailMaterialRecovered,
        &s.AppRatingReceived, &s.EmailRatingReceived, &s.AppBookingCancelled, &s.EmailBookingCancelled,
        &s.AppBookingExpired, &s.EmailBookingExpired, &s.AppDepositReminder, &s.EmailDepositReminder,
        &s.AppConseilModeration, &s.EmailConseilModeration, &s.AppNewConseil, &s.EmailNewConseil,
        &s.AppConseilEngagement, &s.AppProjectEngagement, &s.AppAdminNewConseil, &s.EmailAdminNewConseil,
        &s.AppServiceCompleted, &s.EmailServiceCompleted,
        &s.AppBookingConfirmed, &s.EmailBookingConfirmed,
        &s.AppBookingRequestReceived, &s.EmailBookingRequestReceived,
        &s.AppPrestationBookingCancelled, &s.EmailPrestationBookingCancelled,
        &s.AppServiceReminder, &s.EmailServiceReminder,
        &s.AppEventRegistration, &s.EmailEventRegistration,
        &s.AppEventCancellation, &s.EmailEventCancellation,
        &s.AppEventReminder, &s.EmailEventReminder,
        &s.AppEventModeration, &s.EmailEventModeration,
        &s.AppForumNewReply, &s.EmailForumNewReply,
        &s.AppForumMention, &s.EmailForumMention,
        &s.AppForumModeration, &s.EmailForumModeration,
        &s.AppAdminForumReport, &s.EmailAdminForumReport,
        &s.AppFinancePaymentConfirmed, &s.EmailFinancePaymentConfirmed,
        &s.AppFinancePaymentReceived, &s.EmailFinancePaymentReceived,
        &s.AppFinancePaymentFailed, &s.EmailFinancePaymentFailed,
		&s.AppFinanceRefundIssued, &s.EmailFinanceRefundIssued,
		&s.AppFinanceSubscriptionActive, &s.EmailFinanceSubscriptionActive,
		&s.AppMaterialAlerts,
        &s.DisplayMode, &s.Language, &s.MapType, &s.ShowPhonePublicly, &s.ShowEmailPublicly)
    if err != nil {
        if err == sql.ErrNoRows {
            return NotificationSettings{
                UserID: userID, AppEnabled: true, EmailEnabled: true, DisplayMode: "light", Language: "fr", MapType: "plan",
                AppConseilModeration: true, EmailConseilModeration: true, AppNewConseil: true, EmailNewConseil: true,
                AppConseilEngagement: true, AppProjectEngagement: true, AppAdminNewConseil: true, EmailAdminNewConseil: true,
                AppServiceCompleted: true, EmailServiceCompleted: true,
                AppBookingConfirmed: true, EmailBookingConfirmed: true,
                AppBookingRequestReceived: true, EmailBookingRequestReceived: true,
                AppPrestationBookingCancelled: true, EmailPrestationBookingCancelled: true,
                AppServiceReminder: true, EmailServiceReminder: true,
                AppEventRegistration: true, EmailEventRegistration: true,
                AppEventCancellation: true, EmailEventCancellation: true,
                AppEventReminder: true, EmailEventReminder: true,
                AppEventModeration: true, EmailEventModeration: true,
                AppForumNewReply: true, EmailForumNewReply: true,
                AppForumMention: true, EmailForumMention: true,
                AppForumModeration: true, EmailForumModeration: true,
                AppAdminForumReport: true, EmailAdminForumReport: true,
                AppFinancePaymentConfirmed: true, EmailFinancePaymentConfirmed: true,
                AppFinancePaymentReceived: true, EmailFinancePaymentReceived: true,
                AppFinancePaymentFailed: true, EmailFinancePaymentFailed: true,
                AppFinanceRefundIssued: true, EmailFinanceRefundIssued: true,
				AppFinanceSubscriptionActive: true, EmailFinanceSubscriptionActive: true,
				AppMaterialAlerts: true,
            }, nil
        }
        return NotificationSettings{}, err
    }
    return s, nil
}

// UpsertUserNotificationSettings inserts or updates a user's notification settings.
func (r *Repository) UpsertUserNotificationSettings(s NotificationSettings) error {
    _, err := r.db.Exec(`INSERT INTO user_notification_settings (
        user_id, app_enabled, email_enabled, app_moderation, email_moderation,
        app_booking_received, email_booking_received, app_point_assigned, email_point_assigned,
        app_material_deposited, email_material_deposited, app_material_recovered, email_material_recovered,
        app_rating_received, email_rating_received, app_booking_cancelled, email_booking_cancelled,
        app_booking_expired, email_booking_expired, app_deposit_reminder, email_deposit_reminder,
        app_conseil_moderation, email_conseil_moderation, app_new_conseil, email_new_conseil,
        app_conseil_engagement, app_project_engagement, app_admin_new_conseil, email_admin_new_conseil,
        app_service_completed, email_service_completed,
        app_booking_confirmed, email_booking_confirmed,
        app_booking_request_received, email_booking_request_received,
        app_prestation_booking_cancelled, email_prestation_booking_cancelled,
        app_service_reminder, email_service_reminder,
        app_event_registration, email_event_registration,
        app_event_cancellation, email_event_cancellation,
        app_event_reminder, email_event_reminder,
        app_event_moderation, email_event_moderation,
        app_forum_new_reply, email_forum_new_reply,
        app_forum_mention, email_forum_mention,
        app_forum_moderation, email_forum_moderation,
        app_admin_forum_report, email_admin_forum_report,
        app_finance_payment_confirmed, email_finance_payment_confirmed,
        app_finance_payment_received, email_finance_payment_received,
        app_finance_payment_failed, email_finance_payment_failed,
        app_finance_refund_issued, email_finance_refund_issued,
        app_finance_subscription_active, email_finance_subscription_active,
		app_material_alerts,
        display_mode, language, map_type, show_phone_publicly, show_email_publicly
    ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,$57,$58,$59,$60,
		$61,$62,$63,$64,$65,$66,$67,$68,$69,$70,$71
    ) ON CONFLICT (user_id) DO UPDATE SET
        app_enabled = EXCLUDED.app_enabled,
        email_enabled = EXCLUDED.email_enabled,
        app_moderation = EXCLUDED.app_moderation,
        email_moderation = EXCLUDED.email_moderation,
        app_booking_received = EXCLUDED.app_booking_received,
        email_booking_received = EXCLUDED.email_booking_received,
        app_point_assigned = EXCLUDED.app_point_assigned,
        email_point_assigned = EXCLUDED.email_point_assigned,
        app_material_deposited = EXCLUDED.app_material_deposited,
        email_material_deposited = EXCLUDED.email_material_deposited,
        app_material_recovered = EXCLUDED.app_material_recovered,
        email_material_recovered = EXCLUDED.email_material_recovered,
        app_rating_received = EXCLUDED.app_rating_received,
        email_rating_received = EXCLUDED.email_rating_received,
        app_booking_cancelled = EXCLUDED.app_booking_cancelled,
        email_booking_cancelled = EXCLUDED.email_booking_cancelled,
        app_booking_expired = EXCLUDED.app_booking_expired,
        email_booking_expired = EXCLUDED.email_booking_expired,
        app_deposit_reminder = EXCLUDED.app_deposit_reminder,
        email_deposit_reminder = EXCLUDED.email_deposit_reminder,
        app_conseil_moderation = EXCLUDED.app_conseil_moderation,
        email_conseil_moderation = EXCLUDED.email_conseil_moderation,
        app_new_conseil = EXCLUDED.app_new_conseil,
        email_new_conseil = EXCLUDED.email_new_conseil,
        app_conseil_engagement = EXCLUDED.app_conseil_engagement,
        app_project_engagement = EXCLUDED.app_project_engagement,
        app_admin_new_conseil = EXCLUDED.app_admin_new_conseil,
        email_admin_new_conseil = EXCLUDED.email_admin_new_conseil,
        app_service_completed = EXCLUDED.app_service_completed,
        email_service_completed = EXCLUDED.email_service_completed,
        app_booking_confirmed = EXCLUDED.app_booking_confirmed,
        email_booking_confirmed = EXCLUDED.email_booking_confirmed,
        app_booking_request_received = EXCLUDED.app_booking_request_received,
        email_booking_request_received = EXCLUDED.email_booking_request_received,
        app_prestation_booking_cancelled = EXCLUDED.app_prestation_booking_cancelled,
        email_prestation_booking_cancelled = EXCLUDED.email_prestation_booking_cancelled,
        app_service_reminder = EXCLUDED.app_service_reminder,
        email_service_reminder = EXCLUDED.email_service_reminder,
        app_event_registration = EXCLUDED.app_event_registration,
        email_event_registration = EXCLUDED.email_event_registration,
        app_event_cancellation = EXCLUDED.app_event_cancellation,
        email_event_cancellation = EXCLUDED.email_event_cancellation,
        app_event_reminder = EXCLUDED.app_event_reminder,
        email_event_reminder = EXCLUDED.email_event_reminder,
        app_event_moderation = EXCLUDED.app_event_moderation,
        email_event_moderation = EXCLUDED.email_event_moderation,
        app_forum_new_reply = EXCLUDED.app_forum_new_reply,
        email_forum_new_reply = EXCLUDED.email_forum_new_reply,
        app_forum_mention = EXCLUDED.app_forum_mention,
        email_forum_mention = EXCLUDED.email_forum_mention,
        app_forum_moderation = EXCLUDED.app_forum_moderation,
        email_forum_moderation = EXCLUDED.email_forum_moderation,
        app_admin_forum_report = EXCLUDED.app_admin_forum_report,
        email_admin_forum_report = EXCLUDED.email_admin_forum_report,
        app_finance_payment_confirmed = EXCLUDED.app_finance_payment_confirmed,
        email_finance_payment_confirmed = EXCLUDED.email_finance_payment_confirmed,
        app_finance_payment_received = EXCLUDED.app_finance_payment_received,
        email_finance_payment_received = EXCLUDED.email_finance_payment_received,
        app_finance_payment_failed = EXCLUDED.app_finance_payment_failed,
        email_finance_payment_failed = EXCLUDED.email_finance_payment_failed,
        app_finance_refund_issued = EXCLUDED.app_finance_refund_issued,
        email_finance_refund_issued = EXCLUDED.email_finance_refund_issued,
        app_finance_subscription_active = EXCLUDED.app_finance_subscription_active,
        email_finance_subscription_active = EXCLUDED.email_finance_subscription_active,
		app_material_alerts = EXCLUDED.app_material_alerts,
        display_mode = EXCLUDED.display_mode,
        language = EXCLUDED.language,
        map_type = EXCLUDED.map_type,
        show_phone_publicly = EXCLUDED.show_phone_publicly,
        show_email_publicly = EXCLUDED.show_email_publicly
    `,
        s.UserID, s.AppEnabled, s.EmailEnabled, s.AppModeration, s.EmailModeration,
        s.AppBookingReceived, s.EmailBookingReceived, s.AppPointAssigned, s.EmailPointAssigned,
        s.AppMaterialDeposited, s.EmailMaterialDeposited, s.AppMaterialRecovered, s.EmailMaterialRecovered,
        s.AppRatingReceived, s.EmailRatingReceived, s.AppBookingCancelled, s.EmailBookingCancelled,
        s.AppBookingExpired, s.EmailBookingExpired, s.AppDepositReminder, s.EmailDepositReminder,
        s.AppConseilModeration, s.EmailConseilModeration, s.AppNewConseil, s.EmailNewConseil,
        s.AppConseilEngagement, s.AppProjectEngagement, s.AppAdminNewConseil, s.EmailAdminNewConseil,
        s.AppServiceCompleted, s.EmailServiceCompleted,
        s.AppBookingConfirmed, s.EmailBookingConfirmed,
        s.AppBookingRequestReceived, s.EmailBookingRequestReceived,
        s.AppPrestationBookingCancelled, s.EmailPrestationBookingCancelled,
        s.AppServiceReminder, s.EmailServiceReminder,
        s.AppEventRegistration, s.EmailEventRegistration,
        s.AppEventCancellation, s.EmailEventCancellation,
        s.AppEventReminder, s.EmailEventReminder,
        s.AppEventModeration, s.EmailEventModeration,
        s.AppForumNewReply, s.EmailForumNewReply,
        s.AppForumMention, s.EmailForumMention,
        s.AppForumModeration, s.EmailForumModeration,
        s.AppAdminForumReport, s.EmailAdminForumReport,
        s.AppFinancePaymentConfirmed, s.EmailFinancePaymentConfirmed,
        s.AppFinancePaymentReceived, s.EmailFinancePaymentReceived,
        s.AppFinancePaymentFailed, s.EmailFinancePaymentFailed,
        s.AppFinanceRefundIssued, s.EmailFinanceRefundIssued,
        s.AppFinanceSubscriptionActive, s.EmailFinanceSubscriptionActive,
		s.AppMaterialAlerts,
        s.DisplayMode, s.Language, s.MapType, s.ShowPhonePublicly, s.ShowEmailPublicly)
    return err
}
