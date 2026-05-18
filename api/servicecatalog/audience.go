package servicecatalog

import (
	"database/sql"
	"errors"
)

// TargetAudienceFilterForRole renvoie le filtre catalogue pour un rôle client.
// Particulier → prestations « particulier » + « tous » ; pro → « professionnel » + « tous ».
// Admin / salarié → pas de filtre (toutes les prestations actives).
func TargetAudienceFilterForRole(role string) string {
	switch role {
	case "particulier":
		return "particulier"
	case "professionnel":
		return "professionnel"
	default:
		return ""
	}
}

// IsVisibleToRole indique si une prestation est visible pour le rôle appelant.
func IsVisibleToRole(serviceAudience, callerRole string) bool {
	switch callerRole {
	case "admin", "salarie":
		return true
	}
	if serviceAudience == "tous" {
		return true
	}
	if callerRole == "particulier" && serviceAudience == "particulier" {
		return true
	}
	if callerRole == "professionnel" && serviceAudience == "professionnel" {
		return true
	}
	return false
}

var ErrServiceNotFound = errors.New("service not found")
var ErrServiceNotAccessible = errors.New("service not accessible")

// LoadTargetAudience lit le public cible d'une prestation active.
func LoadTargetAudience(db *sql.DB, serviceID int64) (string, error) {
	var audience, status string
	err := db.QueryRow(`SELECT target_audience, status FROM services WHERE id = $1`, serviceID).Scan(&audience, &status)
	if err == sql.ErrNoRows {
		return "", ErrServiceNotFound
	}
	if err != nil {
		return "", err
	}
	if status != "actif" {
		return "", ErrServiceNotFound
	}
	return audience, nil
}

// AssertAccessible vérifie qu'un utilisateur peut consulter / réserver une prestation.
func AssertAccessible(db *sql.DB, serviceID int64, callerRole string) error {
	audience, err := LoadTargetAudience(db, serviceID)
	if err != nil {
		return err
	}
	if !IsVisibleToRole(audience, callerRole) {
		return ErrServiceNotAccessible
	}
	return nil
}
