package items

import (
	"context"
	"database/sql"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"
)

// ── Workflow statuses ────────────────────────────────────────────────────────

const (
	WFValidated        = "validated"
	WFAssigned         = "assigned"
	WFDepositCodeSent  = "deposit_code_sent"
	WFDeposited        = "deposited"
	WFAvailable        = "available"
	WFReserved         = "reserved"
	WFCollected        = "collected"
	WFClosed           = "closed"
	WFDepositExpired   = "deposit_expired"
	WFCancelled        = "cancelled"
	WFNeverCollected   = "never_collected"
)

const (
	DepositCodeTTL      = 72 * time.Hour
	PickupCodeTTL       = 48 * time.Hour
	ReservationTTL      = 48 * time.Hour
)

// ── Model ────────────────────────────────────────────────────────────────────

type ItemLogistics struct {
	ID                   int64      `json:"id"`
	ItemID               int64      `json:"item_id"`
	WorkflowStatus       string     `json:"workflow_status"`

	// Assignment
	DepositPointID       *int64     `json:"deposit_point_id,omitempty"`
	ContainerID          *int64     `json:"container_id,omitempty"`
	AssignedAt           *time.Time `json:"assigned_at,omitempty"`
	AssignedBy           *int64     `json:"assigned_by,omitempty"`

	// Deposit code
	DepositCode          string     `json:"deposit_code,omitempty"`
	DepositCodeExpiresAt *time.Time `json:"deposit_code_expires_at,omitempty"`
	DepositCodeSentAt    *time.Time `json:"deposit_code_sent_at,omitempty"`

	// Deposit confirmation
	DepositedAt          *time.Time `json:"deposited_at,omitempty"`
	DepositedConfirmedBy *int64     `json:"deposited_confirmed_by,omitempty"`

	// Reservation
	ReservedByName       string     `json:"reserved_by_name,omitempty"`
	ReservedAt           *time.Time `json:"reserved_at,omitempty"`
	ReservationExpiresAt *time.Time `json:"reservation_expires_at,omitempty"`

	// Pickup code
	PickupCode           string     `json:"pickup_code,omitempty"`
	PickupCodeExpiresAt  *time.Time `json:"pickup_code_expires_at,omitempty"`

	// Collection
	CollectedAt          *time.Time `json:"collected_at,omitempty"`
	CollectedConfirmedBy *int64     `json:"collected_confirmed_by,omitempty"`

	// Closure
	ClosedAt             *time.Time `json:"closed_at,omitempty"`

	// Cancellation
	CancelledAt          *time.Time `json:"cancelled_at,omitempty"`
	CancelReason         string     `json:"cancel_reason,omitempty"`

	// Timestamps
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`

	// Joined fields for frontend display
	ItemTitle            string     `json:"item_title,omitempty"`
	ItemImage            string     `json:"item_image,omitempty"`
	ItemCity             string     `json:"item_city,omitempty"`
	ItemCategory         string     `json:"item_category,omitempty"`
	OwnerName            string     `json:"owner_name,omitempty"`
	DepositPointName     string     `json:"deposit_point_name,omitempty"`
	ContainerName        string     `json:"container_name,omitempty"`
}

// ── Schema ───────────────────────────────────────────────────────────────────

func (r *Repository) EnsureLogisticsSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS item_logistics (
			id                       BIGSERIAL PRIMARY KEY,
			item_id                  BIGINT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
			workflow_status          TEXT NOT NULL DEFAULT 'validated',
			deposit_point_id         BIGINT REFERENCES deposit_points(id),
			container_id             BIGINT REFERENCES containers(id),
			assigned_at              TIMESTAMPTZ,
			assigned_by              BIGINT REFERENCES users(id),
			deposit_code             TEXT NOT NULL DEFAULT '',
			deposit_code_expires_at  TIMESTAMPTZ,
			deposit_code_sent_at     TIMESTAMPTZ,
			deposited_at             TIMESTAMPTZ,
			deposited_confirmed_by   BIGINT REFERENCES users(id),
			reserved_by_name         TEXT NOT NULL DEFAULT '',
			reserved_at              TIMESTAMPTZ,
			reservation_expires_at   TIMESTAMPTZ,
			pickup_code              TEXT NOT NULL DEFAULT '',
			pickup_code_expires_at   TIMESTAMPTZ,
			collected_at             TIMESTAMPTZ,
			collected_confirmed_by   BIGINT REFERENCES users(id),
			closed_at                TIMESTAMPTZ,
			cancelled_at             TIMESTAMPTZ,
			cancel_reason            TEXT NOT NULL DEFAULT '',
			created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_item    ON item_logistics(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_status  ON item_logistics(workflow_status)`,
	}
	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return fmt.Errorf("logistics schema: %w", err)
		}
	}
	return nil
}

// ── Code generation ──────────────────────────────────────────────────────────

func generateCode(config CodeConfig) string {
	charset := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	if !config.NoAmbiguous {
		charset += "01OI"
	}
	specialCharset := "!@#$%^"
	if config.UseSpecial {
		charset += specialCharset
	}

	b := make([]byte, config.Length)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	
	// Guarantee at least one special character if requested
	if config.UseSpecial {
		hasSpecial := false
		for i := range b {
			if strings.ContainsRune(specialCharset, rune(b[i])) {
				hasSpecial = true
				break
			}
		}
		if !hasSpecial {
			idx, _ := rand.Int(rand.Reader, big.NewInt(int64(config.Length)))
			sIdx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(specialCharset))))
			b[idx.Int64()] = specialCharset[sIdx.Int64()]
		}
	}

	res := string(b)
	if config.UseSpaces && len(res) > 3 {
		var spaced []rune
		for i, r := range res {
			if i > 0 && i%3 == 0 {
				spaced = append(spaced, ' ')
			}
			spaced = append(spaced, r)
		}
		res = string(spaced)
	}

	return res
}

// ── Business Days & Holidays ─────────────────────────────────────────────────

// Calculate Easter Sunday for a given year using Meeus/Jones/Butcher algorithm
func easterDay(year int) time.Time {
	a := year % 19
	b := year / 100
	c := year % 100
	d := b / 4
	e := b % 4
	f := (b + 8) / 25
	g := (b - f + 1) / 3
	h := (19*a + b - d - g + 15) % 30
	i := c / 4
	k := c % 4
	l := (32 + 2*e + 2*i - h - k) % 7
	m := (a + 11*h + 22*l) / 451
	month := (h + l - 7*m + 114) / 31
	day := ((h + l - 7*m + 114) % 31) + 1
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

// Check if a date is a French public holiday
func isFrenchHoliday(date time.Time) bool {
	d := date.Day()
	m := date.Month()

	// Fixed holidays
	if m == time.January && d == 1 { return true }   // Jour de l'An
	if m == time.May && d == 1 { return true }       // Fête du Travail
	if m == time.May && d == 8 { return true }       // Victoire 1945
	if m == time.July && d == 14 { return true }     // Fête Nationale
	if m == time.August && d == 15 { return true }   // Assomption
	if m == time.November && d == 1 { return true }  // Toussaint
	if m == time.November && d == 11 { return true } // Armistice 1918
	if m == time.December && d == 25 { return true } // Noël

	// Variable holidays (Easter based)
	y := date.Year()
	easter := easterDay(y)

	// Lundi de Pâques (+1 jour)
	easterMonday := easter.AddDate(0, 0, 1)
	if m == easterMonday.Month() && d == easterMonday.Day() { return true }

	// Jeudi de l'Ascension (+39 jours)
	ascension := easter.AddDate(0, 0, 39)
	if m == ascension.Month() && d == ascension.Day() { return true }

	// Lundi de Pentecôte (+50 jours)
	whitMonday := easter.AddDate(0, 0, 50)
	if m == whitMonday.Month() && d == whitMonday.Day() { return true }

	return false
}

// Add specifically business days (excluding weekends and French holidays)
func addFrenchBusinessDays(date time.Time, days int) time.Time {
	for i := 0; i < days; {
		date = date.AddDate(0, 0, 1)

		weekday := date.Weekday()
		// Skip weekend
		if weekday == time.Saturday || weekday == time.Sunday {
			continue
		}

		// Skip French holidays
		if isFrenchHoliday(date) {
			continue
		}

		i++
	}
	return date
}

// ── Repository methods ───────────────────────────────────────────────────────

func (r *Repository) CreateLogistics(ctx context.Context, itemID int64) (*ItemLogistics, error) {
	var l ItemLogistics
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO item_logistics (item_id, workflow_status)
		 VALUES ($1, 'validated')
		 ON CONFLICT (item_id) DO UPDATE SET workflow_status = 'validated', updated_at = NOW()
		 RETURNING id, item_id, workflow_status, created_at, updated_at`,
		itemID,
	).Scan(&l.ID, &l.ItemID, &l.WorkflowStatus, &l.CreatedAt, &l.UpdatedAt)
	return &l, err
}

func (r *Repository) GetLogisticsByItemID(ctx context.Context, itemID int64) (*ItemLogistics, error) {
	var l ItemLogistics
	err := r.db.QueryRowContext(ctx,
		`SELECT l.id, l.item_id, l.workflow_status,
				l.deposit_point_id, l.container_id, l.assigned_at, l.assigned_by,
				l.deposit_code, l.deposit_code_expires_at, l.deposit_code_sent_at,
				l.deposited_at, l.deposited_confirmed_by,
				l.reserved_by_name, l.reserved_at, l.reservation_expires_at,
				l.pickup_code, l.pickup_code_expires_at,
				l.collected_at, l.collected_confirmed_by,
				l.closed_at,
				l.cancelled_at, l.cancel_reason,
				l.created_at, l.updated_at,
				i.title, i.image, i.city, i.category,
				(u.firstname || ' ' || u.lastname),
				COALESCE(dp.name, ''),
				COALESCE(ct.name, '')
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 JOIN users u ON u.id = i.user_id
		 LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		 LEFT JOIN containers ct ON ct.id = l.container_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(
		&l.ID, &l.ItemID, &l.WorkflowStatus,
		&l.DepositPointID, &l.ContainerID, &l.AssignedAt, &l.AssignedBy,
		&l.DepositCode, &l.DepositCodeExpiresAt, &l.DepositCodeSentAt,
		&l.DepositedAt, &l.DepositedConfirmedBy,
		&l.ReservedByName, &l.ReservedAt, &l.ReservationExpiresAt,
		&l.PickupCode, &l.PickupCodeExpiresAt,
		&l.CollectedAt, &l.CollectedConfirmedBy,
		&l.ClosedAt,
		&l.CancelledAt, &l.CancelReason,
		&l.CreatedAt, &l.UpdatedAt,
		&l.ItemTitle, &l.ItemImage, &l.ItemCity, &l.ItemCategory,
		&l.OwnerName, &l.DepositPointName, &l.ContainerName,
	)
	if err != nil {
		return nil, err
	}

	// Auto-detect expired states
	now := time.Now()
	if l.WorkflowStatus == WFDepositCodeSent && l.DepositCodeExpiresAt != nil && now.After(*l.DepositCodeExpiresAt) {
		l.WorkflowStatus = WFDepositExpired
		r.db.ExecContext(ctx, `UPDATE item_logistics SET workflow_status = 'deposit_expired', updated_at = NOW() WHERE id = $1`, l.ID)
	}
	if l.WorkflowStatus == WFReserved && l.ReservationExpiresAt != nil && now.After(*l.ReservationExpiresAt) {
		l.WorkflowStatus = WFAvailable
		l.ReservedByName = ""
		l.ReservedAt = nil
		l.ReservationExpiresAt = nil
		l.PickupCode = ""
		l.PickupCodeExpiresAt = nil
		r.db.ExecContext(ctx, `UPDATE item_logistics SET workflow_status = 'available', reserved_by_name = '', reserved_at = NULL, reservation_expires_at = NULL, pickup_code = '', pickup_code_expires_at = NULL, updated_at = NOW() WHERE id = $1`, l.ID)
	}

	return &l, nil
}

func (r *Repository) ListLogistics(ctx context.Context, statusFilter string) ([]ItemLogistics, error) {
	query := `
		SELECT l.id, l.item_id, l.workflow_status,
				l.deposit_point_id, l.container_id, l.assigned_at, l.assigned_by,
				l.deposit_code, l.deposit_code_expires_at, l.deposit_code_sent_at,
				l.deposited_at, l.deposited_confirmed_by,
				l.reserved_by_name, l.reserved_at, l.reservation_expires_at,
				l.pickup_code, l.pickup_code_expires_at,
				l.collected_at, l.collected_confirmed_by,
				l.closed_at,
				l.cancelled_at, l.cancel_reason,
				l.created_at, l.updated_at,
				i.title, i.image, i.city, i.category,
				(u.firstname || ' ' || u.lastname),
				COALESCE(dp.name, ''),
				COALESCE(ct.name, '')
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 JOIN users u ON u.id = i.user_id
		 LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		 LEFT JOIN containers ct ON ct.id = l.container_id
		 WHERE ($1 = '' OR l.workflow_status = $1)
		 ORDER BY l.updated_at DESC`

	rows, err := r.db.QueryContext(ctx, query, statusFilter)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ItemLogistics
	for rows.Next() {
		var l ItemLogistics
		if err := rows.Scan(
			&l.ID, &l.ItemID, &l.WorkflowStatus,
			&l.DepositPointID, &l.ContainerID, &l.AssignedAt, &l.AssignedBy,
			&l.DepositCode, &l.DepositCodeExpiresAt, &l.DepositCodeSentAt,
			&l.DepositedAt, &l.DepositedConfirmedBy,
			&l.ReservedByName, &l.ReservedAt, &l.ReservationExpiresAt,
			&l.PickupCode, &l.PickupCodeExpiresAt,
			&l.CollectedAt, &l.CollectedConfirmedBy,
			&l.ClosedAt,
			&l.CancelledAt, &l.CancelReason,
			&l.CreatedAt, &l.UpdatedAt,
			&l.ItemTitle, &l.ItemImage, &l.ItemCity, &l.ItemCategory,
			&l.OwnerName, &l.DepositPointName, &l.ContainerName,
		); err != nil {
			return nil, err
		}

		// Auto-detect expired states on list too
		now := time.Now()
		if l.WorkflowStatus == WFDepositCodeSent && l.DepositCodeExpiresAt != nil && now.After(*l.DepositCodeExpiresAt) {
			l.WorkflowStatus = WFDepositExpired
		}
		if l.WorkflowStatus == WFReserved && l.ReservationExpiresAt != nil && now.After(*l.ReservationExpiresAt) {
			l.WorkflowStatus = WFAvailable
		}

		results = append(results, l)
	}
	return results, nil
}

// ── Transition: Assign deposit point + container ─────────────────────────────

type AssignPayload struct {
	DepositPointID int64 `json:"deposit_point_id"`
	ContainerID    int64 `json:"container_id"`
}

func (r *Repository) AssignLogistics(ctx context.Context, itemID int64, p AssignPayload, adminID int64) error {
	// Validate current status
	var status string
	err := r.db.QueryRowContext(ctx, `SELECT workflow_status FROM item_logistics WHERE item_id = $1`, itemID).Scan(&status)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFValidated && status != WFAssigned && status != WFDepositExpired {
		return fmt.Errorf("cannot assign from status %q", status)
	}

	// Validate container has capacity
	var capacity, currentCount int
	var containerStatus string
	var maintenanceStart, maintenanceEnd sql.NullTime
	err = r.db.QueryRowContext(ctx, `SELECT capacity, current_count, status, maintenance_start, maintenance_end FROM containers WHERE id = $1 AND deposit_point_id = $2`, p.ContainerID, p.DepositPointID).Scan(&capacity, &currentCount, &containerStatus, &maintenanceStart, &maintenanceEnd)
	if err != nil {
		return fmt.Errorf("container not found: %w", err)
	}
	if containerStatus == "inactif" {
		return fmt.Errorf("container is inactive")
	}
	if containerStatus == "maintenance" {
		if !maintenanceStart.Valid || !maintenanceEnd.Valid {
			return fmt.Errorf("container maintenance schedule is invalid")
		}
		now := time.Now()
		if !now.Before(maintenanceStart.Time) && !now.After(maintenanceEnd.Time) {
			return fmt.Errorf("container is in maintenance window")
		}
	}
	if containerStatus != "actif" && containerStatus != "maintenance" && containerStatus != "inactif" {
		return fmt.Errorf("container is not assignable (status: %s)", containerStatus)
	}
	if currentCount >= capacity {
		return fmt.Errorf("container is full (%d/%d)", currentCount, capacity)
	}

	now := time.Now()
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'assigned',
			deposit_point_id = $1, container_id = $2,
			assigned_at = $3, assigned_by = $4,
			updated_at = $3
		 WHERE item_id = $5`,
		p.DepositPointID, p.ContainerID, now, adminID, itemID,
	)
	return err
}

// ── Transition: Generate deposit code ────────────────────────────────────────

func (r *Repository) GenerateDepositCode(ctx context.Context, itemID int64) (string, error) {
	var status string
	err := r.db.QueryRowContext(ctx, `SELECT workflow_status FROM item_logistics WHERE item_id = $1`, itemID).Scan(&status)
	if err != nil {
		return "", fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFAssigned && status != WFDepositExpired {
		return "", fmt.Errorf("cannot generate code from status %q", status)
	}

	config, _ := r.GetCodeConfig(ctx)
	if config.Length < 4 { config.Length = 6 }
	code := generateCode(config)
	now := time.Now()
	expires := addFrenchBusinessDays(now, 3)

	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'deposit_code_sent',
			deposit_code = $1, deposit_code_expires_at = $2, deposit_code_sent_at = $3,
			updated_at = $3
		 WHERE item_id = $4`,
		code, expires, now, itemID,
	)
	return code, err
}

// ── Transition: Confirm deposit ──────────────────────────────────────────────

func (r *Repository) ConfirmDeposit(ctx context.Context, itemID int64, adminID int64) error {
	var status string

	err := r.db.QueryRowContext(ctx,
		`SELECT workflow_status FROM item_logistics WHERE item_id = $1`,
		itemID,
	).Scan(&status)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFDepositCodeSent {
		return fmt.Errorf("cannot confirm deposit from status %q", status)
	}

	now := time.Now()

	// Update logistics
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'deposited',
			deposited_at = $1, deposited_confirmed_by = $2, updated_at = $1
		 WHERE item_id = $3`,
		now, adminID, itemID,
	)
	if err != nil {
		return err
	}

	// Increment container count
	var containerID *int64
	r.db.QueryRowContext(ctx, `SELECT container_id FROM item_logistics WHERE item_id = $1`, itemID).Scan(&containerID)
	if containerID != nil {
		r.db.ExecContext(ctx, `UPDATE containers SET current_count = current_count + 1 WHERE id = $1`, *containerID)
		r.UpdateContainerCounts(ctx, *containerID)
	}

	return nil
}

// ── Transition: Make available ───────────────────────────────────────────────

func (r *Repository) MakeAvailable(ctx context.Context, itemID int64) error {
	var status string
	err := r.db.QueryRowContext(ctx, `SELECT workflow_status FROM item_logistics WHERE item_id = $1`, itemID).Scan(&status)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFDeposited {
		return fmt.Errorf("cannot make available from status %q", status)
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET workflow_status = 'available', updated_at = NOW() WHERE item_id = $1`,
		itemID,
	)
	return err
}

// ── Transition: Reserve ──────────────────────────────────────────────────────

type ReservePayload struct {
	ReservedByName string `json:"reserved_by_name"`
}

func (r *Repository) ReserveItem(ctx context.Context, itemID int64, p ReservePayload) (string, error) {
	var status string
	err := r.db.QueryRowContext(ctx, `SELECT workflow_status FROM item_logistics WHERE item_id = $1`, itemID).Scan(&status)
	if err != nil {
		return "", fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFAvailable {
		return "", fmt.Errorf("cannot reserve from status %q", status)
	}

	config, _ := r.GetCodeConfig(ctx)
	if config.Length < 4 { config.Length = 8 }
	pickupCode := generateCode(config)
	now := time.Now()
	reservationExpires := now.Add(ReservationTTL)
	pickupExpires := now.Add(PickupCodeTTL)

	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'reserved',
			reserved_by_name = $1, reserved_at = $2, reservation_expires_at = $3,
			pickup_code = $4, pickup_code_expires_at = $5,
			updated_at = $2
		 WHERE item_id = $6`,
		p.ReservedByName, now, reservationExpires, pickupCode, pickupExpires, itemID,
	)
	return pickupCode, err
}

// ── Transition: Confirm pickup ───────────────────────────────────────────────

func (r *Repository) ConfirmPickup(ctx context.Context, itemID int64, code string, adminID int64) error {
	var storedCode string
	var expiresAt *time.Time
	var status string
	var containerID *int64

	err := r.db.QueryRowContext(ctx,
		`SELECT workflow_status, pickup_code, pickup_code_expires_at, container_id FROM item_logistics WHERE item_id = $1`,
		itemID,
	).Scan(&status, &storedCode, &expiresAt, &containerID)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFReserved {
		return fmt.Errorf("cannot confirm pickup from status %q", status)
	}
	if storedCode != code {
		return fmt.Errorf("invalid pickup code")
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return fmt.Errorf("pickup code has expired")
	}

	now := time.Now()
	closedAt := now

	// Move to collected + closed in one step for MVP
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'closed',
			collected_at = $1, collected_confirmed_by = $2,
			closed_at = $3, updated_at = $1
		 WHERE item_id = $4`,
		now, adminID, closedAt, itemID,
	)
	if err != nil {
		return err
	}

	// Decrement container count
	if containerID != nil {
		r.db.ExecContext(ctx, `UPDATE containers SET current_count = GREATEST(current_count - 1, 0) WHERE id = $1`, *containerID)
		r.UpdateContainerCounts(ctx, *containerID)
	}

	// Mark item as "vendue" (closed)
	r.db.ExecContext(ctx, `UPDATE items SET status = 'vendue', updated_at = NOW() WHERE id = $1`, itemID)

	return nil
}

// ── Transition: Cancel ───────────────────────────────────────────────────────

type CancelPayload struct {
	Reason         string `json:"reason"`
	RevertToStatus string `json:"revert_to_status"`
}

func (r *Repository) CancelLogistics(ctx context.Context, itemID int64, reason string, revertTo string) error {
	var status string
	var containerID *int64
	var wasDeposited bool

	err := r.db.QueryRowContext(ctx,
		`SELECT workflow_status, container_id, (deposited_at IS NOT NULL) FROM item_logistics WHERE item_id = $1`,
		itemID,
	).Scan(&status, &containerID, &wasDeposited)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}

	if status == WFClosed || status == WFCancelled {
		return fmt.Errorf("cannot cancel/revert from status %q", status)
	}

	if revertTo != "" {
		isPostDeposit := (status == WFDeposited || status == WFAvailable || status == WFReserved)
		targetIsPreDeposit := (revertTo == WFValidated || revertTo == WFAssigned || revertTo == WFDepositCodeSent || revertTo == WFDepositExpired)

		_, err = r.db.ExecContext(ctx, `UPDATE item_logistics SET workflow_status = $1, updated_at = NOW() WHERE item_id = $2`, revertTo, itemID)
		
		if isPostDeposit && targetIsPreDeposit && wasDeposited && containerID != nil {
			r.db.ExecContext(ctx, `UPDATE containers SET current_count = GREATEST(current_count - 1, 0) WHERE id = $1`, *containerID)
			r.db.ExecContext(ctx, `UPDATE item_logistics SET deposited_at = NULL, deposit_confirmed_by = NULL WHERE item_id = $1`, itemID)
			r.UpdateContainerCounts(ctx, *containerID)
		}
		return err
	}

	now := time.Now()
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'cancelled',
			cancelled_at = $1, cancel_reason = $2, updated_at = $1
		 WHERE item_id = $3`,
		now, reason, itemID,
	)
	if err != nil {
		return err
	}

	// If the item was physically deposited, decrement container count
	if wasDeposited && containerID != nil {
		r.db.ExecContext(ctx, `UPDATE containers SET current_count = GREATEST(current_count - 1, 0) WHERE id = $1`, *containerID)
		r.UpdateContainerCounts(ctx, *containerID)
	}

	return nil
}

// ResetLogisticsForModeration removes logistics state when a user edits an item
// so it leaves the logistics pipeline until it is validated again by moderation.
func (r *Repository) ResetLogisticsForModeration(ctx context.Context, itemID int64) error {
	var containerID *int64
	var wasDeposited bool

	err := r.db.QueryRowContext(ctx,
		`SELECT container_id, (deposited_at IS NOT NULL) FROM item_logistics WHERE item_id = $1`,
		itemID,
	).Scan(&containerID, &wasDeposited)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	if wasDeposited && containerID != nil {
		r.db.ExecContext(ctx, `UPDATE containers SET current_count = GREATEST(current_count - 1, 0) WHERE id = $1`, *containerID)
		r.UpdateContainerCounts(ctx, *containerID)
	}

	_, err = r.db.ExecContext(ctx, `DELETE FROM item_logistics WHERE item_id = $1`, itemID)
	return err
}

// ── Stats ────────────────────────────────────────────────────────────────────

type LogisticsStats struct {
	Validated      int `json:"validated"`
	Assigned       int `json:"assigned"`
	DepositCodeSent int `json:"deposit_code_sent"`
	Deposited      int `json:"deposited"`
	Available      int `json:"available"`
	Reserved       int `json:"reserved"`
	Collected      int `json:"collected"`
	Closed         int `json:"closed"`
	Cancelled      int `json:"cancelled"`
	Expired        int `json:"expired"`
	Total          int `json:"total"`
}

func (r *Repository) GetLogisticsStats(ctx context.Context) (*LogisticsStats, error) {
	var s LogisticsStats
	rows, err := r.db.QueryContext(ctx,
		`SELECT workflow_status, COUNT(*) FROM item_logistics GROUP BY workflow_status`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		s.Total += count
		switch status {
		case WFValidated:
			s.Validated = count
		case WFAssigned:
			s.Assigned = count
		case WFDepositCodeSent:
			s.DepositCodeSent = count
		case WFDeposited:
			s.Deposited = count
		case WFAvailable:
			s.Available = count
		case WFReserved:
			s.Reserved = count
		case WFCollected:
			s.Collected = count
		case WFClosed:
			s.Closed = count
		case WFCancelled:
			s.Cancelled = count
		case WFDepositExpired, WFNeverCollected:
			s.Expired = count
		}
	}
	return &s, nil
}
