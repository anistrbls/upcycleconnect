package mailer

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"mime"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Host        string
	Port        int
	Username    string
	Password    string
	FromEmail   string
	FromName    string
	ReplyTo     string
	UseTLS      bool
	StartTLS    bool
	SkipVerify  bool
	Timeout     time.Duration
	ServiceName string
}

type Message struct {
	To      []string
	Subject string
	Text    string
}

func ConfigFromEnv() Config {
	port := envInt("SMTP_PORT", 587)
	useTLS := envBool("SMTP_TLS", port == 465)
	return Config{
		Host:        strings.TrimSpace(os.Getenv("SMTP_HOST")),
		Port:        port,
		Username:    strings.TrimSpace(firstEnv("SMTP_USERNAME", "SMTP_USER")),
		Password:    strings.TrimSpace(os.Getenv("SMTP_PASSWORD")),
		FromEmail:   strings.TrimSpace(firstEnv("SMTP_FROM_EMAIL", "SMTP_FROM")),
		FromName:    strings.TrimSpace(envDefault("SMTP_FROM_NAME", "UpcycleConnect")),
		ReplyTo:     strings.TrimSpace(os.Getenv("SMTP_REPLY_TO")),
		UseTLS:      useTLS,
		StartTLS:    envBool("SMTP_STARTTLS", !useTLS),
		SkipVerify:  envBool("SMTP_SKIP_VERIFY", false),
		Timeout:     time.Duration(envInt("SMTP_TIMEOUT_SECONDS", 15)) * time.Second,
		ServiceName: strings.TrimSpace(envDefault("SMTP_HELO_NAME", "upcycleconnect")),
	}
}

func (c Config) Configured() bool {
	return strings.TrimSpace(c.Host) != "" && strings.TrimSpace(c.FromEmail) != ""
}

func (c Config) PublicStatus() map[string]any {
	return map[string]any{
		"configured":  c.Configured(),
		"host":        c.Host,
		"port":        c.Port,
		"usernameSet": c.Username != "",
		"fromEmail":   c.FromEmail,
		"fromName":    c.FromName,
		"replyTo":     c.ReplyTo,
		"useTLS":      c.UseTLS,
		"startTLS":    c.StartTLS,
		"skipVerify":  c.SkipVerify,
		"timeoutSec":  int(c.Timeout / time.Second),
	}
}

func ValidateAddress(address string) error {
	_, err := mail.ParseAddress(strings.TrimSpace(address))
	return err
}

func Send(ctx context.Context, cfg Config, msg Message) error {
	if !cfg.Configured() {
		return fmt.Errorf("smtp is not configured")
	}
	if cfg.Port <= 0 {
		return fmt.Errorf("invalid smtp port")
	}
	if _, err := mail.ParseAddress(cfg.FromEmail); err != nil {
		return fmt.Errorf("invalid smtp sender: %w", err)
	}
	recipients, err := cleanRecipients(msg.To)
	if err != nil {
		return err
	}

	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	deadline := time.Now().Add(timeout)
	if ctxDeadline, ok := ctx.Deadline(); ok && ctxDeadline.Before(deadline) {
		deadline = ctxDeadline
	}

	addr := net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port))
	dialer := &net.Dialer{Timeout: timeout}
	var conn net.Conn
	if cfg.UseTLS {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsConfig(cfg))
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("smtp connection failed: %w", err)
	}
	defer conn.Close()
	_ = conn.SetDeadline(deadline)

	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client failed: %w", err)
	}
	defer client.Close()

	if helo := strings.TrimSpace(cfg.ServiceName); helo != "" {
		if err := client.Hello(helo); err != nil {
			return fmt.Errorf("smtp hello failed: %w", err)
		}
	}

	if cfg.StartTLS && !cfg.UseTLS {
		ok, _ := client.Extension("STARTTLS")
		if !ok {
			return fmt.Errorf("smtp server does not support STARTTLS")
		}
		if err := client.StartTLS(tlsConfig(cfg)); err != nil {
			return fmt.Errorf("smtp starttls failed: %w", err)
		}
	}

	if cfg.Username != "" {
		if cfg.Password == "" {
			return fmt.Errorf("smtp password is required when username is set")
		}
		if err := client.Auth(smtp.PlainAuth("", cfg.Username, cfg.Password, cfg.Host)); err != nil {
			return fmt.Errorf("smtp authentication failed: %w", err)
		}
	}

	if err := client.Mail(cfg.FromEmail); err != nil {
		return fmt.Errorf("smtp sender rejected: %w", err)
	}
	for _, to := range recipients {
		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("smtp recipient %q rejected: %w", to, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data failed: %w", err)
	}
	if _, err := io.WriteString(w, buildMessage(cfg, recipients, msg)); err != nil {
		_ = w.Close()
		return fmt.Errorf("smtp write failed: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp send failed: %w", err)
	}
	if err := client.Quit(); err != nil {
		return fmt.Errorf("smtp quit failed: %w", err)
	}
	return nil
}

func cleanRecipients(values []string) ([]string, error) {
	recipients := make([]string, 0, len(values))
	for _, value := range values {
		parsed, err := mail.ParseAddress(strings.TrimSpace(value))
		if err != nil {
			return nil, fmt.Errorf("invalid recipient address: %w", err)
		}
		recipients = append(recipients, parsed.Address)
	}
	if len(recipients) == 0 {
		return nil, fmt.Errorf("at least one recipient is required")
	}
	return recipients, nil
}

func buildMessage(cfg Config, recipients []string, msg Message) string {
	from := (&mail.Address{Name: cfg.FromName, Address: cfg.FromEmail}).String()
	headers := []string{
		"From: " + from,
		"To: " + strings.Join(recipients, ", "),
		"Subject: " + mime.QEncoding.Encode("UTF-8", strings.TrimSpace(msg.Subject)),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"Date: " + time.Now().Format(time.RFC1123Z),
	}
	if cfg.ReplyTo != "" {
		headers = append(headers, "Reply-To: "+cfg.ReplyTo)
	}
	body := strings.ReplaceAll(msg.Text, "\r\n", "\n")
	body = strings.ReplaceAll(body, "\r", "\n")
	body = strings.ReplaceAll(body, "\n", "\r\n")
	return strings.Join(headers, "\r\n") + "\r\n\r\n" + body + "\r\n"
}

func tlsConfig(cfg Config) *tls.Config {
	return &tls.Config{
		ServerName:         cfg.Host,
		InsecureSkipVerify: cfg.SkipVerify,
		MinVersion:         tls.VersionTLS12,
	}
}

func envDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := os.Getenv(key); value != "" {
			return value
		}
	}
	return ""
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envBool(key string, fallback bool) bool {
	switch strings.TrimSpace(strings.ToLower(os.Getenv(key))) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	case "":
		return fallback
	default:
		return fallback
	}
}
