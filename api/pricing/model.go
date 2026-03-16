package pricing

import "time"

const (
	TypeCommission   = "commission"
	TypeSubscription = "subscription"
	TypePromotion    = "promotion"
	TypeFlatFee      = "flat_fee"
)

type PricingRule struct {
	ID        int64     `json:"id"`
	Label     string    `json:"label"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CreatePayload struct {
	Label    string  `json:"label"`
	Type     string  `json:"type"`
	Amount   float64 `json:"amount"`
	IsActive bool    `json:"isActive"`
}

type UpdatePayload struct {
	Label    string  `json:"label"`
	Type     string  `json:"type"`
	Amount   float64 `json:"amount"`
	IsActive bool    `json:"isActive"`
}

func NormalizeType(raw string) string {
	switch raw {
	case TypeCommission, TypeSubscription, TypePromotion, TypeFlatFee:
		return raw
	}
	return ""
}
