package planning

import (
	"database/sql"
	"fmt"
	"time"
)

// WeekSlot représente un créneau réservable pour une prestation.
type WeekSlot struct {
	ScheduledAt   string `json:"scheduledAt"`
	EndAt         string `json:"endAt"`
	ProviderCount int    `json:"providerCount"`
}

// ListWeekSlots retourne les créneaux disponibles sur une semaine (au moins un salarié assigné libre).
func ListWeekSlots(db *sql.DB, serviceID int64, weekStart time.Time) ([]WeekSlot, int, int, error) {
	var duration int
	var status string
	err := db.QueryRow(`SELECT duration_minutes, status FROM services WHERE id = $1`, serviceID).Scan(&duration, &status)
	if err == sql.ErrNoRows {
		return nil, 0, 0, fmt.Errorf("service not found")
	}
	if err != nil {
		return nil, 0, 0, err
	}
	if status != "actif" {
		return nil, 0, 0, fmt.Errorf("prestation non disponible")
	}
	if duration <= 0 {
		duration = 60
	}

	providers, err := ListServiceProviders(db, serviceID)
	if err != nil {
		return nil, 0, 0, err
	}
	if len(providers) == 0 {
		return []WeekSlot{}, duration, 0, nil
	}

	loc := weekStart.Location()
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, loc)
	now := time.Now().In(loc)
	slotDuration := time.Duration(duration) * time.Minute

	repo := NewRepository(db)
	slots := make([]WeekSlot, 0)
	seen := map[string]struct{}{}

	for day := 0; day < 7; day++ {
		dayDate := weekStart.AddDate(0, 0, day)
		candidates := candidateStartsForDay(repo, providers, dayDate, slotDuration, now)
		for _, start := range candidates {
			end := start.Add(slotDuration)
			available, err := ListAvailableProviders(db, serviceID, start, end)
			if err != nil {
				return nil, 0, 0, err
			}
			if len(available) == 0 {
				continue
			}
			key := start.Format(time.RFC3339)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			slots = append(slots, WeekSlot{
				ScheduledAt:   start.Format(time.RFC3339),
				EndAt:         end.Format(time.RFC3339),
				ProviderCount: len(available),
			})
		}
	}

	return slots, duration, len(providers), nil
}

func candidateStartsForDay(repo *Repository, providers []ProviderSummary, dayDate time.Time, slotDuration time.Duration, now time.Time) []time.Time {
	loc := dayDate.Location()
	seenMinute := map[int]struct{}{}
	out := make([]time.Time, 0)

	for _, p := range providers {
		rules, err := repo.GetWorkingRules(p.ID)
		if err != nil || rules == nil {
			continue
		}
		workStart, workEnd, ok := workBoundsForDay(rules, dayDate)
		if !ok {
			continue
		}
		for t := workStart; !t.Add(slotDuration).After(workEnd); t = t.Add(slotDuration) {
			if t.Before(now) {
				continue
			}
			minuteKey := t.Hour()*60 + t.Minute()
			if _, dup := seenMinute[minuteKey]; dup {
				continue
			}
			seenMinute[minuteKey] = struct{}{}
			out = append(out, time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), 0, 0, loc))
		}
	}
	return out
}

func workBoundsForDay(rules *WorkingRules, dayDate time.Time) (time.Time, time.Time, bool) {
	var active bool
	var dayStartStr, dayEndStr string
	switch dayDate.Weekday() {
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
		return time.Time{}, time.Time{}, false
	}
	if dayStartStr == "" {
		dayStartStr = "09:00"
	}
	if dayEndStr == "" {
		dayEndStr = "18:00"
	}
	workStart, err1 := parseDayTime(dayDate, dayStartStr)
	workEnd, err2 := parseDayTime(dayDate, dayEndStr)
	if err1 != nil || err2 != nil || !workEnd.After(workStart) {
		return time.Time{}, time.Time{}, false
	}
	return workStart, workEnd, true
}
