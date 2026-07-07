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

	// Update donItems
	content = strings.Replace(content, "SELECT COUNT(*) FROM items WHERE type = 'don' AND status = 'actif'", "SELECT COUNT(*) FROM items WHERE type = 'don' AND status = 'actif' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)
	
	// Update venteItems
	content = strings.Replace(content, "SELECT COUNT(*) FROM items WHERE type = 'vente' AND status = 'actif'", "SELECT COUNT(*) FROM items WHERE type = 'vente' AND status = 'actif' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	// Update upcyclingProjects
	content = strings.Replace(content, "SELECT COUNT(*) FROM upcycling_projects", "SELECT COUNT(*) FROM upcycling_projects WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	// Update commissions
	content = strings.Replace(content, "SELECT COALESCE(SUM(stripe_amount_cents), 0)::float8 / 100 FROM item_logistics WHERE stripe_payment_status IN ('paid', 'succeeded')", "SELECT COALESCE(SUM(stripe_amount_cents), 0)::float8 / 100 FROM item_logistics WHERE stripe_payment_status IN ('paid', 'succeeded') AND DATE_TRUNC('month', stripe_paid_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	// Update ateliers
	content = strings.Replace(content, "SELECT COALESCE(SUM(e.price), 0) FROM event_registrations er JOIN events e ON er.event_id = e.id WHERE er.payment_status IN ('paid', 'succeeded')", "SELECT COALESCE(SUM(e.price), 0) FROM event_registrations er JOIN events e ON er.event_id = e.id WHERE er.payment_status IN ('paid', 'succeeded') AND DATE_TRUNC('month', er.created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	// Update resFormations
	content = strings.Replace(content, "SELECT COUNT(*) FROM service_bookings", "SELECT COUNT(*) FROM service_bookings WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	// Update evtAvenir
	content = strings.Replace(content, "SELECT COUNT(*) FROM events WHERE date_debut > NOW()", "SELECT COUNT(*) FROM events WHERE date_debut >= NOW() AND date_debut < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'", 1)

	// Update totalAnnoncesValidees
	content = strings.Replace(content, "SELECT COUNT(*) FROM items WHERE status IN ('actif', 'vendu', 'vendue')", "SELECT COUNT(*) FROM items WHERE status IN ('actif', 'vendu', 'vendue') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	// Update totalAnnoncesTraitees
	content = strings.Replace(content, "SELECT COUNT(*) FROM items WHERE status IN ('actif', 'vendu', 'vendue', 'refuse')", "SELECT COUNT(*) FROM items WHERE status IN ('actif', 'vendu', 'vendue', 'refuse') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)", 1)

	ioutil.WriteFile("api/main.go", []byte(content), 0644)
	fmt.Println("Month filtering patched!")
}
