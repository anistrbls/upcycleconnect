package items

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type StripeConfig struct {
	SecretKey     string
	WebhookSecret string
	SuccessURL    string
	CancelURL     string
}

func getStripeConfig() (*StripeConfig, error) {
	cfg := &StripeConfig{
		SecretKey:     strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")),
		WebhookSecret: strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET")),
		SuccessURL:    strings.TrimSpace(os.Getenv("STRIPE_SUCCESS_URL")),
		CancelURL:     strings.TrimSpace(os.Getenv("STRIPE_CANCEL_URL")),
	}
	if cfg.SecretKey == "" {
		return nil, fmt.Errorf("stripe is not configured")
	}
	if cfg.SuccessURL == "" {
		cfg.SuccessURL = "http://localhost:3000/annonces/mes-recuperations?stripe=success&session_id={CHECKOUT_SESSION_ID}"
	}
	if cfg.CancelURL == "" {
		cfg.CancelURL = "http://localhost:3000/annonces/mes-recuperations?stripe=cancel"
	}
	return cfg, nil
}

type stripeCheckoutSession struct {
	ID            string            `json:"id"`
	URL           string            `json:"url"`
	Status        string            `json:"status"`
	PaymentStatus string            `json:"payment_status"`
	PaymentIntent string            `json:"payment_intent"`
	Metadata      map[string]string `json:"metadata"`
}

func createStripeCheckoutSession(cfg *StripeConfig, itemID, userID int64, title string, amountCents int64, currency string) (*stripeCheckoutSession, error) {
	if amountCents <= 0 {
		return nil, fmt.Errorf("invalid amount")
	}

	itemIDStr := strconv.FormatInt(itemID, 10)
	userIDStr := strconv.FormatInt(userID, 10)
	cleanCurrency := strings.ToLower(strings.TrimSpace(currency))
	if cleanCurrency == "" {
		cleanCurrency = "eur"
	}

	form := url.Values{}
	form.Set("mode", "payment")
	form.Set("success_url", cfg.SuccessURL)
	form.Set("cancel_url", cfg.CancelURL)
	form.Set("metadata[item_id]", itemIDStr)
	form.Set("metadata[user_id]", userIDStr)
	form.Set("line_items[0][quantity]", "1")
	form.Set("line_items[0][price_data][currency]", cleanCurrency)
	form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(amountCents, 10))
	form.Set("line_items[0][price_data][product_data][name]", title)

	req, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.SecretKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("stripe checkout creation failed: %s", strings.TrimSpace(string(body)))
	}

	var session stripeCheckoutSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, err
	}
	if strings.TrimSpace(session.ID) == "" || strings.TrimSpace(session.URL) == "" {
		return nil, fmt.Errorf("invalid stripe session response")
	}
	return &session, nil
}

// GetStripeConfigPublic expose la config Stripe pour d'autres packages (ex: events)
func GetStripeConfigPublic() (*StripeConfig, error) {
	return getStripeConfig()
}

// CreateStripeCheckoutSessionPublic expose la création de session Stripe pour d'autres packages
func CreateStripeCheckoutSessionPublic(cfg *StripeConfig, itemID, userID int64, title string, amountCents int64, currency string) (*StripeCheckoutSessionPublic, error) {
	session, err := createStripeCheckoutSession(cfg, itemID, userID, title, amountCents, currency)
	if err != nil {
		return nil, err
	}
	return &StripeCheckoutSessionPublic{ID: session.ID, URL: session.URL}, nil
}

// StripeCheckoutSessionPublic est le type exposé publiquement
type StripeCheckoutSessionPublic struct {
	ID  string
	URL string
}

func fetchStripeCheckoutSession(cfg *StripeConfig, sessionID string) (*stripeCheckoutSession, error) {
	cleanID := strings.TrimSpace(sessionID)
	if cleanID == "" {
		return nil, fmt.Errorf("missing checkout session id")
	}

	req, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/checkout/sessions/"+url.PathEscape(cleanID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.SecretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("stripe checkout fetch failed: %s", strings.TrimSpace(string(body)))
	}

	var session stripeCheckoutSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, err
	}
	if strings.TrimSpace(session.ID) == "" {
		return nil, fmt.Errorf("invalid stripe session response")
	}

	return &session, nil
}

type stripeWebhookEvent struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Data struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

type stripeWebhookCheckoutSession struct {
	ID            string            `json:"id"`
	PaymentIntent string            `json:"payment_intent"`
	Metadata      map[string]string `json:"metadata"`
}

func verifyStripeSignature(payload []byte, signatureHeader, webhookSecret string) error {
	parts := strings.Split(signatureHeader, ",")
	if len(parts) == 0 {
		return fmt.Errorf("missing stripe signature")
	}

	var ts string
	var signatures []string
	for _, part := range parts {
		piece := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(piece) != 2 {
			continue
		}
		switch piece[0] {
		case "t":
			ts = piece[1]
		case "v1":
			signatures = append(signatures, piece[1])
		}
	}
	if ts == "" || len(signatures) == 0 {
		return fmt.Errorf("invalid stripe signature header")
	}

	tsInt, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid stripe signature timestamp")
	}
	if time.Since(time.Unix(tsInt, 0)) > 5*time.Minute {
		return fmt.Errorf("stripe signature timestamp too old")
	}

	signedPayload := ts + "." + string(payload)
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(signedPayload))
	expected := hex.EncodeToString(mac.Sum(nil))

	for _, sig := range signatures {
		if hmac.Equal([]byte(expected), []byte(sig)) {
			return nil
		}
	}

	return fmt.Errorf("stripe signature mismatch")
}

// VerifyStripeSignaturePublic expose la vérification de signature Stripe pour d'autres packages
func VerifyStripeSignaturePublic(payload []byte, signatureHeader, webhookSecret string) error {
	return verifyStripeSignature(payload, signatureHeader, webhookSecret)
}

// RetrieveStripeEventSession interroge l'API Stripe pour obtenir le payment_status d'une session de checkout
func RetrieveStripeEventSession(secretKey, sessionID string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/checkout/sessions/"+url.PathEscape(sessionID), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+secretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("stripe retrieve session failed: %s", strings.TrimSpace(string(body)))
	}

	var session struct {
		PaymentStatus string `json:"payment_status"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return "", err
	}
	return session.PaymentStatus, nil
}

type StripeEventSessionDetails struct {
	PaymentStatus string
	EventID       int64
	UserID        int64
	PaymentIntent string
}

func RetrieveStripeEventSessionDetails(secretKey, sessionID string) (*StripeEventSessionDetails, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.stripe.com/v1/checkout/sessions/"+url.PathEscape(sessionID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+secretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("stripe retrieve session failed: %s", strings.TrimSpace(string(body)))
	}

	var session struct {
		PaymentStatus string            `json:"payment_status"`
		PaymentIntent string            `json:"payment_intent"`
		Metadata      map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, err
	}

	details := &StripeEventSessionDetails{
		PaymentStatus: session.PaymentStatus,
		PaymentIntent: session.PaymentIntent,
	}
	if raw := strings.TrimSpace(session.Metadata["event_id"]); raw != "" {
		if parsed, parseErr := strconv.ParseInt(raw, 10, 64); parseErr == nil {
			details.EventID = parsed
		}
	}
	if raw := strings.TrimSpace(session.Metadata["user_id"]); raw != "" {
		if parsed, parseErr := strconv.ParseInt(raw, 10, 64); parseErr == nil {
			details.UserID = parsed
		}
	}

	return details, nil
}

// CreateStripeEventCheckoutSessionPublic crée une session Stripe pour un paiement d'événement
func CreateStripeEventCheckoutSessionPublic(cfg *StripeConfig, eventID, userID int64, title string, amountCents int64) (*StripeCheckoutSessionPublic, error) {
	if amountCents <= 0 {
		return nil, fmt.Errorf("invalid amount")
	}

	form := url.Values{}
	form.Set("mode", "payment")
	form.Set("success_url", cfg.SuccessURL)
	form.Set("cancel_url", cfg.CancelURL)
	form.Set("metadata[event_id]", strconv.FormatInt(eventID, 10))
	form.Set("metadata[user_id]", strconv.FormatInt(userID, 10))
	form.Set("line_items[0][quantity]", "1")
	form.Set("line_items[0][price_data][currency]", "eur")
	form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(amountCents, 10))
	form.Set("line_items[0][price_data][product_data][name]", title)

	req, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.SecretKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("stripe checkout creation failed: %s", strings.TrimSpace(string(body)))
	}

	var session stripeCheckoutSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, err
	}
	if strings.TrimSpace(session.ID) == "" || strings.TrimSpace(session.URL) == "" {
		return nil, fmt.Errorf("invalid stripe session response")
	}
	return &StripeCheckoutSessionPublic{ID: session.ID, URL: session.URL}, nil
}

// GetStripePaymentIntentFromSessionPublic retrieves the payment intent ID for a given session
func GetStripePaymentIntentFromSessionPublic(cfg *StripeConfig, sessionID string) (string, error) {
	session, err := fetchStripeCheckoutSession(cfg, sessionID)
	if err != nil {
		return "", err
	}
	if session.PaymentIntent == "" {
		return "", fmt.Errorf("no payment intent found in session")
	}
	return session.PaymentIntent, nil
}

// RefundStripePaymentIntentPublic issues a full refund for a given payment intent
func RefundStripePaymentIntentPublic(cfg *StripeConfig, paymentIntentID string) (string, error) {
	form := url.Values{}
	form.Set("payment_intent", paymentIntentID)

	req, err := http.NewRequest(http.MethodPost, "https://api.stripe.com/v1/refunds", strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+cfg.SecretKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("stripe refund failed: %s", strings.TrimSpace(string(body)))
	}

	var refundRes struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &refundRes); err != nil {
		return "", err
	}
	return refundRes.ID, nil
}
