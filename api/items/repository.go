package items

import (
	"database/sql"
	"log"
	"strings"

	"github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

type UserItemState struct {
	ID             int64
	Status         string
	WorkflowStatus string
	HasLogistics   bool
	AfterDeposit   bool

	Title        string
	Description  string
	Type         string
	Price        float64
	Category     string
	Condition    string
	Material     string
	Quantity     string
	City         string
	Country      string
	Zip          string
	DeliveryMode string
	Dimensions   string
	Image        string
	Photos       []string
	Reference    string
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) EnsureSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS items (
			id            BIGSERIAL PRIMARY KEY,
			title         TEXT NOT NULL,
			description   TEXT NOT NULL DEFAULT '',
			type          TEXT NOT NULL DEFAULT 'don',
			price         NUMERIC(12,2) NOT NULL DEFAULT 0,
			category      TEXT NOT NULL DEFAULT '',
			condition     TEXT NOT NULL DEFAULT '',
			material      TEXT NOT NULL DEFAULT '',
			quantity      TEXT NOT NULL DEFAULT '1',
			city          TEXT NOT NULL DEFAULT '',
			zip           TEXT NOT NULL DEFAULT '',
			delivery_mode TEXT NOT NULL DEFAULT '',
			dimensions    TEXT NOT NULL DEFAULT '',
			image         TEXT NOT NULL DEFAULT '',
			photos        TEXT[] NOT NULL DEFAULT '{}',
			reference     TEXT NOT NULL DEFAULT '',
			status        TEXT NOT NULL DEFAULT 'en attente',
			views         INT NOT NULL DEFAULT 0,
			saves         INT NOT NULL DEFAULT 0,
			interested    INT NOT NULL DEFAULT 0,
			user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT items_type_check CHECK (type IN ('don', 'vente')),
			CONSTRAINT items_status_check CHECK (status IN ('en attente', 'actif', 'refusee', 'brouillon', 'vendue'))
		)`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS material TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity TEXT NOT NULL DEFAULT '1'`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'France'`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS dimensions TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}'`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check`,
		`ALTER TABLE items ADD CONSTRAINT items_status_check CHECK (status IN ('en attente', 'actif', 'refusee', 'brouillon', 'vendu', 'vendue', 'desactivee', 'desactive'))`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS moderation_note TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS moderation_details TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN NOT NULL DEFAULT false`,
		`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`,
		`CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)`,
		`CREATE TABLE IF NOT EXISTS deposit_points (
			id               BIGSERIAL PRIMARY KEY,
			name             TEXT NOT NULL,
			address          TEXT NOT NULL,
			zip_code         TEXT NOT NULL,
			city             TEXT NOT NULL,
			country          TEXT NOT NULL DEFAULT 'France',
			latitude         DOUBLE PRECISION,
			longitude        DOUBLE PRECISION,
			status           TEXT NOT NULL DEFAULT 'actif',
			type             TEXT NOT NULL DEFAULT 'conteneur',
			opening_hours    TEXT NOT NULL DEFAULT '',
			internal_comment TEXT NOT NULL DEFAULT '',
			photos           TEXT[] NOT NULL DEFAULT '{}',
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE deposit_points ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}'`,
		`CREATE TABLE IF NOT EXISTS containers (
			id               BIGSERIAL PRIMARY KEY,
			deposit_point_id BIGINT NOT NULL REFERENCES deposit_points(id) ON DELETE CASCADE,
			name             TEXT NOT NULL,
			capacity         INT NOT NULL DEFAULT 10,
			current_count    INT NOT NULL DEFAULT 0,
			status           TEXT NOT NULL DEFAULT 'actif',
			maintenance_reason TEXT NOT NULL DEFAULT '',
			maintenance_start TIMESTAMPTZ,
			maintenance_end   TIMESTAMPTZ,
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`ALTER TABLE containers ADD COLUMN IF NOT EXISTS maintenance_reason TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE containers ADD COLUMN IF NOT EXISTS maintenance_start TIMESTAMPTZ`,
		`ALTER TABLE containers ADD COLUMN IF NOT EXISTS maintenance_end TIMESTAMPTZ`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS container_id BIGINT REFERENCES containers(id)`,
	}
	for _, stmt := range statements {
		if _, err := r.db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) List(status, query string) ([]Item, error) {
	q := `SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material, i.quantity, i.city, i.country, i.zip, i.delivery_mode, i.dimensions, i.image, i.photos, i.reference, i.status, i.views, i.saves, i.interested, i.user_id, i.created_at, i.updated_at,
		(u.firstname || ' ' || u.lastname) as user_name,
		u.created_at as user_created_at,
		COALESCE(l.workflow_status, ''),
		COALESCE(l.deposit_code, ''),
		COALESCE(l.pickup_code, ''),
		i.moderation_note,
		i.moderation_details
		FROM items i
		JOIN users u ON u.id = i.user_id
		LEFT JOIN item_logistics l ON l.item_id = i.id
		WHERE i.deleted_by_user = false AND i.status != 'brouillon'
		AND ($1 = '' OR i.status = $1)
		AND ($2 = '' OR i.title ILIKE '%' || $2 || '%' OR i.description ILIKE '%' || $2 || '%' OR i.city ILIKE '%' || $2 || '%')
		ORDER BY i.created_at DESC`

	rows, err := r.db.Query(q, status, strings.TrimSpace(query))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Item
	for rows.Next() {
		var it Item
		var userRegistrationTS sql.NullTime
		err := rows.Scan(
			&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
			&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.Views, &it.Saves, &it.Interested,
			&it.UserID, &it.CreatedAt, &it.UpdatedAt, &it.UserName, &userRegistrationTS,
			&it.WorkflowStatus, &it.DepositCode, &it.PickupCode,
			&it.ModerationNote, &it.ModerationDetails,
		)
		if err != nil {
			return nil, err
		}
		it.Date = it.CreatedAt.Format("02/01/2006")
		if userRegistrationTS.Valid {
			it.UserRegistrationDate = userRegistrationTS.Time.Format("02/01/2006")
		}
		result = append(result, it)
	}
	return result, nil
}

func (r *Repository) ListByUser(userID int64) ([]Item, error) {
	q := `SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material, i.quantity, i.city, i.country, i.zip, i.delivery_mode, i.dimensions, i.image, i.photos, i.reference, i.status, i.views, i.saves, i.interested, i.user_id, i.created_at, i.updated_at,
		COALESCE(l.workflow_status, ''),
		COALESCE(l.deposit_code, ''),
		COALESCE(l.pickup_code, '')
		FROM items i
		LEFT JOIN item_logistics l ON l.item_id = i.id
		WHERE i.user_id = $1 AND i.deleted_by_user = false
		ORDER BY i.created_at DESC`
	rows, err := r.db.Query(q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []Item
	for rows.Next() {
		var it Item
		err := rows.Scan(
			&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
			&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.Views, &it.Saves, &it.Interested,
			&it.UserID, &it.CreatedAt, &it.UpdatedAt,
			&it.WorkflowStatus, &it.DepositCode, &it.PickupCode,
		)
		if err != nil {
			return nil, err
		}
		it.Date = it.CreatedAt.Format("02/01/2006")
		result = append(result, it)
	}
	return result, nil
}

func (r *Repository) Create(userID int64, p CreatePayload) (Item, error) {
	var it Item
	if p.Status == "" {
		p.Status = "en attente"
	}
	err := r.db.QueryRow(`
		INSERT INTO items (user_id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
		RETURNING id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status, user_id, created_at, updated_at
	`, userID, p.Title, p.Description, p.Type, p.Price, p.Category, p.Condition, p.Material, p.Quantity, p.City, p.Country, p.Zip, p.DeliveryMode, p.Dimensions, p.Image, pq.Array(p.Photos), p.Reference, p.Status).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
		&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.UserID, &it.CreatedAt, &it.UpdatedAt,
	)
	if err == nil {
		it.Date = it.CreatedAt.Format("02/01/2006")
	}
	return it, err
}

func (r *Repository) UpdateStatus(id int64, status, moderationNote, moderationDetails string) error {
	_, err := r.db.Exec(`
		UPDATE items 
		SET status = $1, 
			moderation_note = $2, 
			moderation_details = $3, 
			moderated_at = NOW(),
			updated_at = NOW() 
		WHERE id = $4
	`, status, moderationNote, moderationDetails, id)
	return err
}

func (r *Repository) Delete(id int64) error {
	_, err := r.db.Exec(`DELETE FROM items WHERE id = $1`, id)
	return err
}

func (r *Repository) HideByUser(id, userID int64) error {
	_, err := r.db.Exec(`UPDATE items SET deleted_by_user = true WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (r *Repository) GetByID(id int64) (Item, error) {
	log.Printf("Repository details: GetByID called for id=%d", id)
	var it Item
	var userRegistrationTS sql.NullTime
	
	query := `
		SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material, i.quantity, i.city, i.country, i.zip, i.delivery_mode, i.dimensions, i.image, i.photos, i.reference, i.status, i.views, i.saves, i.interested, i.user_id, i.created_at, i.updated_at,
		(COALESCE(u.firstname, '') || ' ' || COALESCE(u.lastname, '')) as user_name,
		u.created_at as user_created_at,
		COALESCE(l.workflow_status, ''),
		COALESCE(l.deposit_code, ''),
		COALESCE(l.pickup_code, ''),
		COALESCE(dp.name, ''),
		COALESCE(ct.name, ''),
		l.deposit_code_expires_at,
		l.pickup_code_expires_at,
		i.moderation_note,
		i.moderation_details,
		i.moderated_at
		FROM items i
		JOIN users u ON u.id = i.user_id
		LEFT JOIN item_logistics l ON l.item_id = i.id
		LEFT JOIN deposit_points dp ON dp.id = l.deposit_point_id
		LEFT JOIN containers ct ON ct.id = l.container_id
		WHERE i.id = $1
	`
	
	var depExp, pickExp, modAt sql.NullTime
	
	err := r.db.QueryRow(query, id).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
		&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.Views, &it.Saves, &it.Interested,
		&it.UserID, &it.CreatedAt, &it.UpdatedAt, &it.UserName, &userRegistrationTS,
		&it.WorkflowStatus, &it.DepositCode, &it.PickupCode,
		&it.DepositPointName, &it.ContainerName,
		&depExp, &pickExp,
		&it.ModerationNote, &it.ModerationDetails, &modAt,
	)
	
	if err != nil {
		log.Printf("Repository details error for id=%d: %v", id, err)
		return it, err
	}
	
	it.Date = it.CreatedAt.Format("02/01/2006")
	if userRegistrationTS.Valid {
		it.UserRegistrationDate = userRegistrationTS.Time.Format("02/01/2006")
	}
	if depExp.Valid {
		it.DepositCodeExpiresAt = depExp.Time.Format("02/01/2006")
	}
	if pickExp.Valid {
		it.PickupCodeExpiresAt = pickExp.Time.Format("02/01/2006")
	}
	if modAt.Valid {
		it.ModeratedAt = modAt.Time.Format("02/01/2006")
	}
	
	log.Printf("Repository details success for id=%d: status=%s", id, it.WorkflowStatus)
	return it, nil
}

func (r *Repository) Update(userID, itemID int64, p CreatePayload) (Item, error) {
	var it Item
	if p.Status == "" {
		p.Status = "en attente"
	}
	err := r.db.QueryRow(`
		UPDATE items 
		SET title = $1, description = $2, type = $3, price = $4, category = $5, condition = $6, material = $7,
		    quantity = $8, city = $9, country = $10, zip = $11, delivery_mode = $12, dimensions = $13, image = $14, 
		    photos = $15, reference = $16, status = $17, updated_at = NOW()
		WHERE id = $18 AND user_id = $19
		RETURNING id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status, user_id, created_at, updated_at
	`, p.Title, p.Description, p.Type, p.Price, p.Category, p.Condition, p.Material, p.Quantity, p.City, p.Country, p.Zip, p.DeliveryMode, p.Dimensions, p.Image, pq.Array(p.Photos), p.Reference, p.Status, itemID, userID).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
		&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.UserID, &it.CreatedAt, &it.UpdatedAt,
	)
	if err == nil {
		it.Date = it.CreatedAt.Format("02/01/2006")
	}
	return it, err
}

func (r *Repository) GetUserItemState(itemID, userID int64) (*UserItemState, error) {
	var state UserItemState
	var hasLogistics bool
	var depositedAt sql.NullTime

	err := r.db.QueryRow(`
		SELECT
			i.id, i.status,
			COALESCE(l.workflow_status, ''),
			(l.item_id IS NOT NULL) AS has_logistics,
			l.deposited_at,
			i.title, i.description, i.type, i.price, i.category, i.condition, i.material,
			i.quantity, i.city, i.country, i.zip, i.delivery_mode, i.dimensions,
			i.image, i.photos, i.reference
		FROM items i
		LEFT JOIN item_logistics l ON l.item_id = i.id
		WHERE i.id = $1 AND i.user_id = $2 AND i.deleted_by_user = false
	`, itemID, userID).Scan(
		&state.ID,
		&state.Status,
		&state.WorkflowStatus,
		&hasLogistics,
		&depositedAt,
		&state.Title,
		&state.Description,
		&state.Type,
		&state.Price,
		&state.Category,
		&state.Condition,
		&state.Material,
		&state.Quantity,
		&state.City,
		&state.Country,
		&state.Zip,
		&state.DeliveryMode,
		&state.Dimensions,
		&state.Image,
		pq.Array(&state.Photos),
		&state.Reference,
	)
	if err != nil {
		return nil, err
	}

	state.HasLogistics = hasLogistics
	state.AfterDeposit = depositedAt.Valid || map[string]bool{
		WFDeposited: true,
		WFAvailable: true,
		WFReserved:  true,
		WFCollected: true,
		WFClosed:    true,
	}[state.WorkflowStatus]

	return &state, nil
}

func (r *Repository) MarkCancelledByUser(itemID, userID int64) error {
	_, err := r.db.Exec(`
		UPDATE items
		SET status = 'desactivee', updated_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_by_user = false
	`, itemID, userID)
	return err
}
