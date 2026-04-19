package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"upcycleconnect/api/sirene"
	"upcycleconnect/api/users"
)

// registerRequest contient les données envoyées par le formulaire d'inscription.
type registerRequest struct {
	Firstname        string `json:"firstname"`
	Lastname         string `json:"lastname"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	Role             string `json:"role"`
	Phone            string `json:"phone"`
	City             string `json:"city"`
	CompanyName      string `json:"companyName"`
	CompanyManager   string `json:"companyManager"`
	Siret            string `json:"siret"`
	Address          string `json:"address"`
	ZipCode          string `json:"zipCode"`
	ActivityType     string `json:"activityType"`
	InterventionZone string `json:"interventionZone"`
}

func handleRegister(w http.ResponseWriter, r *http.Request, insee *sirene.Client) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "JSON invalide")
		return
	}

	// Validation des champs obligatoires
	if strings.TrimSpace(req.Firstname) == "" {
		writeError(w, http.StatusBadRequest, "Le prénom est obligatoire")
		return
	}
	if strings.TrimSpace(req.Lastname) == "" {
		writeError(w, http.StatusBadRequest, "Le nom est obligatoire")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		writeError(w, http.StatusBadRequest, "L'email est obligatoire")
		return
	}
	if len(strings.TrimSpace(req.Password)) < 8 {
		writeError(w, http.StatusBadRequest, "Le mot de passe doit contenir au moins 8 caractères")
		return
	}

	// Seuls "particulier" et "professionnel" peuvent s'inscrire via ce formulaire
	role := users.NormalizeRole(strings.TrimSpace(req.Role))
	if role != users.RoleParticulier && role != users.RoleProfessionnel {
		writeError(w, http.StatusBadRequest, "Rôle d'inscription invalide")
		return
	}

	// Vérifier que l'email n'est pas déjà utilisé
	repo := users.NewRepository(db)
	exists, err := repo.EmailExists(email, 0)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Impossible de vérifier l'email")
		return
	}
	if exists {
		writeError(w, http.StatusConflict, "Cet email est déjà utilisé")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	// Les particuliers sont actifs immédiatement, les professionnels passent en attente de validation
	status := users.StatusActive
	var siretNorm string

	if role == users.RoleProfessionnel {
		status = users.StatusPending

		// Vérification du SIRET auprès de l'INSEE
		sn, err := sirene.NormalizeSiret(req.Siret)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		siretNorm = sn

		info, err := insee.LookupSiret(ctx, siretNorm)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		// Si la raison sociale n'est pas renseignée, on utilise la dénomination officielle
		companyName := strings.TrimSpace(req.CompanyName)
		if companyName == "" && info.Denomination != "" {
			companyName = info.Denomination
		}
		if companyName == "" {
			writeError(w, http.StatusBadRequest, "La raison sociale est obligatoire pour un compte professionnel")
			return
		}
		req.CompanyName = companyName
	}

	// Hashage du mot de passe
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Impossible de sécuriser le mot de passe")
		return
	}

	// Création du compte
	payload := users.CreatePayload{
		Firstname:        strings.TrimSpace(req.Firstname),
		Lastname:         strings.TrimSpace(req.Lastname),
		Email:            email,
		Password:         req.Password,
		Role:             role,
		Status:           status,
		Phone:            strings.TrimSpace(req.Phone),
		City:             strings.TrimSpace(req.City),
		CompanyName:      strings.TrimSpace(req.CompanyName),
		CompanyManager:   strings.TrimSpace(req.CompanyManager),
		Siret:            siretNorm,
		Address:          strings.TrimSpace(req.Address),
		ZipCode:          strings.TrimSpace(req.ZipCode),
		ActivityType:     strings.TrimSpace(req.ActivityType),
		InterventionZone: strings.TrimSpace(req.InterventionZone),
	}

	u, err := repo.Create(payload, string(hash))
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			writeError(w, http.StatusConflict, "Cet email est déjà utilisé")
			return
		}
		writeError(w, http.StatusInternalServerError, "Impossible de créer le compte")
		return
	}

	msg := "Compte créé. Vous pouvez vous connecter."
	if status == users.StatusPending {
		msg = "Compte créé. Il sera activé après validation par l'équipe UpcycleConnect."
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": msg,
		"user":    u,
	})
}

func handleSiretValidate(w http.ResponseWriter, r *http.Request, insee *sirene.Client) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	raw := strings.TrimSpace(r.URL.Query().Get("siret"))
	if raw == "" {
		writeError(w, http.StatusBadRequest, "Paramètre siret manquant")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	info, err := insee.LookupSiret(ctx, raw)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"valid":  false,
			"error":  err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"valid":        true,
		"configured":   true,
		"denomination": info.Denomination,
		"address":      info.Address,
		"zipCode":      info.ZipCode,
		"city":         info.City,
	})
}
