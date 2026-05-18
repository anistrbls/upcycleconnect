package planning

import (
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// ProviderSummary représente un salarié assigné à une prestation.
type ProviderSummary struct {
	ID        int64  `json:"id"`
	Firstname string `json:"firstname,omitempty"`
	Lastname  string `json:"lastname,omitempty"`
	Name      string `json:"name"`
}

// EnsureProviderSchema crée la table de liaison prestation ↔ salarié.
func EnsureProviderSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS service_providers (
			service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
			employee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (service_id, employee_id)
		);
		CREATE INDEX IF NOT EXISTS idx_service_providers_employee ON service_providers(employee_id);
	`)
	return err
}

// SyncServiceProviders remplace les salariés autorisés pour une prestation.
func SyncServiceProviders(db *sql.DB, serviceID int64, employeeIDs []int64) error {
	if serviceID <= 0 {
		return fmt.Errorf("invalid service id")
	}
	unique := make([]int64, 0, len(employeeIDs))
	seen := map[int64]struct{}{}
	for _, id := range employeeIDs {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		var role string
		if err := db.QueryRow(`SELECT role FROM users WHERE id = $1`, id).Scan(&role); err != nil {
			return fmt.Errorf("salarié #%d introuvable", id)
		}
		if role != "salarie" {
			return fmt.Errorf("l'utilisateur #%d n'est pas un salarié", id)
		}
		unique = append(unique, id)
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM service_providers WHERE service_id = $1`, serviceID); err != nil {
		return err
	}
	for _, empID := range unique {
		if _, err := tx.Exec(
			`INSERT INTO service_providers (service_id, employee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			serviceID, empID,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ListServiceProviders retourne les salariés assignés à une prestation.
func ListServiceProviders(db *sql.DB, serviceID int64) ([]ProviderSummary, error) {
	rows, err := db.Query(`
		SELECT u.id, COALESCE(u.firstname, ''), COALESCE(u.lastname, '')
		FROM service_providers sp
		JOIN users u ON u.id = sp.employee_id
		WHERE sp.service_id = $1
		ORDER BY u.lastname, u.firstname
	`, serviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]ProviderSummary, 0)
	for rows.Next() {
		var p ProviderSummary
		if err := rows.Scan(&p.ID, &p.Firstname, &p.Lastname); err != nil {
			return nil, err
		}
		p.Name = formatPersonName(p.Firstname, p.Lastname, p.ID)
		list = append(list, p)
	}
	return list, rows.Err()
}

// ListProviderIDs retourne uniquement les identifiants.
func ListProviderIDs(db *sql.DB, serviceID int64) ([]int64, error) {
	providers, err := ListServiceProviders(db, serviceID)
	if err != nil {
		return nil, err
	}
	ids := make([]int64, len(providers))
	for i, p := range providers {
		ids[i] = p.ID
	}
	return ids, nil
}

// IsServiceProvider vérifie qu'un salarié est assigné à la prestation.
func IsServiceProvider(db *sql.DB, serviceID, employeeID int64) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM service_providers WHERE service_id = $1 AND employee_id = $2
		)
	`, serviceID, employeeID).Scan(&exists)
	return exists, err
}

// ListAvailableProviders retourne les salariés assignés disponibles sur le créneau [start, end).
func ListAvailableProviders(db *sql.DB, serviceID int64, start, end time.Time) ([]ProviderSummary, error) {
	providers, err := ListServiceProviders(db, serviceID)
	if err != nil {
		return nil, err
	}
	if !end.After(start) {
		return nil, fmt.Errorf("créneau invalide")
	}

	repo := NewRepository(db)
	available := make([]ProviderSummary, 0, len(providers))
	for _, p := range providers {
		ok, err := isEmployeeAvailable(repo, db, p.ID, start, end, serviceID)
		if err != nil {
			return nil, err
		}
		if ok {
			available = append(available, p)
		}
	}
	return available, nil
}

func isEmployeeAvailable(repo *Repository, db *sql.DB, employeeID int64, start, end time.Time, serviceID int64) (bool, error) {
	rules, err := repo.GetWorkingRules(employeeID)
	if err != nil {
		return false, err
	}
	if !slotWithinWorkingRules(rules, start, end) {
		return false, nil
	}

	var unavail bool
	err = db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM employee_unavailabilities
			WHERE employee_id = $1
			  AND start_time < $3 AND end_time > $2
		)
	`, employeeID, start, end).Scan(&unavail)
	if err != nil || unavail {
		return false, err
	}

	var durationMinutes int
	_ = db.QueryRow(`SELECT duration_minutes FROM services WHERE id = $1`, serviceID).Scan(&durationMinutes)
	if durationMinutes <= 0 {
		durationMinutes = 60
	}

	var conflict bool
	err = db.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM service_bookings sb
			JOIN services s ON s.id = sb.service_id
			WHERE sb.employee_id = $1
			  AND sb.status IN ('pending', 'confirmed')
			  AND sb.booking_date < $3
			  AND (sb.booking_date + (COALESCE(NULLIF(s.duration_minutes, 0), 60) || ' minutes')::interval) > $2
		)
	`, employeeID, start, end).Scan(&conflict)
	if err != nil || conflict {
		return false, err
	}

	return true, nil
}

func slotWithinWorkingRules(rules *WorkingRules, start, end time.Time) bool {
	loc := start.Location()
	dayStart := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, loc)
	dayEnd := dayStart.Add(24 * time.Hour)
	if !end.After(start) || !start.Before(dayEnd) || !end.After(dayStart) {
		return false
	}

	var active bool
	var dayStartStr, dayEndStr string
	switch start.Weekday() {
	case time.Monday:
		active, dayStartStr, dayEndStr = rules.MonActive, rules.MonStart, rules.MonEnd
	case time.Tuesday:
		active, dayStartStr, dayEndStr = rules.TueActive, rules.TueStart, rules.TueEnd
	case time.Wednesday:
		active, dayStartStr, dayEndStr = rules.WedActive, rules.WedStart, rules.WedEnd
	case time.Thursday:
		active, dayStartStr, dayEndStr = rules.ThuActive, rules.ThuStart, rules.ThuEnd
	case time.Friday:
		active, dayStartStr, dayEndStr = rules.FriActive, rules.FriStart, rules.FriEnd
	case time.Saturday:
		active, dayStartStr, dayEndStr = rules.SatActive, rules.SatStart, rules.SatEnd
	case time.Sunday:
		active, dayStartStr, dayEndStr = rules.SunActive, rules.SunStart, rules.SunEnd
	}
	if !active {
		return false
	}
	if strings.TrimSpace(dayStartStr) == "" {
		dayStartStr = "09:00"
	}
	if strings.TrimSpace(dayEndStr) == "" {
		dayEndStr = "18:00"
	}

	workStart, err1 := parseDayTime(dayStart, dayStartStr)
	workEnd, err2 := parseDayTime(dayStart, dayEndStr)
	if err1 != nil || err2 != nil || !workEnd.After(workStart) {
		return false
	}
	return !start.Before(workStart) && !end.After(workEnd)
}

func parseDayTime(day time.Time, hhmm string) (time.Time, error) {
	parts := strings.Split(strings.TrimSpace(hhmm), ":")
	if len(parts) < 2 {
		return time.Time{}, fmt.Errorf("invalid time")
	}
	var h, m int
	if _, err := fmt.Sscanf(parts[0], "%d", &h); err != nil {
		return time.Time{}, err
	}
	if _, err := fmt.Sscanf(parts[1], "%d", &m); err != nil {
		return time.Time{}, err
	}
	return time.Date(day.Year(), day.Month(), day.Day(), h, m, 0, 0, day.Location()), nil
}

// ValidateBookingSlot vérifie qu'un salarié assigné est disponible au créneau demandé.
func ValidateBookingSlot(db *sql.DB, serviceID, employeeID int64, start time.Time) error {
	ok, err := IsServiceProvider(db, serviceID, employeeID)
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("salarié non autorisé pour cette prestation")
	}
	var duration int
	_ = db.QueryRow(`SELECT duration_minutes FROM services WHERE id = $1`, serviceID).Scan(&duration)
	if duration <= 0 {
		duration = 60
	}
	end := start.Add(time.Duration(duration) * time.Minute)
	available, err := ListAvailableProviders(db, serviceID, start, end)
	if err != nil {
		return err
	}
	for _, p := range available {
		if p.ID == employeeID {
			return nil
		}
	}
	return fmt.Errorf("créneau indisponible pour ce salarié")
}

func formatPersonName(first, last string, id int64) string {
	name := strings.TrimSpace(strings.TrimSpace(first) + " " + strings.TrimSpace(last))
	if name == "" {
		return fmt.Sprintf("Salarié #%d", id)
	}
	return name
}
