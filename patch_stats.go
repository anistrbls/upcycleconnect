package main

import (
	"fmt"
	"io/ioutil"
	"strings"
)

func main() {
	b, err := ioutil.ReadFile("api/main.go")
	if err != nil {
		panic(err)
	}
	content := string(b)

	target := `	stats := map[string]interface{}{
		"totalUsers": totalUsers,
		"particuliers": particuliers,`

	replacement := `	// === NOUVELLES METRIQUES (FINANCES ET ACTIVITES) ===
	var abonnements, commissions, ateliers, pubs float64

	_ = db.QueryRow("SELECT COALESCE(SUM(CASE WHEN subscription_type = 'pro_essentiel' THEN 15 WHEN subscription_type = 'premium_atelier' THEN 30 ELSE 0 END), 0) FROM users WHERE role IN ('professionnel', 'pro') AND status = 'active'").Scan(&abonnements)
	_ = db.QueryRow("SELECT COALESCE(SUM(stripe_amount_cents), 0)::float8 / 100 FROM item_logistics WHERE stripe_payment_status IN ('paid', 'succeeded')").Scan(&commissions)
	
	// Utilisons event_registrations pour les ateliers
	_ = db.QueryRow("SELECT COALESCE(SUM(e.price), 0) FROM event_registrations er JOIN events e ON er.event_id = e.id WHERE er.payment_status IN ('paid', 'succeeded')").Scan(&ateliers)
	
	finance := map[string]float64{
		"abonnements": abonnements,
		"commissions": commissions,
		"ateliers":    ateliers,
		"pubs":        pubs,
		"total":       abonnements + commissions + ateliers + pubs,
	}

	var resFormations, evtAvenir int
	_ = db.QueryRow("SELECT COUNT(*) FROM service_bookings").Scan(&resFormations)
	_ = db.QueryRow("SELECT COUNT(*) FROM events WHERE date_debut > NOW()").Scan(&evtAvenir)

	var totalAnnoncesValidees, totalAnnoncesTraitees int
	_ = db.QueryRow("SELECT COUNT(*) FROM items WHERE status IN ('actif', 'vendu', 'vendue')").Scan(&totalAnnoncesValidees)
	_ = db.QueryRow("SELECT COUNT(*) FROM items WHERE status IN ('actif', 'vendu', 'vendue', 'refuse')").Scan(&totalAnnoncesTraitees)
	
	var tauxValidation float64
	if totalAnnoncesTraitees > 0 {
		tauxValidation = float64(totalAnnoncesValidees) / float64(totalAnnoncesTraitees) * 100
	}

	var containerRemplissage float64
	_ = db.QueryRow("SELECT COALESCE(AVG(fill_level), 0) FROM containers").Scan(&containerRemplissage)

	stats := map[string]interface{}{
		"totalUsers": totalUsers,
		"particuliers": particuliers,
		"finance": finance,
		"resFormations": resFormations,
		"evtAvenir": evtAvenir,
		"tauxValidation": tauxValidation,
		"containerRemplissage": containerRemplissage,`

	if strings.Contains(content, target) {
		newContent := strings.Replace(content, target, replacement, 1)
		ioutil.WriteFile("api/main.go", []byte(newContent), 0644)
		fmt.Println("Patch applied!")
	} else {
		fmt.Println("Target not found!")
	}
}
