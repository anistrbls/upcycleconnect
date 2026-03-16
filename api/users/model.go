package users

import "time"

const (
	RoleParticulier = "particulier"
	RolePrestataire = "prestataire"
	RoleAdmin       = "admin"
)

const (
	StatusActive    = "active"
	StatusPending   = "pending"
	StatusSuspended = "suspended"
)

type User struct {
	ID          int64      `json:"id"`
	Firstname   string     `json:"firstname"`
	Lastname    string     `json:"lastname"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`
	IsValidated bool       `json:"isValidated"`
	AdminNote   string     `json:"adminNote"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	LastLoginAt *time.Time `json:"lastLoginAt"`
}

type CreatePayload struct {
	Firstname   string `json:"firstname"`
	Lastname    string `json:"lastname"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	IsValidated bool   `json:"isValidated"`
}

type UpdatePayload struct {
	Firstname   string `json:"firstname"`
	Lastname    string `json:"lastname"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	IsValidated bool   `json:"isValidated"`
	AdminNote   string `json:"adminNote"`
}

type StatusPayload struct {
	Status string `json:"status"`
}

type ListFilters struct {
	Query  string
	Role   string
	Status string
}

func NormalizeRole(raw string) string {
	switch raw {
	case RoleParticulier, RolePrestataire, RoleAdmin:
		return raw
	}
	return ""
}

func NormalizeStatus(raw string) string {
	switch raw {
	case StatusActive, StatusPending, StatusSuspended:
		return raw
	}
	return ""
}
