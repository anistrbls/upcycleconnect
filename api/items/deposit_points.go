package items

import (
	"context"
	"errors"
	"time"

	"github.com/lib/pq"
)

type DepositPoint struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Address         string    `json:"address"`
	ZipCode         string    `json:"zip_code"`
	City            string    `json:"city"`
	Country         string    `json:"country"`
	Latitude        float64   `json:"latitude"`
	Longitude       float64   `json:"longitude"`
	Status          string    `json:"status"` // actif, inactif, sature, maintenance
	Type            string    `json:"type"`   // conteneur, box, local, annexe
	OpeningHours    string    `json:"opening_hours"`
	InternalComment string    `json:"internal_comment"`
	Photos          []string  `json:"photos"`
	CreatedAt       time.Time `json:"created_at"`
	TotalCapacity   int       `json:"total_capacity"`
	CurrentCount    int       `json:"current_count"`
	Containers      []Container `json:"containers,omitempty"`
}

type Container struct {
	ID             int64     `json:"id"`
	DepositPointID int64     `json:"deposit_point_id"`
	Name           string    `json:"name"`
	Capacity       int       `json:"capacity"`
	CurrentCount   int       `json:"current_count"`
	Status         string    `json:"status"` // actif, inactif, maintenance
	MaintenanceReason string `json:"maintenance_reason,omitempty"`
	MaintenanceStart  *time.Time `json:"maintenance_start,omitempty"`
	MaintenanceEnd    *time.Time `json:"maintenance_end,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

var ErrContainerStatusChangeBlocked = errors.New("container status change blocked")

func isContainerUnavailable(c Container, now time.Time) bool {
	if c.Status == "inactif" {
		return true
	}
	if c.Status != "maintenance" {
		return false
	}
	if c.MaintenanceStart != nil && c.MaintenanceEnd != nil {
		return !now.Before(*c.MaintenanceStart) && !now.After(*c.MaintenanceEnd)
	}
	return true
}

// Deposit Point Methods

func (r *Repository) ListDepositPoints(ctx context.Context) ([]DepositPoint, error) {
	query := `
		SELECT p.id, p.name, p.address, p.zip_code, p.city, p.country, p.latitude, p.longitude, p.status, p.type, p.opening_hours, p.internal_comment, p.photos, p.created_at,
		       COALESCE(SUM(c.capacity), 0) as total_capacity,
		       COALESCE(SUM(c.current_count), 0) as current_count
		FROM deposit_points p
		LEFT JOIN containers c ON p.id = c.deposit_point_id
		GROUP BY p.id
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []DepositPoint
	for rows.Next() {
		var p DepositPoint
		if err := rows.Scan(&p.ID, &p.Name, &p.Address, &p.ZipCode, &p.City, &p.Country, &p.Latitude, &p.Longitude, &p.Status, &p.Type, &p.OpeningHours, &p.InternalComment, pq.Array(&p.Photos), &p.CreatedAt, &p.TotalCapacity, &p.CurrentCount); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, nil
}

func (r *Repository) CreateDepositPoint(ctx context.Context, p *DepositPoint) error {
	query := `INSERT INTO deposit_points (name, address, zip_code, city, country, latitude, longitude, status, type, opening_hours, internal_comment, photos)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, created_at`
	return r.db.QueryRowContext(ctx, query, p.Name, p.Address, p.ZipCode, p.City, p.Country, p.Latitude, p.Longitude, p.Status, p.Type, p.OpeningHours, p.InternalComment, pq.Array(p.Photos)).Scan(&p.ID, &p.CreatedAt)
}

func (r *Repository) GetDepositPointByID(ctx context.Context, id int64) (*DepositPoint, error) {
	var p DepositPoint
	query := `SELECT id, name, address, zip_code, city, country, latitude, longitude, status, type, opening_hours, internal_comment, photos, created_at 
	          FROM deposit_points WHERE id = $1`
	err := r.db.QueryRowContext(ctx, query, id).Scan(&p.ID, &p.Name, &p.Address, &p.ZipCode, &p.City, &p.Country, &p.Latitude, &p.Longitude, &p.Status, &p.Type, &p.OpeningHours, &p.InternalComment, pq.Array(&p.Photos), &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) UpdateDepositPoint(ctx context.Context, p *DepositPoint) error {
	query := `UPDATE deposit_points SET name=$1, address=$2, zip_code=$3, city=$4, country=$5, latitude=$6, longitude=$7, status=$8, type=$9, opening_hours=$10, internal_comment=$11, photos=$12
	          WHERE id=$13`
	_, err := r.db.ExecContext(ctx, query, p.Name, p.Address, p.ZipCode, p.City, p.Country, p.Latitude, p.Longitude, p.Status, p.Type, p.OpeningHours, p.InternalComment, pq.Array(p.Photos), p.ID)
	return err
}

func (r *Repository) DeleteDepositPoint(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM deposit_points WHERE id = $1", id)
	return err
}

// Container Methods

func (r *Repository) ListContainersByPoint(ctx context.Context, pointID int64) ([]Container, error) {
	query := `SELECT id, deposit_point_id, name, capacity, current_count, status, maintenance_reason, maintenance_start, maintenance_end, created_at 
	          FROM containers WHERE deposit_point_id = $1 ORDER BY name ASC`
	rows, err := r.db.QueryContext(ctx, query, pointID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var containers []Container
	for rows.Next() {
		var c Container
		if err := rows.Scan(&c.ID, &c.DepositPointID, &c.Name, &c.Capacity, &c.CurrentCount, &c.Status, &c.MaintenanceReason, &c.MaintenanceStart, &c.MaintenanceEnd, &c.CreatedAt); err != nil {
			return nil, err
		}
		containers = append(containers, c)
	}
	return containers, nil
}

func (r *Repository) CreateContainer(ctx context.Context, c *Container) error {
	query := `INSERT INTO containers (deposit_point_id, name, capacity, status, maintenance_reason, maintenance_start, maintenance_end)
	          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`
	return r.db.QueryRowContext(ctx, query, c.DepositPointID, c.Name, c.Capacity, c.Status, c.MaintenanceReason, c.MaintenanceStart, c.MaintenanceEnd).Scan(&c.ID, &c.CreatedAt)
}

func (r *Repository) UpdateContainer(ctx context.Context, c *Container) error {
	var currentCount int
	err := r.db.QueryRowContext(ctx, `SELECT current_count FROM containers WHERE id = $1`, c.ID).Scan(&currentCount)
	if err != nil {
		return err
	}

	if currentCount > 0 && c.Status != "actif" {
		return ErrContainerStatusChangeBlocked
	}

	if c.Status != "maintenance" {
		c.MaintenanceReason = ""
		c.MaintenanceStart = nil
		c.MaintenanceEnd = nil
	}

	query := `UPDATE containers SET name=$1, capacity=$2, status=$3, maintenance_reason=$4, maintenance_start=$5, maintenance_end=$6 WHERE id=$7`
	_, err = r.db.ExecContext(ctx, query, c.Name, c.Capacity, c.Status, c.MaintenanceReason, c.MaintenanceStart, c.MaintenanceEnd, c.ID)
	return err
}

func (r *Repository) DeleteContainer(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM containers WHERE id = $1", id)
	return err
}

func (r *Repository) UpdateContainerCounts(ctx context.Context, containerID int64) error {
	// Re-calculate current_count based on item_logistics assigned to this container
	// (Only count items that are physically in the container)
	query := `UPDATE containers SET current_count = (
		SELECT count(*) FROM item_logistics 
		WHERE container_id = $1 
		AND workflow_status IN ('deposited', 'available', 'reserved')
	) WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, containerID)
	if err != nil {
		return err
	}

	// Also update the status of the deposit point if all its containers are full
	// (This is a simplified logic, we could make it more robust)
	return r.UpdateDepositPointStatus(ctx, containerID)
}

func (r *Repository) UpdateDepositPointStatus(ctx context.Context, containerID int64) error {
	// Find the deposit point ID
	var pointID int64
	err := r.db.QueryRowContext(ctx, "SELECT deposit_point_id FROM containers WHERE id = $1", containerID).Scan(&pointID)
	if err != nil {
		return err
	}

	// Check if all active containers are full
	var full bool
	query := `
		SELECT NOT EXISTS (
			SELECT 1 FROM containers 
			WHERE deposit_point_id = $1 
			AND status = 'actif' 
			AND current_count < capacity
		)
	`
	err = r.db.QueryRowContext(ctx, query, pointID).Scan(&full)
	if err != nil {
		return err
	}

	if full {
		_, err = r.db.ExecContext(ctx, "UPDATE deposit_points SET status = 'sature' WHERE id = $1 AND status = 'actif'", pointID)
	} else {
		_, err = r.db.ExecContext(ctx, "UPDATE deposit_points SET status = 'actif' WHERE id = $1 AND status = 'sature'", pointID)
	}

	return err
}
