package items

import (
	"database/sql"
	"strings"

	"github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
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
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS views INT NOT NULL DEFAULT 0`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS saves INT NOT NULL DEFAULT 0`,
		`ALTER TABLE items ADD COLUMN IF NOT EXISTS interested INT NOT NULL DEFAULT 0`,
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
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS containers (
			id               BIGSERIAL PRIMARY KEY,
			deposit_point_id BIGINT NOT NULL REFERENCES deposit_points(id) ON DELETE CASCADE,
			name             TEXT NOT NULL,
			capacity         INT NOT NULL DEFAULT 10,
			current_count    INT NOT NULL DEFAULT 0,
			status           TEXT NOT NULL DEFAULT 'actif',
			created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`,
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
		u.created_at as user_created_at
		FROM items i
		JOIN users u ON u.id = i.user_id
		WHERE ($1 = '' OR i.status = $1)
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
	q := `SELECT id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status, views, saves, interested, user_id, created_at, updated_at 
	      FROM items WHERE user_id = $1 ORDER BY created_at DESC`
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
	err := r.db.QueryRow(`
		INSERT INTO items (user_id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'en attente')
		RETURNING id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status, user_id, created_at, updated_at
	`, userID, p.Title, p.Description, p.Type, p.Price, p.Category, p.Condition, p.Material, p.Quantity, p.City, p.Country, p.Zip, p.DeliveryMode, p.Dimensions, p.Image, pq.Array(p.Photos), p.Reference).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
		&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.UserID, &it.CreatedAt, &it.UpdatedAt,
	)
	if err == nil {
		it.Date = it.CreatedAt.Format("02/01/2006")
	}
	return it, err
}

func (r *Repository) UpdateStatus(id int64, status string) error {
	_, err := r.db.Exec(`UPDATE items SET status = $1, updated_at = NOW() WHERE id = $2`, status, id)
	return err
}

func (r *Repository) GetByID(id int64) (Item, error) {
	var it Item
	var userRegistrationTS sql.NullTime
	err := r.db.QueryRow(`
		SELECT i.id, i.title, i.description, i.type, i.price, i.category, i.condition, i.material, i.quantity, i.city, i.country, i.zip, i.delivery_mode, i.dimensions, i.image, i.photos, i.reference, i.status, i.views, i.saves, i.interested, i.user_id, i.created_at, i.updated_at,
		(u.firstname || ' ' || u.lastname) as user_name,
		u.created_at as user_created_at
		FROM items i
		JOIN users u ON u.id = i.user_id
		WHERE i.id = $1
	`, id).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
		&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.Views, &it.Saves, &it.Interested,
		&it.UserID, &it.CreatedAt, &it.UpdatedAt, &it.UserName, &userRegistrationTS,
	)
	if err == nil {
		it.Date = it.CreatedAt.Format("02/01/2006")
		if userRegistrationTS.Valid {
			it.UserRegistrationDate = userRegistrationTS.Time.Format("02/01/2006")
		}
	}
	return it, err
}

func (r *Repository) Update(userID, itemID int64, p CreatePayload) (Item, error) {
	var it Item
	err := r.db.QueryRow(`
		UPDATE items 
		SET title = $1, description = $2, type = $3, price = $4, category = $5, condition = $6, material = $7,
		    quantity = $8, city = $9, country = $10, zip = $11, delivery_mode = $12, dimensions = $13, image = $14, 
		    photos = $15, reference = $16, updated_at = NOW()
		WHERE id = $17 AND user_id = $18
		RETURNING id, title, description, type, price, category, condition, material, quantity, city, country, zip, delivery_mode, dimensions, image, photos, reference, status, user_id, created_at, updated_at
	`, p.Title, p.Description, p.Type, p.Price, p.Category, p.Condition, p.Material, p.Quantity, p.City, p.Country, p.Zip, p.DeliveryMode, p.Dimensions, p.Image, pq.Array(p.Photos), p.Reference, itemID, userID).Scan(
		&it.ID, &it.Title, &it.Description, &it.Type, &it.Price, &it.Category, &it.Condition, &it.Material, &it.Quantity,
		&it.City, &it.Country, &it.Zip, &it.DeliveryMode, &it.Dimensions, &it.Image, pq.Array(&it.Photos), &it.Reference, &it.Status, &it.UserID, &it.CreatedAt, &it.UpdatedAt,
	)
	if err == nil {
		it.Date = it.CreatedAt.Format("02/01/2006")
	}
	return it, err
}
