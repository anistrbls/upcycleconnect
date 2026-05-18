package planning

import (
	"database/sql"
	"fmt"
	"time"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// EnsureSchema est appelé au démarrage pour garantir les tables (normalement fait via migration)
func (r *Repository) EnsureSchema() error {
	// Déjà fait via docker exec mais utile pour la robustesse
	return nil 
}

// ListSlots retourne les créneaux avec filtres optionnels
func (r *Repository) ListSlots(employeeID int64, serviceID int64, start time.Time, end time.Time) ([]ServiceSlot, error) {
	query := `
		SELECT s.id, s.service_id, svc.name, s.employee_id, (u.firstname || ' ' || u.lastname), 
		       s.start_time, s.end_time, s.capacity, s.is_available, s.created_at, s.updated_at
		FROM service_slots s
		JOIN services svc ON svc.id = s.service_id
		JOIN users u ON u.id = s.employee_id
		WHERE ($1 = 0 OR s.employee_id = $1)
		  AND ($2 = 0 OR s.service_id = $2)
		  AND (s.start_time >= $3 OR $3 = '0001-01-01 00:00:00+00')
		  AND (s.end_time <= $4 OR $4 = '0001-01-01 00:00:00+00')
		ORDER BY s.start_time ASC
	`
	rows, err := r.db.Query(query, employeeID, serviceID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slots []ServiceSlot
	for rows.Next() {
		var s ServiceSlot
		err := rows.Scan(
			&s.ID, &s.ServiceID, &s.ServiceName, &s.EmployeeID, &s.EmployeeName,
			&s.StartTime, &s.EndTime, &s.Capacity, &s.IsAvailable, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		slots = append(slots, s)
	}
	return slots, nil
}

func (r *Repository) CreateSlot(p CreateSlotPayload) (*ServiceSlot, error) {
	// Vérification de conflit
	var conflict bool
	err := r.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM service_slots 
			WHERE employee_id = $1 
			  AND (($2 >= start_time AND $2 < end_time) OR ($3 > start_time AND $3 <= end_time) OR ($2 <= start_time AND $3 >= end_time))
		) OR EXISTS(
			SELECT 1 FROM employee_unavailabilities
			WHERE employee_id = $1
			  AND (($2 >= start_time AND $2 < end_time) OR ($3 > start_time AND $3 <= end_time) OR ($2 <= start_time AND $3 >= end_time))
		)
	`, p.EmployeeID, p.StartTime, p.EndTime).Scan(&conflict)
	
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, fmt.Errorf("conflit de planning pour cet employé")
	}

	var s ServiceSlot
	err = r.db.QueryRow(`
		INSERT INTO service_slots (service_id, employee_id, start_time, end_time, capacity)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`, p.ServiceID, p.EmployeeID, p.StartTime, p.EndTime, p.Capacity).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
	
	if err != nil {
		return nil, err
	}
	s.ServiceID = p.ServiceID
	s.EmployeeID = p.EmployeeID
	s.StartTime = p.StartTime
	s.EndTime = p.EndTime
	s.Capacity = p.Capacity
	s.IsAvailable = true

	return &s, nil
}

func (r *Repository) UpdateSlot(id int64, p CreateSlotPayload) error {
	// Vérification de conflit (en ignorant l'ID actuel)
	var conflict bool
	err := r.db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM service_slots 
			WHERE employee_id = $1 AND id != $4
			  AND (($2 >= start_time AND $2 < end_time) OR ($3 > start_time AND $3 <= end_time) OR ($2 <= start_time AND $3 >= end_time))
		) OR EXISTS(
			SELECT 1 FROM employee_unavailabilities
			WHERE employee_id = $1
			  AND (($2 >= start_time AND $2 < end_time) OR ($3 > start_time AND $3 <= end_time) OR ($2 <= start_time AND $3 >= end_time))
		)
	`, p.EmployeeID, p.StartTime, p.EndTime, id).Scan(&conflict)
	
	if err != nil {
		return err
	}
	if conflict {
		return fmt.Errorf("conflit de planning pour cet employé")
	}

	_, err = r.db.Exec(`
		UPDATE service_slots 
		SET service_id = $1, employee_id = $2, start_time = $3, end_time = $4, capacity = $5, updated_at = NOW()
		WHERE id = $6
	`, p.ServiceID, p.EmployeeID, p.StartTime, p.EndTime, p.Capacity, id)
	return err
}

func (r *Repository) ListUnavailabilities(employeeID int64) ([]Unavailability, error) {
	query := `
		SELECT a.id, a.employee_id, (u.firstname || ' ' || u.lastname), 
		       a.start_time, a.end_time, a.reason, a.created_at, a.updated_at
		FROM employee_unavailabilities a
		JOIN users u ON u.id = a.employee_id
		WHERE ($1 = 0 OR a.employee_id = $1)
		ORDER BY a.start_time ASC
	`
	rows, err := r.db.Query(query, employeeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Unavailability
	for rows.Next() {
		var a Unavailability
		err := rows.Scan(
			&a.ID, &a.EmployeeID, &a.EmployeeName,
			&a.StartTime, &a.EndTime, &a.Reason, &a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, nil
}

func (r *Repository) CreateUnavailability(p CreateUnavailabilityPayload) (*Unavailability, error) {
	var a Unavailability
	err := r.db.QueryRow(`
		INSERT INTO employee_unavailabilities (employee_id, start_time, end_time, reason)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at
	`, p.EmployeeID, p.StartTime, p.EndTime, p.Reason).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	
	if err != nil {
		return nil, err
	}
	a.EmployeeID = p.EmployeeID
	a.StartTime = p.StartTime
	a.EndTime = p.EndTime
	a.Reason = p.Reason

	return &a, nil
}

func (r *Repository) UpdateUnavailability(id int64, p CreateUnavailabilityPayload) error {
	_, err := r.db.Exec(`
		UPDATE employee_unavailabilities 
		SET employee_id = $1, start_time = $2, end_time = $3, reason = $4, updated_at = NOW()
		WHERE id = $5
	`, p.EmployeeID, p.StartTime, p.EndTime, p.Reason, id)
	return err
}

func (r *Repository) DeleteSlot(id int64) error {
	_, err := r.db.Exec(`DELETE FROM service_slots WHERE id = $1`, id)
	return err
}

func (r *Repository) DeleteUnavailability(id int64) error {
	_, err := r.db.Exec(`DELETE FROM employee_unavailabilities WHERE id = $1`, id)
	return err
}

func (r *Repository) GetWorkingRules(employeeID int64) (*WorkingRules, error) {
	query := `
		SELECT employee_id, mon_active, mon_start, mon_end, tue_active, tue_start, tue_end, 
		       wed_active, wed_start, wed_end, thu_active, thu_start, thu_end, 
		       fri_active, fri_start, fri_end, sat_active, sat_start, sat_end, 
		       sun_active, sun_start, sun_end, works_public_holidays, updated_at
		FROM employee_working_rules WHERE employee_id = $1
	`
	var wr WorkingRules
	err := r.db.QueryRow(query, employeeID).Scan(
		&wr.EmployeeID, &wr.MonActive, &wr.MonStart, &wr.MonEnd,
		&wr.TueActive, &wr.TueStart, &wr.TueEnd,
		&wr.WedActive, &wr.WedStart, &wr.WedEnd,
		&wr.ThuActive, &wr.ThuStart, &wr.ThuEnd,
		&wr.FriActive, &wr.FriStart, &wr.FriEnd,
		&wr.SatActive, &wr.SatStart, &wr.SatEnd,
		&wr.SunActive, &wr.SunStart, &wr.SunEnd,
		&wr.WorksPublicHolidays, &wr.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		// Retourner des règles par défaut si non existantes
		return &WorkingRules{
			EmployeeID: employeeID,
			MonActive: true, MonStart: "09:00", MonEnd: "18:00",
			TueActive: true, TueStart: "09:00", TueEnd: "18:00",
			WedActive: true, WedStart: "09:00", WedEnd: "18:00",
			ThuActive: true, ThuStart: "09:00", ThuEnd: "18:00",
			FriActive: true, FriStart: "09:00", FriEnd: "18:00",
			SatActive: false, SatStart: "09:00", SatEnd: "18:00",
			SunActive: false, SunStart: "09:00", SunEnd: "18:00",
		}, nil
	}
	return &wr, err
}

func (r *Repository) UpdateWorkingRules(wr WorkingRules) error {
	query := `
		INSERT INTO employee_working_rules (
			employee_id, mon_active, mon_start, mon_end, tue_active, tue_start, tue_end, 
			wed_active, wed_start, wed_end, thu_active, thu_start, thu_end, 
			fri_active, fri_start, fri_end, sat_active, sat_start, sat_end, 
			sun_active, sun_start, sun_end, works_public_holidays, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())
		ON CONFLICT (employee_id) DO UPDATE SET
			mon_active = EXCLUDED.mon_active, mon_start = EXCLUDED.mon_start, mon_end = EXCLUDED.mon_end,
			tue_active = EXCLUDED.tue_active, tue_start = EXCLUDED.tue_start, tue_end = EXCLUDED.tue_end,
			wed_active = EXCLUDED.wed_active, wed_start = EXCLUDED.wed_start, wed_end = EXCLUDED.wed_end,
			thu_active = EXCLUDED.thu_active, thu_start = EXCLUDED.thu_start, thu_end = EXCLUDED.thu_end,
			fri_active = EXCLUDED.fri_active, fri_start = EXCLUDED.fri_start, fri_end = EXCLUDED.fri_end,
			sat_active = EXCLUDED.sat_active, sat_start = EXCLUDED.sat_start, sat_end = EXCLUDED.sat_end,
			sun_active = EXCLUDED.sun_active, sun_start = EXCLUDED.sun_start, sun_end = EXCLUDED.sun_end,
			works_public_holidays = EXCLUDED.works_public_holidays,
			updated_at = NOW()
	`
	_, err := r.db.Exec(query,
		wr.EmployeeID, wr.MonActive, wr.MonStart, wr.MonEnd,
		wr.TueActive, wr.TueStart, wr.TueEnd,
		wr.WedActive, wr.WedStart, wr.WedEnd,
		wr.ThuActive, wr.ThuStart, wr.ThuEnd,
		wr.FriActive, wr.FriStart, wr.FriEnd,
		wr.SatActive, wr.SatStart, wr.SatEnd,
		wr.SunActive, wr.SunStart, wr.SunEnd,
		wr.WorksPublicHolidays,
	)
	if err != nil {
		return fmt.Errorf("DB Error: %v", err)
	}
	return nil
}
