package sirene

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	defaultRechercheBase = "https://recherche-entreprises.api.gouv.fr"
	defaultHTTPTimeout   = 20 * time.Second
)

// CompanyInfo contient les informations retournées par l'API pour un SIRET valide.
type CompanyInfo struct {
	Denomination string
	Address      string // rue : "9 RUE DU COLONEL PIERRE AVIA"
	ZipCode      string // "75015"
	City         string // "PARIS"
}

// Client interroge l'API Recherche d'Entreprises (data.gouv.fr) — aucune clé requise.
type Client struct {
	base       string
	httpClient *http.Client
}

// NewClient crée un client prêt à l'emploi.
func NewClient() *Client {
	return &Client{
		base:       strings.TrimRight(defaultRechercheBase, "/"),
		httpClient: &http.Client{Timeout: defaultHTTPTimeout},
	}
}

// Configured retourne toujours true : cette API ne nécessite pas d'authentification.
func (c *Client) Configured() bool {
	return c != nil
}

// rechercheResult est le sous-ensemble utile de la réponse JSON de l'API Recherche.
type rechercheResult struct {
	Results []struct {
		Siren            string `json:"siren"`
		NomRaisonSociale string `json:"nom_raison_sociale"`
		NomComplet       string `json:"nom_complet"`
		Siege            struct {
			Siret             string `json:"siret"`
			EtatAdministratif string `json:"etat_administratif"`
			NumeroVoie        string `json:"numero_voie"`
			TypeVoie          string `json:"type_voie"`
			LibelleVoie       string `json:"libelle_voie"`
			CodePostal        string `json:"code_postal"`
			LibelleCommune    string `json:"libelle_commune"`
		} `json:"siege"`
		MatchingEtablissements []struct {
			Siret             string `json:"siret"`
			EtatAdministratif string `json:"etat_administratif"`
		} `json:"matching_etablissements"`
	} `json:"results"`
	TotalResults int `json:"total_results"`
}

// LookupSiret vérifie qu'un SIRET existe et retourne les informations de l'entreprise.
// L'API Recherche d'Entreprises ne nécessite aucune clé API.
func (c *Client) LookupSiret(ctx context.Context, siret string) (*CompanyInfo, error) {
	var err error
	siret, err = NormalizeSiret(siret)
	if err != nil {
		return nil, err
	}

	// On cherche par SIREN (les 9 premiers chiffres du SIRET)
	siren := siret[:9]
	apiURL := fmt.Sprintf("%s/search?q=%s", c.base, siren)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("recherche entreprises : %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("recherche entreprises : statut %d : %s", resp.StatusCode, truncate(strings.TrimSpace(string(body)), 300))
	}

	var parsed rechercheResult
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("recherche entreprises : réponse JSON invalide")
	}

	if parsed.TotalResults == 0 || len(parsed.Results) == 0 {
		return nil, fmt.Errorf("SIRET inconnu ou inactif dans le référentiel national")
	}

	result := parsed.Results[0]

	// Vérifie que le SIRET correspond au siège
	if result.Siege.Siret == siret {
		if result.Siege.EtatAdministratif != "A" {
			return nil, fmt.Errorf("établissement fermé dans le référentiel national")
		}
		return buildCompanyInfo(result.NomRaisonSociale, result.NomComplet, result.Siege.NumeroVoie, result.Siege.TypeVoie, result.Siege.LibelleVoie, result.Siege.CodePostal, result.Siege.LibelleCommune), nil
	}

	// Vérifie dans les établissements remontés par la recherche
	for _, etab := range result.MatchingEtablissements {
		if etab.Siret == siret {
			if etab.EtatAdministratif != "A" {
				return nil, fmt.Errorf("établissement fermé dans le référentiel national")
			}
			// Pour un établissement secondaire, on retourne les infos du siège (seules disponibles)
			return buildCompanyInfo(result.NomRaisonSociale, result.NomComplet, result.Siege.NumeroVoie, result.Siege.TypeVoie, result.Siege.LibelleVoie, result.Siege.CodePostal, result.Siege.LibelleCommune), nil
		}
	}

	return nil, fmt.Errorf("SIRET inconnu ou inactif dans le référentiel national")
}

// buildCompanyInfo construit un CompanyInfo à partir des champs bruts de l'API.
func buildCompanyInfo(nomRaisonSociale, nomComplet, numeroVoie, typeVoie, libelleVoie, codePostal, libelleCommune string) *CompanyInfo {
	// Construit la rue en assemblant les parties non vides
	parts := []string{}
	for _, p := range []string{numeroVoie, typeVoie, libelleVoie} {
		if v := strings.TrimSpace(p); v != "" {
			parts = append(parts, v)
		}
	}

	return &CompanyInfo{
		Denomination: pickDenomination(nomRaisonSociale, nomComplet),
		Address:      strings.Join(parts, " "),
		ZipCode:      strings.TrimSpace(codePostal),
		City:         strings.TrimSpace(libelleCommune),
	}
}

func pickDenomination(nomRaisonSociale, nomComplet string) string {
	if d := strings.TrimSpace(nomRaisonSociale); d != "" {
		return d
	}
	return strings.TrimSpace(nomComplet)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}
