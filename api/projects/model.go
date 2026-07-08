package projects

import "time"

const (
	StatusDraft     = "brouillon"
	StatusPublished = "publie"
)

// ProjectStep représente une étape de réalisation d'un projet.
type ProjectStep struct {
	Text     string `json:"text"`
	ImageURL string `json:"imageUrl,omitempty"`
}

// Project représente un projet d'upcycling créé par un professionnel.
type Project struct {
	ID                     int64     `json:"id"`
	ProUserID              int64     `json:"proUserId"`
	ProDisplayName         string    `json:"proDisplayName,omitempty"`
	ProCompanyName         string    `json:"companyName,omitempty"`
	ProJoinedAt            time.Time `json:"proJoinedAt,omitempty"`
	ProTotalUCScore   float64   `json:"proTotalUCScore"`
	ProProjectsSinceSignup int  `json:"proProjectsSinceSignup"`
	PreviewImage      string    `json:"previewImage,omitempty"`
	BeforeImage       string    `json:"beforeImage,omitempty"`
	AfterImage        string    `json:"afterImage,omitempty"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Steps             []ProjectStep `json:"steps,omitempty"`
	Category          string    `json:"category"`
	Status            string    `json:"status"`
	ModerationStatus  string    `json:"moderationStatus"` // pending | approved | rejected
	ModerationNote    string    `json:"moderationNote,omitempty"`
	ItemCount         int       `json:"itemCount"`
	TotalWeightGrams  float64   `json:"totalWeightGrams"`
	TotalWeightKg     float64   `json:"totalWeightKg"`
	UpcyclingScore    float64   `json:"upcyclingScore"`
	LikeCount         int       `json:"likeCount"`
	BookmarkCount     int       `json:"bookmarkCount"`
	IsLiked           bool      `json:"isLiked"`
	IsBookmarked      bool      `json:"isBookmarked"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
	Featured          bool       `json:"featured"`
	FeaturedUntil     *time.Time `json:"featuredUntil,omitempty"`
	BumpedAt          *time.Time `json:"bumpedAt,omitempty"`
}

// ProjectItem représente un objet récupéré associé à un projet.
type ProjectItem struct {
	ID          int64     `json:"id"`
	ProjectID   int64     `json:"projectId"`
	ItemID      int64     `json:"itemId"`
	ItemTitle   string    `json:"itemTitle,omitempty"`
	ItemImage   string    `json:"itemImage,omitempty"`
	Material    string    `json:"material,omitempty"`
	WeightValue *float64  `json:"weightValue,omitempty"`
	WeightUnit  string    `json:"weightUnit,omitempty"`
	WeightGrams *float64  `json:"weightGrams,omitempty"`
	AddedAt     time.Time `json:"addedAt"`
}

// ProjectImage représente une image associée à un projet.
type ProjectImage struct {
	ID        int64     `json:"id"`
	ProjectID int64     `json:"projectId"`
	URL       string    `json:"url"`
	ImageType string    `json:"imageType"` // avant | apres | autre
	AddedAt   time.Time `json:"addedAt"`
}

// ProSummary représente les infos consolidées d'un professionnel pour l'admin.
type ProSummary struct {
	UserID                  int64     `json:"userId"`
	FullName                string    `json:"fullName"`
	CompanyName             string    `json:"companyName"`
	TotalUCScore            float64   `json:"totalUCScore"`
	TotalProjectsSinceSignup int      `json:"totalProjectsSinceSignup"`
	JoinedAt                time.Time `json:"joinedAt"`
}

// ProjectLiker décrit un utilisateur ayant aimé un projet (vue propriétaire).
type ProjectLiker struct {
	UserID      int64  `json:"userId"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}

// ProjectAnalytics représente les statistiques de diffusion d'un projet.
type ProjectAnalytics struct {
	ImpressionCount      int64   `json:"impressionCount"`
	ClickCount           int64   `json:"clickCount"`
	LikeCount            int64   `json:"likeCount"`
	BookmarkCount        int64   `json:"bookmarkCount"`
	LikeConversionPct    float64 `json:"likeConversionPct"`
	BookmarkConversionPct float64 `json:"bookmarkConversionPct"`
}

// CreatePayload est le corps de requête pour créer un projet.
type CreatePayload struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Steps       []ProjectStep `json:"steps"`
	Category    string `json:"category"`
	Status      string `json:"status"`
}

// UpdatePayload est le corps de requête pour modifier un projet.
type UpdatePayload struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Steps       *[]ProjectStep `json:"steps,omitempty"`
	Category    string `json:"category"`
	Status      string `json:"status"`
}
