package reservations

import "time"

const (
	BookingPending   = "pending"
	BookingConfirmed = "confirmed"
	BookingCancelled = "cancelled"
	BookingCompleted = "completed"
)

const (
	PaymentPaid     = "paid"
	PaymentPending  = "pending"
	PaymentRefunded = "refunded"
)

type Booking struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"userId"`
	UserName      string    `json:"userName"`
	ServiceID     int64     `json:"serviceId"`
	ServiceName   string    `json:"serviceName"`
	BookingDate   time.Time `json:"bookingDate"`
	Status        string    `json:"status"`
	PaymentStatus string    `json:"paymentStatus"`
	Amount        float64   `json:"amount"`
	Notes         string    `json:"notes"`
	CreatedAt     time.Time `json:"createdAt"`
}

type UpdateStatusPayload struct {
	Status        string `json:"status"`
	PaymentStatus string `json:"paymentStatus"`
}

type ListFilters struct {
	Status        string
	PaymentStatus string
	ServiceID     int64
}

func NormalizeStatus(raw string) string {
	switch raw {
	case BookingPending, BookingConfirmed, BookingCancelled, BookingCompleted:
		return raw
	}
	return ""
}

func NormalizePaymentStatus(raw string) string {
	switch raw {
	case PaymentPaid, PaymentPending, PaymentRefunded:
		return raw
	}
	return ""
}
