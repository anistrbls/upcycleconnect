package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// CitySearchSuggestion représente une suggestion ville/code postal
type CitySearchSuggestion struct {
	City     string `json:"city"`
	ZipCode  string `json:"zip_code"`
	Country  string `json:"country"`
	FullText string `json:"full_text"`
}

type nominatimSuggestion struct {
	Address struct {
		City         string `json:"city"`
		Town         string `json:"town"`
		Village      string `json:"village"`
		Municipality string `json:"municipality"`
		Hamlet       string `json:"hamlet"`
		Postcode     string `json:"postcode"`
	} `json:"address"`
}

type franceAddressResponse struct {
	Features []struct {
		Properties struct {
			City     string `json:"city"`
			Postcode string `json:"postcode"`
		} `json:"properties"`
	} `json:"features"`
}

func normalizeCountry(raw string) (display string, code string) {
	v := strings.ToLower(strings.TrimSpace(raw))
	switch {
	case strings.Contains(v, "france"):
		return "France", "fr"
	case strings.Contains(v, "suisse") || strings.Contains(v, "switzerland"):
		return "Suisse", "ch"
	case strings.Contains(v, "belgique") || strings.Contains(v, "belgium"):
		return "Belgique", "be"
	default:
		return strings.TrimSpace(raw), ""
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func fetchExternalCities(query, countryDisplay, countryCode string) ([]CitySearchSuggestion, error) {
	if countryCode == "" {
		return nil, fmt.Errorf("unsupported country")
	}

	if countryCode == "fr" {
		q := url.Values{}
		q.Set("q", query)
		q.Set("limit", "10")
		q.Set("type", "municipality")

		req, err := http.NewRequest(http.MethodGet, "https://api-adresse.data.gouv.fr/search/?"+q.Encode(), nil)
		if err != nil {
			return nil, err
		}

		client := &http.Client{Timeout: 4 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return nil, fmt.Errorf("external api status %d", resp.StatusCode)
		}

		var raw franceAddressResponse
		if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
			return nil, err
		}

		results := make([]CitySearchSuggestion, 0, len(raw.Features))
		seen := make(map[string]struct{})
		for _, item := range raw.Features {
			city := strings.TrimSpace(item.Properties.City)
			zip := strings.ReplaceAll(strings.TrimSpace(item.Properties.Postcode), " ", "")
			if city == "" || zip == "" {
				continue
			}
			key := strings.ToLower(city) + "|" + zip
			if _, exists := seen[key]; exists {
				continue
			}
			seen[key] = struct{}{}

			results = append(results, CitySearchSuggestion{
				City:     city,
				ZipCode:  zip,
				Country:  countryDisplay,
				FullText: city + " (" + zip + ", " + countryDisplay + ")",
			})
		}
		return results, nil
	}

	q := url.Values{}
	q.Set("q", query)
	q.Set("countrycodes", countryCode)
	q.Set("format", "jsonv2")
	q.Set("addressdetails", "1")
	q.Set("limit", "10")

	req, err := http.NewRequest(http.MethodGet, "https://nominatim.openstreetmap.org/search?"+q.Encode(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "upcycleconnect/1.0 (city-search)")

	client := &http.Client{Timeout: 4 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("external api status %d", resp.StatusCode)
	}

	var raw []nominatimSuggestion
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	results := make([]CitySearchSuggestion, 0, len(raw))
	seen := make(map[string]struct{})
	for _, item := range raw {
		city := firstNonEmpty(item.Address.City, item.Address.Town, item.Address.Village, item.Address.Municipality, item.Address.Hamlet)
		zip := strings.ReplaceAll(strings.TrimSpace(item.Address.Postcode), " ", "")
		if city == "" || zip == "" {
			continue
		}
		key := strings.ToLower(city) + "|" + zip
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}

		results = append(results, CitySearchSuggestion{
			City:     city,
			ZipCode:  zip,
			Country:  countryDisplay,
			FullText: city + " (" + zip + ", " + countryDisplay + ")",
		})
		if len(results) >= 10 {
			break
		}
	}

	return results, nil
}

// ensureCitiesSchema crée la table cities et la remplit avec des données initiales
func ensureCitiesSchema() error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS cities (
			id         BIGSERIAL PRIMARY KEY,
			country    TEXT NOT NULL,
			city       TEXT NOT NULL,
			zip_code   TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE(country, city, zip_code)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_cities_country_city ON cities(country, city)`,
		`CREATE INDEX IF NOT EXISTS idx_cities_country_zip ON cities(country, zip_code)`,
	}
	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}

	// Vérifier si des données existent
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM cities`).Scan(&count); err != nil {
		return err
	}

	// Si la table est vide, insérer les données de seed
	if count == 0 {
		seedCities := []struct {
			country string
			city    string
			zipCode string
		}{
			// France
			{"France", "Paris", "75001"}, {"France", "Paris", "75002"}, {"France", "Paris", "75003"},
			{"France", "Paris", "75004"}, {"France", "Paris", "75005"}, {"France", "Paris", "75006"},
			{"France", "Paris", "75007"}, {"France", "Paris", "75008"}, {"France", "Paris", "75009"},
			{"France", "Paris", "75010"}, {"France", "Paris", "75011"}, {"France", "Paris", "75012"},
			{"France", "Paris", "75013"}, {"France", "Paris", "75014"}, {"France", "Paris", "75015"},
			{"France", "Paris", "75016"}, {"France", "Paris", "75017"}, {"France", "Paris", "75018"},
			{"France", "Paris", "75019"}, {"France", "Paris", "75020"},
			{"France", "Lyon", "69000"}, {"France", "Lyon", "69001"}, {"France", "Lyon", "69002"},
			{"France", "Lyon", "69003"}, {"France", "Lyon", "69004"}, {"France", "Lyon", "69005"},
			{"France", "Lyon", "69006"}, {"France", "Lyon", "69007"}, {"France", "Lyon", "69008"},
			{"France", "Marseille", "13000"}, {"France", "Marseille", "13001"}, {"France", "Marseille", "13002"},
			{"France", "Marseille", "13003"}, {"France", "Marseille", "13004"}, {"France", "Marseille", "13005"},
			{"France", "Marseille", "13006"}, {"France", "Marseille", "13007"}, {"France", "Marseille", "13008"},
			{"France", "Toulouse", "31000"}, {"France", "Toulouse", "31001"}, {"France", "Toulouse", "31002"},
			{"France", "Toulouse", "31003"}, {"France", "Toulouse", "31004"},
			{"France", "Nice", "06000"}, {"France", "Nice", "06001"}, {"France", "Nice", "06002"},
			{"France", "Nice", "06003"}, {"France", "Nice", "06004"},
			{"France", "Bordeaux", "33000"}, {"France", "Bordeaux", "33001"}, {"France", "Bordeaux", "33002"},
			{"France", "Bordeaux", "33003"}, {"France", "Bordeaux", "33004"},
			// Suisse
			{"Suisse", "Zurich", "8000"}, {"Suisse", "Zurich", "8001"}, {"Suisse", "Zurich", "8002"},
			{"Suisse", "Zurich", "8003"}, {"Suisse", "Zurich", "8004"},
			{"Suisse", "Genève", "1200"}, {"Suisse", "Genève", "1201"}, {"Suisse", "Genève", "1202"},
			{"Suisse", "Genève", "1203"}, {"Suisse", "Genève", "1204"},
			{"Suisse", "Basel", "4000"}, {"Suisse", "Basel", "4001"},
			{"Suisse", "Bern", "3000"}, {"Suisse", "Bern", "3001"},
			{"Suisse", "Lausanne", "1000"}, {"Suisse", "Lausanne", "1001"},
			// Belgique
			{"Belgique", "Bruxelles", "1000"}, {"Belgique", "Bruxelles", "1001"}, {"Belgique", "Bruxelles", "1002"},
			{"Belgique", "Bruxelles", "1003"}, {"Belgique", "Bruxelles", "1004"},
			{"Belgique", "Anvers", "2000"}, {"Belgique", "Anvers", "2001"}, {"Belgique", "Anvers", "2002"},
			{"Belgique", "Gand", "9000"}, {"Belgique", "Gand", "9001"}, {"Belgique", "Gand", "9002"},
			{"Belgique", "Liège", "4000"}, {"Belgique", "Liège", "4001"}, {"Belgique", "Liège", "4002"},
			{"Belgique", "Charleroi", "6000"}, {"Belgique", "Charleroi", "6001"}, {"Belgique", "Charleroi", "6002"},
		}

		for _, s := range seedCities {
			_, err := db.Exec(
				`INSERT INTO cities (country, city, zip_code) VALUES ($1, $2, $3)`,
				s.country, s.city, s.zipCode,
			)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

// citiesSearchHandler gère la recherche par ville ou code postal via une vraie requête DB
func citiesSearchHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	countryRaw := strings.TrimSpace(r.URL.Query().Get("country"))
	country, countryCode := normalizeCountry(countryRaw)

	if len(query) < 2 || country == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{"results": []CitySearchSuggestion{}})
		return
	}

	if external, err := fetchExternalCities(query, country, countryCode); err == nil && len(external) > 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{"results": external})
		return
	}

	// Recherche dans la base de données avec LIKE (recherche partagée sur city ET zip_code)
	// Limité à 10 résultats
	rows, err := db.Query(`
		SELECT DISTINCT city, zip_code, country,
		       city || ' (' || zip_code || ', ' || country || ')' as full_text
		FROM cities
		WHERE LOWER(country) = LOWER($1) AND (city ILIKE $2 OR zip_code LIKE $2)
		ORDER BY city ASC, zip_code ASC
		LIMIT 10
	`, country, query+"%")

	if err != nil {
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}
	defer rows.Close()

	results := make([]CitySearchSuggestion, 0)
	for rows.Next() {
		var suggestion CitySearchSuggestion
		if err := rows.Scan(&suggestion.City, &suggestion.ZipCode, &suggestion.Country, &suggestion.FullText); err != nil {
			writeError(w, http.StatusInternalServerError, "parse error")
			return
		}
		results = append(results, suggestion)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"results": results})
}
