package users

import "time"

const (
	RoleParticulier  = "particulier"
	RoleProfessionnel = "professionnel"
	RoleSalarie      = "salarie"
	RoleAdmin        = "admin"
)

const (
	StatusActive    = "active"
	StatusPending   = "pending"
	StatusSuspended = "suspended"
)

const (
	EmpStatusFullTime = "temps_plein"
	EmpStatusPartTime = "temps_partiel"
)

const (
	JobFunctionAnimateur   = "animateur"
	JobFunctionFormateur   = "formateur"
	JobFunctionIntervenant = "intervenant"
)

// User représente un utilisateur complet retourné par l'API.
type User struct {
	ID          int64      `json:"id"`
	Firstname   string     `json:"firstname"`
	Lastname    string     `json:"lastname"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Status      string     `json:"status"`

	// Champs communs
	Phone       string     `json:"phone"`
	City        string     `json:"city"`

	// Champs Professionnel
	CompanyName      string     `json:"companyName"`
	CompanyManager   string     `json:"companyManager"`
	Siret            string     `json:"siret"`
	Address          string     `json:"address"`
	ZipCode          string     `json:"zipCode"`
	ActivityType     string     `json:"activityType"`
	InterventionZone string     `json:"interventionZone"`
	SubscriptionType string     `json:"subscriptionType"`
	SubscriptionStart *time.Time `json:"subscriptionStart,omitempty"`

	// Champs Salarié
	EmploymentStatus string     `json:"employmentStatus"`
	JobFunction      string     `json:"jobFunction"`
	EmployeeRole     string     `json:"employeeRole"`
	SiteLocation     string     `json:"siteLocation"`
	Skills           string     `json:"skills"`

	// Champs Admin
	AdminRole        string     `json:"adminRole"`

	// Note interne
	AdminNote        string     `json:"adminNote"`

	// Invalidation de session
	SessionsInvalidBefore *time.Time `json:"sessionsInvalidBefore,omitempty"`

	// Dates
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	LastLoginAt *time.Time `json:"lastLoginAt"`

	// Score UC Connect (professionnel) : objets récupérés utilisés dans des projets publiés et validés
	UpcycleConnectScore *float64 `json:"upcycleConnectScore,omitempty"`

	// Note moyenne reçue en tant que vendeur (déposant), agrégée sur les avis des professionnels (pro_seller_ratings).
	SellerRatingAvg   *float64 `json:"sellerRatingAvg,omitempty"`
	SellerRatingCount int64    `json:"sellerRatingCount"`
}

// CreatePayload contient les champs acceptés lors de la création d'un utilisateur par l'admin.
type CreatePayload struct {
	Firstname   string `json:"firstname"`
	Lastname    string `json:"lastname"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	Status      string `json:"status"`

	// Champs communs
	Phone       string `json:"phone"`
	City        string `json:"city"`

	// Champs Professionnel
	CompanyName      string `json:"companyName"`
	CompanyManager   string `json:"companyManager"`
	Siret            string `json:"siret"`
	Address          string `json:"address"`
	ZipCode          string `json:"zipCode"`
	ActivityType     string `json:"activityType"`
	InterventionZone string `json:"interventionZone"`
	SubscriptionType string `json:"subscriptionType"`
	SubscriptionStart *time.Time `json:"subscriptionStart,omitempty"`

	// Champs Salarié
	EmploymentStatus string `json:"employmentStatus"`
	JobFunction      string `json:"jobFunction"`
	EmployeeRole     string `json:"employeeRole"`
	SiteLocation     string `json:"siteLocation"`
	Skills           string `json:"skills"`

	// Champs Admin
	AdminRole        string `json:"adminRole"`
}

// UpdatePayload contient les champs modifiables par l'admin.
type UpdatePayload struct {
	Firstname   string `json:"firstname"`
	Lastname    string `json:"lastname"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	Status      string `json:"status"`

	// Champs communs
	Phone       string `json:"phone"`
	City        string `json:"city"`

	// Champs Professionnel
	CompanyName      string `json:"companyName"`
	CompanyManager   string `json:"companyManager"`
	Siret            string `json:"siret"`
	Address          string `json:"address"`
	ZipCode          string `json:"zipCode"`
	ActivityType     string `json:"activityType"`
	InterventionZone string `json:"interventionZone"`
	SubscriptionType string `json:"subscriptionType"`
	SubscriptionStart *time.Time `json:"subscriptionStart,omitempty"`

	// Champs Salarié
	EmploymentStatus string `json:"employmentStatus"`
	JobFunction      string `json:"jobFunction"`
	EmployeeRole     string `json:"employeeRole"`
	SiteLocation     string `json:"siteLocation"`
	Skills           string `json:"skills"`

	// Champs Admin
	AdminRole        string `json:"adminRole"`

	// Note interne
	AdminNote string `json:"adminNote"`
}

// UpdateProfilePayload contient les champs modifiables par l'utilisateur lui-même.
type UpdateProfilePayload struct {
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	City      string `json:"city"`
}

// UpdatePasswordPayload contient les champs pour changer son mot de passe.
type UpdatePasswordPayload struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type StatusPayload struct {
	Status string `json:"status"`
}

type ResetPasswordPayload struct {
	Password       string `json:"password"`
	DisconnectUser bool   `json:"disconnectUser"`
}

type ListFilters struct {
	Query  string
	Role   string
	Status string
}

func NormalizeRole(raw string) string {
	switch raw {
	case RoleParticulier, RoleProfessionnel, RoleSalarie, RoleAdmin:
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
