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

const (
	BookingTypeBooking = "booking"
	BookingTypeRequest = "request"
)

type Booking struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"userId"`
	UserName      string    `json:"userName"`
	ServiceID        int64     `json:"serviceId"`
	ServiceName      string    `json:"serviceName"`
	ServiceImageURL  string    `json:"serviceImageUrl"`
	BookingDate   time.Time `json:"bookingDate"`
	Status        string    `json:"status"`
	PaymentStatus string    `json:"paymentStatus"`
	Amount        float64   `json:"amount"`
	Notes         string    `json:"notes"`
	// Nouveaux champs
	SlotID       *int64  `json:"slotId,omitempty"`
	EmployeeID   *int64  `json:"employeeId,omitempty"`
	EmployeeName string  `json:"employeeName,omitempty"`
	Message      string  `json:"message"`
	BookingType  string  `json:"bookingType"`
	DurationMinutes int   `json:"durationMinutes"`
	RefundStatus    string    `json:"refundStatus"`
	RefundAmount    float64   `json:"refundAmount"`
	RefundError     string    `json:"refundError,omitempty"`
	CancelledAt     *time.Time `json:"cancelledAt,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// CancelContext données nécessaires à l'annulation côté API.
type CancelContext struct {
	ID                    int64
	UserID                int64
	Amount                float64
	PaymentStatus         string
	Status                string
	RefundStatus          string
	StripeSessionID       string
	StripePaymentIntentID string
	BookingDate           time.Time
	DurationMinutes       int
	BookingType           string
}

type UpdateStatusPayload struct {
	Status        string `json:"status"`
	PaymentStatus string `json:"paymentStatus"`
}

type CreateBookingPayload struct {
	ServiceID    int64  `json:"serviceId"`
	SlotID       *int64 `json:"slotId,omitempty"`
	EmployeeID   *int64 `json:"employeeId,omitempty"`
	ScheduledAt  string `json:"scheduledAt,omitempty"`
	Message      string `json:"message"`
	BookingType  string `json:"bookingType"`
}

type ListFilters struct {
	Status        string
	PaymentStatus string
	ServiceID     int64
	UserID        int64
	EmployeeID    int64
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

func NormalizeBookingType(raw string) string {
	switch raw {
	case BookingTypeBooking, BookingTypeRequest:
		return raw
	}
	return BookingTypeBooking
}
