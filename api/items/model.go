package items

import "time"

const (
	StatusPending  = "en attente"
	StatusActive   = "actif"
	StatusRejected = "refusee"
)

const (
	TypeDon   = "don"
	TypeVente = "vente"
)

type Item struct {
	ID           int64     `json:"id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Type         string    `json:"type"`
	Price        float64   `json:"price"`
	Category     string    `json:"category"`
	Condition    string    `json:"condition"`
	Material     string    `json:"material"`
	Quantity     string    `json:"quantity"`
	WeightValue  *float64  `json:"weightValue,omitempty"`
	WeightUnit   string    `json:"weightUnit,omitempty"`
	WeightGrams  *float64  `json:"weightGrams,omitempty"`
	City         string    `json:"city"`
	Country      string    `json:"country"`
	Zip          string    `json:"zip"`
	DeliveryMode string    `json:"deliveryMode"`
	Dimensions   string    `json:"dimensions"`
	Image        string    `json:"image"`
	Photos       []string  `json:"photos"`
	Reference    string    `json:"reference"`
	Status       string    `json:"status"`
	Views        int       `json:"views"`
	Saves        int       `json:"saves"`
	Interested   int       `json:"interested"`
	UserID       int64     `json:"userId"`
	ContainerID  *int64    `json:"containerId,omitempty"`
	UserName             string    `json:"userName,omitempty"`
	UserRegistrationDate string    `json:"userRegistrationDate,omitempty"`
	WorkflowStatus       string    `json:"workflowStatus"`
	AfterDeposit         bool      `json:"afterDeposit"`
	DepositCode          string    `json:"depositCode"`
	DepositCodeExpiresAt string    `json:"depositCodeExpiresAt,omitempty"`
	PickupCode           string    `json:"pickupCode"`
	PickupCodeExpiresAt  string    `json:"pickupCodeExpiresAt,omitempty"`
	DepositPointName     string    `json:"depositPointName"`
	ContainerName        string    `json:"containerName"`
	Date                 string    `json:"date"` // Formatted date for frontend
	ModerationNote       string    `json:"moderationNote"`
	ModerationDetails    string    `json:"moderationDetails"`
	ModeratedAt          string    `json:"moderatedAt,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	Featured      bool       `json:"featured"`
	FeaturedUntil *time.Time `json:"featuredUntil,omitempty"`
	BumpedAt      *time.Time `json:"bumpedAt,omitempty"`
	// Renseigné sur GET /api/items/{id} : affichage prix TTC pro (mode commission « added »).
	SaleCommissionMode    string  `json:"saleCommissionMode,omitempty"`
	SaleCommissionPercent float64 `json:"saleCommissionPercent,omitempty"`
	// Agrégats vendeur (avis pros sur ce déposant) — GET /api/items/{id}
	SellerRatingAvg   *float64 `json:"sellerRatingAvg,omitempty"`
	SellerRatingCount int64    `json:"sellerRatingCount"`
	SellerItemsCount  int64    `json:"sellerItemsCount"`
	SellerCity        string   `json:"sellerCity,omitempty"`
}

type CreatePayload struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	Type         string   `json:"type"`
	Price        float64  `json:"price"`
	Category     string   `json:"category"`
	Condition    string   `json:"condition"`
	Material     string   `json:"material"`
	Quantity     string   `json:"quantity"`
	WeightValue  *float64 `json:"weightValue"`
	WeightUnit   string   `json:"weightUnit"`
	WeightGrams  *float64 `json:"-"`
	City         string   `json:"city"`
	Country      string   `json:"country"`
	Zip          string   `json:"zip"`
	DeliveryMode string   `json:"deliveryMode"`
	Dimensions   string   `json:"dimensions"`
	Image        string   `json:"image"`
	Photos       []string `json:"photos"`
	Reference    string   `json:"reference"`
	Status       string   `json:"status"`
}

type UpdateStatusPayload struct {
	Status            string `json:"status"`
	ModerationNote    string `json:"moderationNote"`
	ModerationDetails string `json:"moderationDetails"`
}
