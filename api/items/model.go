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
	City         string    `json:"city"`
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
	UserName     string    `json:"userName,omitempty"`
	Date         string    `json:"date"` // Formatted date for frontend
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
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
	City         string   `json:"city"`
	Zip          string   `json:"zip"`
	DeliveryMode string   `json:"deliveryMode"`
	Dimensions   string   `json:"dimensions"`
	Image        string   `json:"image"`
	Photos       []string `json:"photos"`
	Reference    string   `json:"reference"`
}

type UpdateStatusPayload struct {
	Status string `json:"status"`
}
