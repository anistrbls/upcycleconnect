package items

import (
	"context"
	"database/sql"
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"strings"
	"time"

	"github.com/lib/pq"
)

// ── Workflow statuses ────────────────────────────────────────────────────────

const (
	WFValidated        = "validated"
	WFAssigned         = "assigned"
	WFDepositCodeSent  = "deposit_code_sent"
	WFDeposited        = "deposited"
	WFAvailable        = "available"
	WFPendingPayment   = "pending_payment"
	WFReserved         = "reserved"
	WFPickedUp         = "picked_up"
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
	ReservedByUserID     *int64     `json:"reserved_by_user_id,omitempty"`
	TransactionRef       string     `json:"transaction_ref,omitempty"`
	ReservedAt           *time.Time `json:"reserved_at,omitempty"`
	ReservationExpiresAt *time.Time `json:"reservation_expires_at,omitempty"`
	PaymentValidatedAt   *time.Time `json:"payment_validated_at,omitempty"`

	// Pickup code
	PickupCode           string     `json:"pickup_code,omitempty"`
	PickupCodeExpiresAt  *time.Time `json:"pickup_code_expires_at,omitempty"`

	// Collection
	CollectedAt          *time.Time `json:"collected_at,omitempty"`
	CollectedConfirmedBy *int64     `json:"collected_confirmed_by,omitempty"`

	// Closure
	PickedUpAt           *time.Time `json:"picked_up_at,omitempty"`

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
	ItemType             string     `json:"item_type,omitempty"`
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
			reserved_by_user_id      BIGINT REFERENCES users(id),
			reserved_at              TIMESTAMPTZ,
			reservation_expires_at   TIMESTAMPTZ,
			payment_validated_at     TIMESTAMPTZ,
			pickup_code              TEXT NOT NULL DEFAULT '',
			pickup_code_expires_at   TIMESTAMPTZ,
			collected_at             TIMESTAMPTZ,
			collected_confirmed_by   BIGINT REFERENCES users(id),
			picked_up_at             TIMESTAMPTZ,
			cancelled_at             TIMESTAMPTZ,
			cancel_reason            TEXT NOT NULL DEFAULT '',
			previous_workflow_status TEXT NOT NULL DEFAULT '',
			cancelled_by_user        BOOLEAN NOT NULL DEFAULT false,
			created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS reserved_by_user_id BIGINT REFERENCES users(id)`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS transaction_ref TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS payment_validated_at TIMESTAMPTZ`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_amount_cents BIGINT NOT NULL DEFAULT 0`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_platform_fee_cents BIGINT NOT NULL DEFAULT 0`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_currency TEXT NOT NULL DEFAULT 'eur'`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_last_error TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS stripe_paid_at TIMESTAMPTZ`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS previous_workflow_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS cancelled_by_user BOOLEAN NOT NULL DEFAULT false`,
		`CREATE TABLE IF NOT EXISTS stripe_webhook_events (
			event_id TEXT PRIMARY KEY,
			event_type TEXT NOT NULL,
			processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS professional_item_watchlist (
			user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			item_id    BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (user_id, item_id)
		)`,
		`UPDATE item_logistics SET workflow_status = 'picked_up' WHERE workflow_status = 'closed'`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_reserved_by_user ON item_logistics(reserved_by_user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_transaction_ref ON item_logistics(transaction_ref)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_item    ON item_logistics(item_id)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_status  ON item_logistics(workflow_status)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_stripe_payment_status ON item_logistics(stripe_payment_status)`,
		`CREATE INDEX IF NOT EXISTS idx_logistics_stripe_payment_intent ON item_logistics(stripe_payment_intent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_prof_watchlist_user ON professional_item_watchlist(user_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_prof_watchlist_item ON professional_item_watchlist(item_id)`,
		`CREATE TABLE IF NOT EXISTS sale_commission_config (
			id      INT PRIMARY KEY DEFAULT 1,
			percent NUMERIC(6,3) NOT NULL DEFAULT 0,
			CONSTRAINT sale_commission_percent_range CHECK (percent >= 0 AND percent <= 100)
		)`,
		`ALTER TABLE sale_commission_config ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'deducted'`,
		`ALTER TABLE item_logistics ADD COLUMN IF NOT EXISTS sale_commission_mode TEXT NOT NULL DEFAULT ''`,
		`INSERT INTO sale_commission_config (id, percent) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`,
		`CREATE TABLE IF NOT EXISTS pro_seller_ratings (
			id               BIGSERIAL PRIMARY KEY,
			item_id          BIGINT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
			pro_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			seller_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			stars            SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (item_id, pro_user_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_pro_seller_ratings_seller ON pro_seller_ratings(seller_user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_pro_seller_ratings_item ON pro_seller_ratings(item_id)`,
		`CREATE TABLE IF NOT EXISTS seller_pro_ratings (
			item_id          BIGINT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
			seller_user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			pro_user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			stars            SMALLINT NOT NULL CHECK (stars >= 1 AND stars <= 5),
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_seller_pro_ratings_pro ON seller_pro_ratings(pro_user_id)`,
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

func generateTransactionRef(now time.Time) string {
	charset := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return fmt.Sprintf("TX-%s-%s", now.Format("20060102"), string(b))
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

func (r *Repository) releaseExpiredReservations(ctx context.Context) {
	r.db.ExecContext(ctx,
		`UPDATE item_logistics
		 SET workflow_status = 'available',
		     reserved_by_name = '',
		     reserved_by_user_id = NULL,
		     transaction_ref = '',
		     reserved_at = NULL,
		     reservation_expires_at = NULL,
		     payment_validated_at = NULL,
		     pickup_code = '',
		     pickup_code_expires_at = NULL,
		     stripe_checkout_session_id = '',
		     stripe_payment_intent_id = '',
		     stripe_payment_status = '',
		     stripe_amount_cents = 0,
		     stripe_platform_fee_cents = 0,
		     sale_commission_mode = '',
		     stripe_last_error = '',
		     updated_at = NOW()
		 WHERE workflow_status IN ('reserved', 'pending_payment')
		   AND reservation_expires_at IS NOT NULL
		   AND reservation_expires_at < NOW()`)
}

// releaseExpiredDepositCodes aligne la BDD avec l’expiration des codes dépôt (comme GetLogisticsByItemID).
// Sans cela, la liste admin affiche « expiré » en mémoire mais les stats REST comptent encore « en attente dépôt ».
func (r *Repository) releaseExpiredDepositCodes(ctx context.Context) {
	r.db.ExecContext(ctx,
		`UPDATE item_logistics
		 SET workflow_status = 'deposit_expired', updated_at = NOW()
		 WHERE workflow_status = 'deposit_code_sent'
		   AND deposit_code_expires_at IS NOT NULL
		   AND deposit_code_expires_at < NOW()`)
}

type ProfessionalItem struct {
	ID                 int64   `json:"id"`
	Title              string  `json:"title"`
	Description        string  `json:"description"`
	Type               string  `json:"type"`
	Price              float64 `json:"price"`
	Category           string  `json:"category"`
	Condition          string  `json:"condition"`
	Material           string  `json:"material"`
	Quantity           string  `json:"quantity"`
	WeightValue        *float64 `json:"weightValue,omitempty"`
	WeightUnit         string  `json:"weightUnit,omitempty"`
	WeightGrams        *float64 `json:"weightGrams,omitempty"`
	City               string  `json:"city"`
	Country            string  `json:"country"`
	Image              string  `json:"image"`
	Photos             []string `json:"photos"`
	CreatedAt          time.Time `json:"createdAt"`
	WorkflowStatus     string  `json:"workflowStatus"`
	TransactionRef     string  `json:"transactionRef,omitempty"`
	DepositPointName   string  `json:"depositPointName"`
	DepositPointPhotos []string `json:"depositPointPhotos,omitempty"`
	DepositPointAddress string `json:"depositPointAddress,omitempty"`
	DepositPointZipCode string `json:"depositPointZipCode,omitempty"`
	DepositPointCity    string `json:"depositPointCity,omitempty"`
	DepositPointCountry string `json:"depositPointCountry,omitempty"`
	ContainerName      string  `json:"containerName"`
	AvailableAt        *time.Time `json:"availableAt,omitempty"`
	StripePaymentStatus string `json:"stripePaymentStatus,omitempty"`
	ReservedAt         *time.Time `json:"reservedAt,omitempty"`
	ReservationExpiresAt *time.Time `json:"reservation_expires_at,omitempty"`
	PickupCode           string     `json:"pickupCode,omitempty"`
	PickupCodeExpiresAt  *time.Time `json:"pickupCodeExpiresAt,omitempty"`
	PaymentValidatedAt   *time.Time `json:"paymentValidatedAt,omitempty"`
	DepositedAt          *time.Time `json:"depositedAt,omitempty"`
	CancelReason         string     `json:"cancelReason,omitempty"`
	// Affichage prix côté pro (checkout) : mode / taux globaux au moment de la requête.
	SaleCommissionMode    string  `json:"saleCommissionMode,omitempty"`
	SaleCommissionPercent float64 `json:"saleCommissionPercent,omitempty"`
	// Vendeur (particulier) et notes cumulées (notes laissées par les pros sur ce vendeur).
	SellerUserID         int64      `json:"sellerUserId"`
	SellerName           string     `json:"sellerName"`
	SellerRatingAvg      *float64   `json:"sellerRatingAvg,omitempty"`
	SellerRatingCount    int64      `json:"sellerRatingCount"`
	MySellerRating       *int       `json:"mySellerRating,omitempty"`
	SellerCity           string     `json:"sellerCity,omitempty"`
	SellerRegisteredAt   *time.Time `json:"sellerRegisteredAt,omitempty"`
	SellerItemsCount     int64      `json:"sellerItemsCount"`
}

func (r *Repository) ListProfessionalAvailableItems(ctx context.Context) ([]ProfessionalItem, error) {
	r.releaseExpiredReservations(ctx)

	rows, err := r.db.QueryContext(ctx,
		`SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material,
		        i.quantity, i.weight_value, i.weight_unit, i.weight_grams, i.city, i.country, i.image, i.photos,
		        i.created_at,
		        l.workflow_status,
		        COALESCE(dp.name, ''), COALESCE(dp.photos, '{}'),
		        COALESCE(dp.address, ''), COALESCE(dp.zip_code, ''), COALESCE(dp.city, ''), COALESCE(dp.country, ''),
		        COALESCE(ct.name, ''), l.updated_at, COALESCE(l.stripe_payment_status, '')
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		 LEFT JOIN containers ct ON ct.id = l.container_id
		 WHERE l.workflow_status IN ('available', 'validated')
		 ORDER BY l.updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ProfessionalItem
	for rows.Next() {
		var it ProfessionalItem
		var weightValue sql.NullFloat64
		var weightGrams sql.NullFloat64
		if err := rows.Scan(
			&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material,
			&it.Quantity, &weightValue, &it.WeightUnit, &weightGrams, &it.City, &it.Country, &it.Image, pq.Array(&it.Photos),
			&it.CreatedAt,
			&it.WorkflowStatus,
			&it.DepositPointName, pq.Array(&it.DepositPointPhotos),
			&it.DepositPointAddress, &it.DepositPointZipCode, &it.DepositPointCity, &it.DepositPointCountry,
			&it.ContainerName, &it.AvailableAt, &it.StripePaymentStatus,
		); err != nil {
			return nil, err
		}
		if weightValue.Valid {
			v := weightValue.Float64
			it.WeightValue = &v
		}
		if weightGrams.Valid {
			g := weightGrams.Float64
			it.WeightGrams = &g
		}
		results = append(results, it)
	}
	if results == nil {
		results = []ProfessionalItem{}
	}
	// Même enrichissement que GetProfessionalItemDetail : la liste JSON doit exposer mode / % pour le prix affiché côté front (commission « added »).
	if modeCfg, pct, errCfg := r.GetSaleCommissionConfig(ctx); errCfg == nil {
		for i := range results {
			results[i].SaleCommissionMode = modeCfg
			results[i].SaleCommissionPercent = pct
		}
	}
	return results, nil
}

func (r *Repository) GetProfessionalItemDetail(ctx context.Context, itemID, userID int64) (*ProfessionalItem, error) {
	r.releaseExpiredReservations(ctx)

	var it ProfessionalItem
	var reservedByUserID *int64
	var weightValue sql.NullFloat64
	var weightGrams sql.NullFloat64
	var pickupCodeExp sql.NullTime
	err := r.db.QueryRowContext(ctx,
		`SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material,
		        i.quantity, i.weight_value, i.weight_unit, i.weight_grams, i.city, i.country, i.image, i.photos,
		        i.created_at,
		        l.workflow_status,
		        COALESCE(l.transaction_ref, ''),
		        COALESCE(dp.name, ''), COALESCE(dp.photos, '{}'),
		        COALESCE(dp.address, ''), COALESCE(dp.zip_code, ''), COALESCE(dp.city, ''), COALESCE(dp.country, ''),
		        COALESCE(ct.name, ''), l.updated_at, COALESCE(l.stripe_payment_status, ''),
		        l.reserved_by_user_id, l.reserved_at, l.reservation_expires_at, l.pickup_code, l.pickup_code_expires_at, l.payment_validated_at, l.deposited_at
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		 LEFT JOIN containers ct ON ct.id = l.container_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material,
		&it.Quantity, &weightValue, &it.WeightUnit, &weightGrams, &it.City, &it.Country, &it.Image, pq.Array(&it.Photos),
		&it.CreatedAt,
		&it.WorkflowStatus,
		&it.TransactionRef,
		&it.DepositPointName, pq.Array(&it.DepositPointPhotos),
		&it.DepositPointAddress, &it.DepositPointZipCode, &it.DepositPointCity, &it.DepositPointCountry,
		&it.ContainerName, &it.AvailableAt, &it.StripePaymentStatus,
		&reservedByUserID, &it.ReservedAt, &it.ReservationExpiresAt, &it.PickupCode, &pickupCodeExp, &it.PaymentValidatedAt, &it.DepositedAt,
	)
	if err != nil {
		return nil, err
	}
	if weightValue.Valid {
		v := weightValue.Float64
		it.WeightValue = &v
	}
	if weightGrams.Valid {
		g := weightGrams.Float64
		it.WeightGrams = &g
	}
	if pickupCodeExp.Valid {
		t := pickupCodeExp.Time
		it.PickupCodeExpiresAt = &t
	}

	if it.WorkflowStatus != WFAvailable {
		if reservedByUserID == nil || *reservedByUserID != userID {
			return nil, sql.ErrNoRows
		}
	}

	if reservedByUserID == nil || *reservedByUserID != userID {
		it.PickupCode = ""
		it.PickupCodeExpiresAt = nil
	}

	if modeCfg, pct, errCfg := r.GetSaleCommissionConfig(ctx); errCfg == nil {
		it.SaleCommissionMode = modeCfg
		it.SaleCommissionPercent = pct
	}

	var sellerRatingAvg sql.NullFloat64
	var sellerRatingCount sql.NullInt64
	var mySellerStars sql.NullInt64
	var sellerCreatedAt sql.NullTime
	var sellerFirst, sellerLast, sellerEmail string
	err = r.db.QueryRowContext(ctx,
		`SELECT i.user_id,
		        TRIM(COALESCE(seller.firstname, '')),
		        TRIM(COALESCE(seller.lastname, '')),
		        TRIM(COALESCE(seller.email, '')),
		        (SELECT AVG(r.stars)::float8 FROM pro_seller_ratings r WHERE r.seller_user_id = i.user_id),
		        (SELECT COUNT(*)::bigint FROM pro_seller_ratings r WHERE r.seller_user_id = i.user_id),
		        (SELECT r.stars FROM pro_seller_ratings r WHERE r.item_id = i.id AND r.pro_user_id = $2 LIMIT 1),
		        seller.created_at,
		        (SELECT COUNT(*)::bigint FROM items i2 WHERE i2.user_id = i.user_id
		           AND NOT COALESCE(i2.deleted_by_user, false)
		           AND TRIM(LOWER(COALESCE(i2.status, ''))) <> 'brouillon'),
		        COALESCE(TRIM(seller.city), '')
		 FROM items i
		 JOIN users seller ON seller.id = i.user_id
		 WHERE i.id = $1`,
		itemID, userID,
	).Scan(
		&it.SellerUserID,
		&sellerFirst,
		&sellerLast,
		&sellerEmail,
		&sellerRatingAvg,
		&sellerRatingCount,
		&mySellerStars,
		&sellerCreatedAt,
		&it.SellerItemsCount,
		&it.SellerCity,
	)
	if err != nil {
		return nil, err
	}
	displayName := strings.TrimSpace(sellerFirst + " " + sellerLast)
	if displayName == "" {
		displayName = strings.TrimSpace(sellerEmail)
	}
	if displayName == "" {
		displayName = "Non renseigné"
	}
	it.SellerName = displayName
	if sellerRatingAvg.Valid {
		v := sellerRatingAvg.Float64
		it.SellerRatingAvg = &v
	}
	if sellerRatingCount.Valid {
		it.SellerRatingCount = sellerRatingCount.Int64
	}
	if mySellerStars.Valid {
		s := int(mySellerStars.Int64)
		it.MySellerRating = &s
	}
	if sellerCreatedAt.Valid {
		t := sellerCreatedAt.Time
		it.SellerRegisteredAt = &t
	}

	return &it, nil
}

func (r *Repository) GetProfessionalReservations(ctx context.Context, userID int64, displayName, companyName string) ([]ProfessionalItem, error) {
	r.releaseExpiredReservations(ctx)

	normalizedName := strings.TrimSpace(displayName)
	normalizedCompany := strings.TrimSpace(companyName)

	rows, err := r.db.QueryContext(ctx,
		`SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material,
		        i.quantity, i.weight_value, i.weight_unit, i.weight_grams, i.city, i.country, i.image, i.photos,
		        i.created_at,
		        l.workflow_status,
		        COALESCE(l.transaction_ref, ''),
		        COALESCE(dp.name, ''), COALESCE(dp.photos, '{}'),
		        COALESCE(dp.address, ''), COALESCE(dp.zip_code, ''), COALESCE(dp.city, ''), COALESCE(dp.country, ''),
		        COALESCE(ct.name, ''), l.updated_at, COALESCE(l.stripe_payment_status, ''),
		        l.reserved_at, l.reservation_expires_at, l.pickup_code, l.pickup_code_expires_at, l.payment_validated_at, l.deposited_at, COALESCE(l.cancel_reason, ''),
		        i.user_id,
		        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(seller.firstname), ''), NULLIF(TRIM(seller.lastname), ''))), ''), NULLIF(TRIM(seller.email), ''), '(inconnu)'),
		        (SELECT AVG(r.stars)::float8 FROM pro_seller_ratings r WHERE r.seller_user_id = i.user_id),
		        (SELECT COUNT(*)::bigint FROM pro_seller_ratings r WHERE r.seller_user_id = i.user_id),
		        (SELECT r.stars FROM pro_seller_ratings r WHERE r.item_id = i.id AND r.pro_user_id = $1 LIMIT 1)
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 JOIN users seller ON seller.id = i.user_id
		 LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		 LEFT JOIN containers ct ON ct.id = l.container_id
		 WHERE l.workflow_status IN ('pending_payment', 'reserved', 'assigned', 'deposit_code_sent', 'deposited', 'picked_up', 'ready_for_pickup', 'cancelled')
		   AND (
		        l.reserved_by_user_id = $1
		        OR (
		            l.workflow_status = 'picked_up'
		            AND l.reserved_by_user_id IS NULL
		            AND (
		                ($2 <> '' AND LOWER(TRIM(l.reserved_by_name)) = LOWER(TRIM($2)))
		                OR ($3 <> '' AND LOWER(TRIM(l.reserved_by_name)) = LOWER(TRIM($3)))
		            )
		        )
		   )
		 ORDER BY l.updated_at DESC`,
		userID, normalizedName, normalizedCompany,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ProfessionalItem
	for rows.Next() {
		var it ProfessionalItem
		var weightValue sql.NullFloat64
		var weightGrams sql.NullFloat64
		var sellerRatingAvg sql.NullFloat64
		var sellerRatingCount sql.NullInt64
		var mySellerStars sql.NullInt64
		var pickupCodeExp sql.NullTime
		if err := rows.Scan(
			&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material,
			&it.Quantity, &weightValue, &it.WeightUnit, &weightGrams, &it.City, &it.Country, &it.Image, pq.Array(&it.Photos),
			&it.CreatedAt,
			&it.WorkflowStatus,
			&it.TransactionRef,
			&it.DepositPointName, pq.Array(&it.DepositPointPhotos),
			&it.DepositPointAddress, &it.DepositPointZipCode, &it.DepositPointCity, &it.DepositPointCountry,
			&it.ContainerName, &it.AvailableAt, &it.StripePaymentStatus,
			&it.ReservedAt, &it.ReservationExpiresAt, &it.PickupCode, &pickupCodeExp, &it.PaymentValidatedAt, &it.DepositedAt, &it.CancelReason,
			&it.SellerUserID, &it.SellerName,
			&sellerRatingAvg, &sellerRatingCount, &mySellerStars,
		); err != nil {
			return nil, err
		}
		if weightValue.Valid {
			v := weightValue.Float64
			it.WeightValue = &v
		}
		if weightGrams.Valid {
			g := weightGrams.Float64
			it.WeightGrams = &g
		}
		if pickupCodeExp.Valid {
			t := pickupCodeExp.Time
			it.PickupCodeExpiresAt = &t
		}
		if sellerRatingAvg.Valid {
			v := sellerRatingAvg.Float64
			it.SellerRatingAvg = &v
		}
		if sellerRatingCount.Valid {
			it.SellerRatingCount = sellerRatingCount.Int64
		}
		if mySellerStars.Valid {
			s := int(mySellerStars.Int64)
			it.MySellerRating = &s
		}
		results = append(results, it)
	}
	if results == nil {
		results = []ProfessionalItem{}
	}
	if modeCfg, pct, errCfg := r.GetSaleCommissionConfig(ctx); errCfg == nil {
		for i := range results {
			results[i].SaleCommissionMode = modeCfg
			results[i].SaleCommissionPercent = pct
		}
	}
	return results, nil
}

func (r *Repository) UpsertProfessionalSellerRating(ctx context.Context, itemID, proUserID int64, stars int, displayName, companyName string) error {
	if stars < 1 || stars > 5 {
		return fmt.Errorf("stars must be between 1 and 5")
	}
	normalizedName := strings.TrimSpace(displayName)
	normalizedCompany := strings.TrimSpace(companyName)
	var sellerID int64
	var title string
	err := r.db.QueryRowContext(ctx,
		`SELECT i.user_id, i.title
		 FROM items i
		 INNER JOIN item_logistics l ON l.item_id = i.id
		 WHERE i.id = $1
		   AND l.workflow_status = 'picked_up'
		   AND (
		     l.reserved_by_user_id = $2
		     OR (
		       l.reserved_by_user_id IS NULL
		       AND (
		         ($3 <> '' AND LOWER(TRIM(l.reserved_by_name)) = LOWER(TRIM($3)))
		         OR ($4 <> '' AND LOWER(TRIM(l.reserved_by_name)) = LOWER(TRIM($4)))
		       )
		     )
		   )`,
		itemID, proUserID, normalizedName, normalizedCompany,
	).Scan(&sellerID, &title)
	if err != nil {
		return err
	}
	if sellerID == proUserID {
		return fmt.Errorf("cannot rate own listing")
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO pro_seller_ratings (item_id, pro_user_id, seller_user_id, stars)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (item_id, pro_user_id) DO UPDATE SET
		   stars = EXCLUDED.stars,
		   seller_user_id = EXCLUDED.seller_user_id,
		   updated_at = NOW()`,
		itemID, proUserID, sellerID, stars,
	)
	if err != nil {
		return err
	}

	// Notify seller (particulier)
	msg := fmt.Sprintf("Vous avez reçu une évaluation de %d étoiles pour votre annonce '%s'.", stars, title)
	_ = CreateNotification(ctx, r.db, sellerID, "Nouvelle évaluation", msg, "rating_received")

	return nil
}

// UpsertSellerProfessionalRating enregistre la note du particulier (vendeur) sur le professionnel ayant récupéré l'objet (parcours terminé).
func (r *Repository) UpsertSellerProfessionalRating(ctx context.Context, itemID, sellerUserID int64, stars int) error {
	if stars < 1 || stars > 5 {
		return fmt.Errorf("stars must be between 1 and 5")
	}
	var ownerID int64
	var proUserID sql.NullInt64
	err := r.db.QueryRowContext(ctx,
		`SELECT i.user_id, l.reserved_by_user_id
		 FROM items i
		 INNER JOIN item_logistics l ON l.item_id = i.id
		 WHERE i.id = $1 AND l.workflow_status = 'picked_up'`,
		itemID,
	).Scan(&ownerID, &proUserID)
	if err != nil {
		return err
	}
	if ownerID != sellerUserID {
		return fmt.Errorf("only item owner can rate the professional")
	}
	if !proUserID.Valid || proUserID.Int64 == 0 {
		return fmt.Errorf("no professional associated with this pickup")
	}
	if proUserID.Int64 == sellerUserID {
		return fmt.Errorf("invalid reservation")
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO seller_pro_ratings (item_id, seller_user_id, pro_user_id, stars)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (item_id) DO UPDATE SET
		   pro_user_id = EXCLUDED.pro_user_id,
		   stars = EXCLUDED.stars,
		   updated_at = NOW()`,
		itemID, sellerUserID, proUserID.Int64, stars,
	)
	return err
}

// GetSellerProfessionalRating retourne la note laissée par le vendeur sur le pro (si existe).
func (r *Repository) GetSellerProfessionalRating(ctx context.Context, itemID, sellerUserID int64) (stars int, ok bool, err error) {
	var s sql.NullInt64
	err = r.db.QueryRowContext(ctx,
		`SELECT r.stars FROM seller_pro_ratings r
		 INNER JOIN items i ON i.id = r.item_id
		 WHERE r.item_id = $1 AND r.seller_user_id = $2 AND i.user_id = $2`,
		itemID, sellerUserID,
	).Scan(&s)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	if !s.Valid {
		return 0, false, nil
	}
	return int(s.Int64), true, nil
}

func (r *Repository) ListProfessionalWatchlistItemIDs(ctx context.Context, userID int64) ([]int64, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT item_id
		 FROM professional_item_watchlist
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var itemID int64
		if err := rows.Scan(&itemID); err != nil {
			return nil, err
		}
		ids = append(ids, itemID)
	}
	if ids == nil {
		ids = []int64{}
	}
	return ids, nil
}

func (r *Repository) AddProfessionalWatchlistItem(ctx context.Context, userID, itemID int64) error {
	var exists bool
	if err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM item_logistics WHERE item_id = $1)`,
		itemID,
	).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return sql.ErrNoRows
	}

	_, err := r.db.ExecContext(ctx,
		`INSERT INTO professional_item_watchlist (user_id, item_id)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id, item_id) DO NOTHING`,
		userID, itemID,
	)
	return err
}

func (r *Repository) RemoveProfessionalWatchlistItem(ctx context.Context, userID, itemID int64) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM professional_item_watchlist WHERE user_id = $1 AND item_id = $2`,
		userID, itemID,
	)
	return err
}

// ── Repository methods ───────────────────────────────────────────────────────

func (r *Repository) CreateLogistics(ctx context.Context, itemID int64) (*ItemLogistics, error) {
	var l ItemLogistics
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO item_logistics (item_id, workflow_status)
		 VALUES ($1, 'available')
		 ON CONFLICT (item_id) DO UPDATE SET workflow_status = 'available', updated_at = NOW()
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
				l.reserved_by_name, l.reserved_by_user_id, COALESCE(l.transaction_ref, ''), l.reserved_at, l.reservation_expires_at, l.payment_validated_at,
				l.pickup_code, l.pickup_code_expires_at,
				l.collected_at, l.collected_confirmed_by,
				l.picked_up_at,
				l.cancelled_at, l.cancel_reason,
				l.created_at, l.updated_at,
				i.title, i.image, i.city, i.category, i.type,
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
		&l.ReservedByName, &l.ReservedByUserID, &l.TransactionRef, &l.ReservedAt, &l.ReservationExpiresAt, &l.PaymentValidatedAt,
		&l.PickupCode, &l.PickupCodeExpiresAt,
		&l.CollectedAt, &l.CollectedConfirmedBy,
		&l.PickedUpAt,
		&l.CancelledAt, &l.CancelReason,
		&l.CreatedAt, &l.UpdatedAt,
		&l.ItemTitle, &l.ItemImage, &l.ItemCity, &l.ItemCategory, &l.ItemType,
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
		l.ReservedByUserID = nil
		l.ReservedAt = nil
		l.ReservationExpiresAt = nil
		l.PaymentValidatedAt = nil
		l.PickupCode = ""
		l.PickupCodeExpiresAt = nil
		r.db.ExecContext(ctx, `UPDATE item_logistics SET workflow_status = 'available', reserved_by_name = '', reserved_by_user_id = NULL, reserved_at = NULL, reservation_expires_at = NULL, payment_validated_at = NULL, pickup_code = '', pickup_code_expires_at = NULL, updated_at = NOW() WHERE id = $1`, l.ID)
	}
	if l.WorkflowStatus == WFPendingPayment && l.ReservationExpiresAt != nil && now.After(*l.ReservationExpiresAt) {
		l.WorkflowStatus = WFAvailable
		l.ReservedByName = ""
		l.ReservedByUserID = nil
		l.ReservedAt = nil
		l.ReservationExpiresAt = nil
		l.PaymentValidatedAt = nil
		r.db.ExecContext(ctx, `UPDATE item_logistics SET workflow_status = 'available', reserved_by_name = '', reserved_by_user_id = NULL, reserved_at = NULL, reservation_expires_at = NULL, payment_validated_at = NULL, pickup_code = '', pickup_code_expires_at = NULL, updated_at = NOW() WHERE id = $1`, l.ID)
	}

	return &l, nil
}

func (r *Repository) ListLogistics(ctx context.Context, statusFilter string) ([]ItemLogistics, error) {
	r.releaseExpiredReservations(ctx)
	r.releaseExpiredDepositCodes(ctx)

	query := `
		SELECT l.id, l.item_id, l.workflow_status,
				l.deposit_point_id, l.container_id, l.assigned_at, l.assigned_by,
				l.deposit_code, l.deposit_code_expires_at, l.deposit_code_sent_at,
				l.deposited_at, l.deposited_confirmed_by,
				l.reserved_by_name, l.reserved_by_user_id, COALESCE(l.transaction_ref, ''), l.reserved_at, l.reservation_expires_at, l.payment_validated_at,
				l.pickup_code, l.pickup_code_expires_at,
				l.collected_at, l.collected_confirmed_by,
				l.picked_up_at,
				l.cancelled_at, l.cancel_reason,
				l.created_at, l.updated_at,
				i.title, i.image, i.city, i.category, i.type,
				(u.firstname || ' ' || u.lastname),
				COALESCE(dp.name, ''),
				COALESCE(ct.name, '')
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 JOIN users u ON u.id = i.user_id
		 LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		 LEFT JOIN containers ct ON ct.id = l.container_id
		 WHERE ($1 = '' OR l.workflow_status = $1 OR ($1 = 'available' AND l.workflow_status = 'validated'))
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
			&l.ReservedByName, &l.ReservedByUserID, &l.TransactionRef, &l.ReservedAt, &l.ReservationExpiresAt, &l.PaymentValidatedAt,
			&l.PickupCode, &l.PickupCodeExpiresAt,
			&l.CollectedAt, &l.CollectedConfirmedBy,
			&l.PickedUpAt,
			&l.CancelledAt, &l.CancelReason,
			&l.CreatedAt, &l.UpdatedAt,
			&l.ItemTitle, &l.ItemImage, &l.ItemCity, &l.ItemCategory, &l.ItemType,
			&l.OwnerName, &l.DepositPointName, &l.ContainerName,
		); err != nil {
			return nil, err
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
	// Validate current status and fetch metadata
	var status string
	var ownerID int64
	var proUserID sql.NullInt64
	var title string
	err := r.db.QueryRowContext(ctx, `
		SELECT l.workflow_status, i.user_id, l.reserved_by_user_id, i.title
		FROM item_logistics l
		JOIN items i ON i.id = l.item_id
		WHERE l.item_id = $1
	`, itemID).Scan(&status, &ownerID, &proUserID, &title)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFReserved && status != WFAssigned && status != WFDepositExpired {
		return fmt.Errorf("cannot assign from status %q", status)
	}

	if err := r.ExpireContainerMaintenanceIfEnded(ctx, p.ContainerID); err != nil {
		return err
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
	now := time.Now()
	var c Container
	c.Status = containerStatus
	if maintenanceStart.Valid {
		t := maintenanceStart.Time
		c.MaintenanceStart = &t
	}
	if maintenanceEnd.Valid {
		t := maintenanceEnd.Time
		c.MaintenanceEnd = &t
	}
	if isContainerInMaintenanceWindow(c, now) {
		return fmt.Errorf("container is in maintenance window")
	}
	if containerStatus != "actif" && containerStatus != "maintenance" && containerStatus != "inactif" {
		return fmt.Errorf("container is not assignable (status: %s)", containerStatus)
	}
	if currentCount >= capacity {
		return fmt.Errorf("container is full (%d/%d)", currentCount, capacity)
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'assigned',
			deposit_point_id = $1, container_id = $2,
			assigned_at = $3, assigned_by = $4,
			updated_at = $3
		 WHERE item_id = $5`,
		p.DepositPointID, p.ContainerID, now, adminID, itemID,
	)
	if err != nil {
		return err
	}

	// Notify owner (particulier)
	msgPart := fmt.Sprintf("Un point de dépôt a été assigné pour votre matériau '%s'.", title)
	_ = CreateNotification(ctx, r.db, ownerID, "Point de dépôt assigné", msgPart, "point_assigned")

	// Notify professional
	if proUserID.Valid {
		msgPro := fmt.Sprintf("Un point de dépôt a été assigné pour le matériau '%s' que vous avez réservé.", title)
		_ = CreateNotification(ctx, r.db, proUserID.Int64, "Point de dépôt assigné", msgPro, "point_assigned")
	}

	return nil
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
	var existingPickupCode string
	var ownerID int64
	var proUserID sql.NullInt64
	var title string

	err := r.db.QueryRowContext(ctx,
		`SELECT l.workflow_status, l.pickup_code, i.user_id, l.reserved_by_user_id, i.title
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(&status, &existingPickupCode, &ownerID, &proUserID, &title)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFDepositCodeSent {
		return fmt.Errorf("cannot confirm deposit from status %q", status)
	}

	now := time.Now()
	
	pickupCodeStr := existingPickupCode
	var expiresAt *time.Time
	if pickupCodeStr == "" {
		config, _ := r.GetCodeConfig(ctx)
		if config.Length < 4 { config.Length = 8 }
		pickupCodeStr = generateCode(config)
		expires := now.Add(PickupCodeTTL)
		expiresAt = &expires
	}

	// Update logistics
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'deposited',
			deposited_at = $1, deposited_confirmed_by = $2, updated_at = $1,
			pickup_code = COALESCE(NULLIF($3, ''), pickup_code),
			pickup_code_expires_at = COALESCE($4, pickup_code_expires_at)
		 WHERE item_id = $5`,
		now, adminID, pickupCodeStr, expiresAt, itemID,
	)
	if err != nil {
		return err
	}

	// Notify owner (particulier)
	msg := fmt.Sprintf("Votre dépôt pour le matériau '%s' a bien été enregistré.", title)
	_ = CreateNotification(ctx, r.db, ownerID, "Dépôt enregistré", msg, "material_deposited")

	// Notify professional
	if proUserID.Valid {
		msgPro := fmt.Sprintf("Le dépôt du matériau '%s' que vous avez réservé a bien été enregistré.", title)
		_ = CreateNotification(ctx, r.db, proUserID.Int64, "Dépôt enregistré", msgPro, "material_deposited")
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
	ReservedByUserID *int64 `json:"reserved_by_user_id,omitempty"`
}

func requiresPayment(itemType string, price float64) bool {
	return strings.EqualFold(strings.TrimSpace(itemType), TypeVente) && price > 0
}

func priceToCents(price float64) int64 {
	if price <= 0 {
		return 0
	}
	return int64(math.Round(price * 100))
}

// saleCommissionFeeCents calcule la commission plateforme (arrondi au centime) sur le prix annonce affiché.
func saleCommissionFeeCents(baseCents int64, percent float64) int64 {
	if baseCents <= 0 || percent <= 0 {
		return 0
	}
	return int64(math.Round(float64(baseCents) * percent / 100.0))
}

const (
	// SaleCommissionModeDeducted : l'acheteur paie le prix annonce ; la commission est prélevée sur ce montant (part plateforme).
	SaleCommissionModeDeducted = "deducted"
	// SaleCommissionModeAdded : la commission s'ajoute au prix annonce pour l'acheteur (deux lignes Stripe si commission > 0).
	SaleCommissionModeAdded = "added"
)

func normalizeSaleCommissionMode(m string) string {
	switch strings.TrimSpace(strings.ToLower(m)) {
	case SaleCommissionModeAdded:
		return SaleCommissionModeAdded
	default:
		return SaleCommissionModeDeducted
	}
}

func (r *Repository) GetSaleCommissionConfig(ctx context.Context) (mode string, percent float64, err error) {
	var m sql.NullString
	var p sql.NullFloat64
	err = r.db.QueryRowContext(ctx, `SELECT mode, percent FROM sale_commission_config WHERE id = 1`).Scan(&m, &p)
	if err == sql.ErrNoRows {
		return SaleCommissionModeDeducted, 0, nil
	}
	if err != nil {
		return "", 0, err
	}
	mode = normalizeSaleCommissionMode(m.String)
	if p.Valid {
		percent = p.Float64
	}
	return mode, percent, nil
}

func (r *Repository) SetSaleCommissionConfig(ctx context.Context, mode string, percent float64) error {
	if percent < 0 || percent > 100 {
		return fmt.Errorf("le pourcentage doit être entre 0 et 100")
	}
	mode = normalizeSaleCommissionMode(mode)
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO sale_commission_config (id, percent, mode) VALUES (1, $1, $2)
		 ON CONFLICT (id) DO UPDATE SET percent = EXCLUDED.percent, mode = EXCLUDED.mode`,
		percent, mode,
	)
	return err
}

func (r *Repository) ReserveItem(ctx context.Context, itemID int64, p ReservePayload) (string, error) {
	var status string
	var itemType string
	var price float64
	var reservedByUserID *int64
	var existingTransactionRef string
	var existingPickupCode string
	err := r.db.QueryRowContext(ctx,
		`SELECT workflow_status, reserved_by_user_id, COALESCE(transaction_ref, ''), pickup_code
		 FROM item_logistics
		 WHERE item_id = $1`,
		itemID,
	).Scan(&status, &reservedByUserID, &existingTransactionRef, &existingPickupCode)
	if err != nil {
		return "", fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFAvailable && status != WFValidated {
		if p.ReservedByUserID != nil && reservedByUserID != nil && *p.ReservedByUserID == *reservedByUserID {
			if status == WFPendingPayment || status == WFReserved {
				return existingPickupCode, nil
			}
		}
		return "", fmt.Errorf("cannot reserve from status %q", status)
	}
	var ownerID int64
	var title string
	err = r.db.QueryRowContext(ctx, `SELECT type, price, user_id, title FROM items WHERE id = $1`, itemID).Scan(&itemType, &price, &ownerID, &title)
	if err != nil {
		return "", fmt.Errorf("item data not found: %w", err)
	}

	now := time.Now()
	transactionRef := generateTransactionRef(now)
	reservationExpires := now.Add(ReservationTTL)
	baseCents := priceToCents(price)
	feeCents := int64(0)
	modeStored := SaleCommissionModeDeducted
	if requiresPayment(itemType, price) {
		modeCfg, pct, errCfg := r.GetSaleCommissionConfig(ctx)
		if errCfg != nil {
			return "", fmt.Errorf("commission: %w", errCfg)
		}
		modeStored = modeCfg
		feeCents = saleCommissionFeeCents(baseCents, pct)
	}
	var totalCents int64
	if modeStored == SaleCommissionModeAdded {
		totalCents = baseCents + feeCents
	} else {
		totalCents = baseCents
	}

	workflowTarget := WFReserved
	pickupCode := ""
	var pickupExpires *time.Time
	stripePaymentStatus := "not_required"
	if requiresPayment(itemType, price) {
		workflowTarget = WFPendingPayment
		stripePaymentStatus = "pending"
	}

	res, err := r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = $1,
			reserved_by_name = $2, reserved_by_user_id = $3, transaction_ref = $4, reserved_at = $5, reservation_expires_at = $6,
			pickup_code = $7, pickup_code_expires_at = $8,
			payment_validated_at = NULL,
			deposit_point_id = NULL,
			container_id = NULL,
			assigned_at = NULL,
			assigned_by = NULL,
			deposit_code = '',
			deposit_code_expires_at = NULL,
			deposit_code_sent_at = NULL,
			deposited_at = NULL,
			deposited_confirmed_by = NULL,
			stripe_checkout_session_id = '',
			stripe_payment_intent_id = '',
			stripe_payment_status = $9,
			stripe_amount_cents = $10,
			stripe_platform_fee_cents = $11,
			sale_commission_mode = $12,
			stripe_currency = 'eur',
			stripe_last_error = '',
			stripe_paid_at = NULL,
			picked_up_at = NULL,
			updated_at = $5
		 WHERE item_id = $13 AND (workflow_status = 'available' OR workflow_status = 'validated')`,
		workflowTarget, p.ReservedByName, p.ReservedByUserID, transactionRef, now, reservationExpires, pickupCode, pickupExpires,
		stripePaymentStatus, totalCents, feeCents, modeStored, itemID,
	)
	if err != nil {
		return "", err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return "", fmt.Errorf("item is no longer available")
	}

	// Notify owner that a pro reserved their material
	msg := fmt.Sprintf("Un professionnel a réservé votre matériau '%s'.", title)
	_ = CreateNotification(ctx, r.db, ownerID, "Matériau réservé", msg, "booking_received")

	return pickupCode, err
}

func (r *Repository) ValidatePaymentByProfessional(ctx context.Context, itemID, userID int64) (string, error) {
	return r.ValidateStripePaymentByProfessional(ctx, itemID, userID, "", "")
}

func (r *Repository) ValidateStripePaymentByProfessional(ctx context.Context, itemID, userID int64, paymentIntentID, checkoutSessionID string) (string, error) {
	var status string
	var itemType string
	var price float64
	var reservedByUserID *int64
	err := r.db.QueryRowContext(ctx,
		`SELECT l.workflow_status, l.reserved_by_user_id, i.type
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(&status, &reservedByUserID, &itemType)
	if err != nil {
		return "", fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFPendingPayment {
		return "", fmt.Errorf("cannot validate payment from status %q", status)
	}
	if reservedByUserID == nil || *reservedByUserID != userID {
		return "", fmt.Errorf("reservation does not belong to this user")
	}
	err = r.db.QueryRowContext(ctx, `SELECT price FROM items WHERE id = $1`, itemID).Scan(&price)
	if err != nil {
		return "", fmt.Errorf("item price not found: %w", err)
	}
	if !requiresPayment(itemType, price) {
		return "", fmt.Errorf("payment is only required for sale items")
	}

	config, _ := r.GetCodeConfig(ctx)
	if config.Length < 4 { config.Length = 8 }
	pickupCode := generateCode(config)
	now := time.Now()
	pickupExpires := now.Add(PickupCodeTTL)

	res, err := r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'reserved',
			payment_validated_at = $1,
			pickup_code = $2,
			pickup_code_expires_at = $3,
			stripe_payment_status = 'paid',
			stripe_payment_intent_id = COALESCE(NULLIF($4, ''), stripe_payment_intent_id),
			stripe_checkout_session_id = COALESCE(NULLIF($5, ''), stripe_checkout_session_id),
			stripe_paid_at = $1,
			stripe_last_error = '',
			updated_at = $1
		 WHERE item_id = $6 AND workflow_status = 'pending_payment' AND reserved_by_user_id = $7`,
		now, pickupCode, pickupExpires, paymentIntentID, checkoutSessionID, itemID, userID,
	)
	if err != nil {
		return "", err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return "", fmt.Errorf("payment validation conflict")
	}
	return pickupCode, nil
}

func (r *Repository) FailPaymentByProfessional(ctx context.Context, itemID, userID int64) error {
	return r.FailStripePaymentByProfessional(ctx, itemID, userID, "Paiement non confirme", "", "")
}

func (r *Repository) FailStripePaymentByProfessional(ctx context.Context, itemID, userID int64, reason, paymentIntentID, checkoutSessionID string) error {
	var status string
	var itemType string
	var price float64
	var reservedByUserID *int64
	err := r.db.QueryRowContext(ctx,
		`SELECT l.workflow_status, l.reserved_by_user_id, i.type, i.price
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(&status, &reservedByUserID, &itemType, &price)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFPendingPayment {
		return fmt.Errorf("cannot fail payment from status %q", status)
	}
	if reservedByUserID == nil || *reservedByUserID != userID {
		return fmt.Errorf("reservation does not belong to this user")
	}
	if !requiresPayment(itemType, price) {
		return fmt.Errorf("payment is only required for sale items")
	}
	if strings.TrimSpace(reason) == "" {
		reason = "Paiement non confirme"
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'available',
			reserved_by_name = '',
			reserved_by_user_id = NULL,
			transaction_ref = '',
			reserved_at = NULL,
			reservation_expires_at = NULL,
			payment_validated_at = NULL,
			pickup_code = '',
			pickup_code_expires_at = NULL,
			stripe_checkout_session_id = COALESCE(NULLIF($2, ''), stripe_checkout_session_id),
			stripe_payment_intent_id = COALESCE(NULLIF($3, ''), stripe_payment_intent_id),
			stripe_payment_status = 'failed',
			stripe_last_error = $4,
			updated_at = NOW()
		 WHERE item_id = $1`,
		itemID, checkoutSessionID, paymentIntentID, reason,
	)
	return err
}

type StripeCheckoutReservation struct {
	ItemID             int64
	ItemTitle          string
	AmountCents        int64  // montant total débité sur Stripe
	BaseCents          int64  // prix annonce (ligne 1 Checkout)
	PlatformFeeCents   int64  // commission (ligne 2 si mode added et > 0)
	CommissionMode     string // deducted | added
	Currency           string
}

func (r *Repository) GetStripeCheckoutReservation(ctx context.Context, itemID, userID int64) (*StripeCheckoutReservation, error) {
	var status string
	var itemType string
	var title string
	var price float64
	var reservedByUserID *int64
	var storedTotalCents int64
	var platformFeeCents int64
	var rowMode sql.NullString
	var currency string
	err := r.db.QueryRowContext(ctx,
		`SELECT l.workflow_status, l.reserved_by_user_id, i.type, i.title, i.price,
		        l.stripe_amount_cents, COALESCE(l.stripe_platform_fee_cents, 0),
		        l.sale_commission_mode, l.stripe_currency
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(&status, &reservedByUserID, &itemType, &title, &price, &storedTotalCents, &platformFeeCents, &rowMode, &currency)
	if err != nil {
		return nil, fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFPendingPayment {
		return nil, fmt.Errorf("item is not awaiting payment")
	}
	if reservedByUserID == nil || *reservedByUserID != userID {
		return nil, fmt.Errorf("reservation does not belong to this user")
	}
	if !requiresPayment(itemType, price) {
		return nil, fmt.Errorf("payment is only required for sale items")
	}
	listedCents := priceToCents(price)
	rawMode := strings.TrimSpace(rowMode.String)
	var mode string
	var baseCents, feeCents, totalCharged int64

	if storedTotalCents > 0 {
		feeCents = platformFeeCents
		if rawMode != "" {
			mode = normalizeSaleCommissionMode(rawMode)
		} else if feeCents > 0 && storedTotalCents == listedCents+feeCents {
			mode = SaleCommissionModeAdded
		} else {
			mode = SaleCommissionModeDeducted
		}
		if mode == SaleCommissionModeAdded && feeCents > 0 && storedTotalCents > feeCents {
			baseCents = storedTotalCents - feeCents
			totalCharged = storedTotalCents
		} else {
			baseCents = storedTotalCents
			totalCharged = storedTotalCents
		}
	} else {
		modeCfg, pct, _ := r.GetSaleCommissionConfig(ctx)
		mode = modeCfg
		baseCents = listedCents
		feeCents = saleCommissionFeeCents(baseCents, pct)
		if mode == SaleCommissionModeAdded {
			totalCharged = baseCents + feeCents
		} else {
			totalCharged = baseCents
		}
	}

	if totalCharged <= 0 || baseCents <= 0 {
		return nil, fmt.Errorf("invalid payment amount")
	}
	if strings.TrimSpace(currency) == "" {
		currency = "eur"
	}
	return &StripeCheckoutReservation{
		ItemID: itemID, ItemTitle: title,
		AmountCents: totalCharged, BaseCents: baseCents, PlatformFeeCents: feeCents,
		CommissionMode: mode,
		Currency:       currency,
	}, nil
}

func (r *Repository) SaveStripeCheckoutSession(ctx context.Context, itemID, userID int64, sessionID, paymentIntentID string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE item_logistics
		 SET stripe_checkout_session_id = $1,
		     stripe_payment_intent_id = COALESCE(NULLIF($2, ''), stripe_payment_intent_id),
		     stripe_payment_status = 'checkout_created',
		     stripe_last_error = '',
		     updated_at = NOW()
		 WHERE item_id = $3
		   AND workflow_status = 'pending_payment'
		   AND reserved_by_user_id = $4`,
		sessionID, paymentIntentID, itemID, userID,
	)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return fmt.Errorf("checkout session could not be attached")
	}
	return nil
}

func (r *Repository) IsStripeWebhookProcessed(ctx context.Context, eventID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM stripe_webhook_events WHERE event_id = $1)`, eventID).Scan(&exists)
	return exists, err
}

func (r *Repository) MarkStripeWebhookProcessed(ctx context.Context, eventID, eventType string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO stripe_webhook_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING`,
		eventID, eventType,
	)
	return err
}

// ── Transition: Confirm pickup ───────────────────────────────────────────────

func (r *Repository) ConfirmPickup(ctx context.Context, itemID int64, code string, adminID int64) error {
	var storedCode string
	var expiresAt *time.Time
	var status string
	var containerID *int64
	var itemType string
	var paymentValidatedAt *time.Time
	var depositedAt *time.Time
	var proUserID sql.NullInt64
	var ownerID int64
	var title string

	err := r.db.QueryRowContext(ctx,
		`SELECT l.workflow_status, l.pickup_code, l.pickup_code_expires_at, l.container_id, i.type, l.payment_validated_at, l.deposited_at, l.reserved_by_user_id, i.user_id, i.title
		 FROM item_logistics l
		 JOIN items i ON i.id = l.item_id
		 WHERE l.item_id = $1`,
		itemID,
	).Scan(&status, &storedCode, &expiresAt, &containerID, &itemType, &paymentValidatedAt, &depositedAt, &proUserID, &ownerID, &title)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}
	if status != WFDeposited && !(status == WFReserved && depositedAt != nil) {
		return fmt.Errorf("cannot confirm pickup from status %q", status)
	}
	if itemType == TypeVente && paymentValidatedAt == nil {
		return fmt.Errorf("payment must be validated before pickup")
	}
	if storedCode != code {
		return fmt.Errorf("invalid pickup code")
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return fmt.Errorf("pickup code has expired")
	}

	now := time.Now()
	// Move to picked_up in one step for MVP
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			workflow_status = 'picked_up',
			collected_at = $1, collected_confirmed_by = $2,
			picked_up_at = $3, updated_at = $1
		 WHERE item_id = $4`,
		now, adminID, now, itemID,
	)
	if err != nil {
		return err
	}

	// Notify professional
	if proUserID.Valid {
		msg := fmt.Sprintf("La récupération du matériau '%s' a bien été enregistrée.", title)
		_ = CreateNotification(ctx, r.db, proUserID.Int64, "Récupération enregistrée", msg, "material_recovered")
	}

	// Notify owner (particulier)
	msgOwner := fmt.Sprintf("Votre matériau '%s' a été récupéré par le professionnel.", title)
	_ = CreateNotification(ctx, r.db, ownerID, "Matériau récupéré", msgOwner, "material_recovered")

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

	if status == WFPickedUp {
		return fmt.Errorf("cannot cancel/revert from status %q", status)
	}

	if revertTo == "moderation_pending" {
		if status == WFCancelled {
			if _, err := r.db.ExecContext(ctx, `DELETE FROM item_logistics WHERE item_id = $1`, itemID); err != nil {
				return err
			}
		} else {
			if err := r.ResetLogisticsForModeration(ctx, itemID); err != nil {
				return err
			}
		}

		_, err = r.db.ExecContext(ctx, `
			UPDATE items
			SET status = 'en attente',
			    moderation_note = '',
			    moderation_details = '',
			    moderated_at = NULL,
			    updated_at = NOW()
			WHERE id = $1
		`, itemID)
		return err
	}

	if status == WFCancelled {
		return fmt.Errorf("cannot cancel/revert from status %q", status)
	}

	if revertTo != "" {
		isPostDeposit := (status == WFDeposited || status == WFAvailable || status == WFPendingPayment || status == WFReserved)
		targetIsPreDeposit := (revertTo == WFValidated || revertTo == WFAssigned || revertTo == WFDepositCodeSent || revertTo == WFDepositExpired || revertTo == WFReserved || revertTo == WFPendingPayment)

		extraReset := ""
		if revertTo == WFValidated {
			extraReset = `, 
				deposit_point_id = NULL, container_id = NULL, assigned_at = NULL, assigned_by = NULL,
				deposit_code = '', deposit_code_expires_at = NULL, deposit_code_sent_at = NULL,
				deposited_at = NULL, deposited_confirmed_by = NULL,
				reserved_by_name = '', reserved_by_user_id = NULL, reserved_at = NULL, reservation_expires_at = NULL,
				pickup_code = '', pickup_code_expires_at = NULL, payment_validated_at = NULL`
		}

		query := `
			UPDATE item_logistics
			SET workflow_status = $1,
				previous_workflow_status = '',
				cancelled_at = NULL,
				cancel_reason = '',
				cancelled_by_user = false,
				updated_at = NOW() ` + extraReset + `
			WHERE item_id = $2`
		_, err = r.db.ExecContext(ctx, query, revertTo, itemID)
		
		if isPostDeposit && targetIsPreDeposit && wasDeposited && containerID != nil {
			r.db.ExecContext(ctx, `UPDATE containers SET current_count = GREATEST(current_count - 1, 0) WHERE id = $1`, *containerID)
			r.db.ExecContext(ctx, `UPDATE item_logistics SET 
				deposited_at = NULL, 
				deposited_confirmed_by = NULL,
				pickup_code = '',
				pickup_code_expires_at = NULL 
				WHERE item_id = $1`, itemID)
			r.UpdateContainerCounts(ctx, *containerID)
		}
		return err
	}

	now := time.Now()
	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics SET
			previous_workflow_status = workflow_status,
			workflow_status = 'cancelled',
			cancelled_at = $1, cancel_reason = $2, cancelled_by_user = false, updated_at = $1
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

func isPostDepositWorkflowStatus(status string) bool {
	switch strings.TrimSpace(status) {
	case WFDeposited, WFAvailable, WFPendingPayment, WFReserved:
		return true
	default:
		return false
	}
}

func (r *Repository) UndoCancelledLogistics(ctx context.Context, itemID int64) error {
	var status string
	var previousStatus string
	var containerID *int64
	var wasDeposited bool

	err := r.db.QueryRowContext(ctx,
		`SELECT workflow_status, COALESCE(previous_workflow_status, ''), container_id, (deposited_at IS NOT NULL)
		 FROM item_logistics
		 WHERE item_id = $1`,
		itemID,
	).Scan(&status, &previousStatus, &containerID, &wasDeposited)
	if err != nil {
		return fmt.Errorf("item not in logistics: %w", err)
	}

	if status != WFCancelled {
		return fmt.Errorf("item is not cancelled")
	}
	if strings.TrimSpace(previousStatus) == "" {
		if _, err := r.db.ExecContext(ctx, `DELETE FROM item_logistics WHERE item_id = $1`, itemID); err != nil {
			return err
		}
		_, err = r.db.ExecContext(ctx, `
			UPDATE items
			SET status = 'en attente',
			    moderation_note = '',
			    moderation_details = '',
			    moderated_at = NULL,
			    updated_at = NOW()
			WHERE id = $1
		`, itemID)
		return err
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE item_logistics
		 SET workflow_status = $1,
		     previous_workflow_status = '',
		     cancelled_at = NULL,
		     cancel_reason = '',
		     cancelled_by_user = false,
		     updated_at = NOW()
		 WHERE item_id = $2`,
		previousStatus, itemID,
	)
	if err != nil {
		return err
	}

	if wasDeposited && containerID != nil && isPostDepositWorkflowStatus(previousStatus) {
		r.db.ExecContext(ctx, `UPDATE containers SET current_count = current_count + 1 WHERE id = $1`, *containerID)
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
	PendingPayment int `json:"pending_payment"`
	Reserved       int `json:"reserved"`
	PickedUp       int `json:"picked_up"`
	Cancelled      int `json:"cancelled"`
	Expired        int `json:"expired"`
	Total          int `json:"total"`
}

func (r *Repository) GetLogisticsStats(ctx context.Context) (*LogisticsStats, error) {
	r.releaseExpiredReservations(ctx)
	r.releaseExpiredDepositCodes(ctx)

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
		case WFPendingPayment:
			s.PendingPayment = count
		case WFReserved:
			s.Reserved = count
		case WFPickedUp:
			s.PickedUp = count
		case WFCancelled:
			s.Cancelled = count
		case WFDepositExpired, WFNeverCollected:
			s.Expired = count
		}
	}
	return &s, nil
}
