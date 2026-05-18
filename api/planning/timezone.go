package planning

import "time"

// businessLocation fuseau utilisé pour les créneaux de réservation (France).
func businessLocation() *time.Location {
	loc, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		return time.Local
	}
	return loc
}
