package main

import (
	"fmt"
	"math"
	"strings"
)

// Unités de temps estimé (codes stables API / formulaire).
const (
	estTimeUnitMinute   = "minute"
	estTimeUnitHour     = "heure"
	estTimeUnitHalfDay  = "demi_journee"
	estTimeUnitDay      = "jour"
	estTimeUnitWeek     = "semaine"
	estTimeUnitMonth    = "mois"
	estTimeUnitYear     = "annee"
)

// Minutes par unité (référentiel pour agrégations / statistiques).
const (
	minutesPerHour    int64 = 60
	minutesPerHalfDay int64 = 240  // demi-journée = 4 h
	minutesPerDay     int64 = 1440 // 24 h
	minutesPerWeek    int64 = 10080
	minutesPerMonth   int64 = 43200  // 30 jours
	minutesPerYear    int64 = 525600 // 365 jours
)

const maxEstimatedTimeMinutes int64 = 100 * minutesPerYear

var validEstimatedTimeUnits = map[string]int64{
	estTimeUnitMinute:  1,
	estTimeUnitHour:    minutesPerHour,
	estTimeUnitHalfDay: minutesPerHalfDay,
	estTimeUnitDay:     minutesPerDay,
	estTimeUnitWeek:    minutesPerWeek,
	estTimeUnitMonth:   minutesPerMonth,
	estTimeUnitYear:    minutesPerYear,
}

func normalizeEstimatedTimeUnit(raw string) string {
	u := strings.ToLower(strings.TrimSpace(raw))
	u = strings.ReplaceAll(u, "-", "_")
	u = strings.ReplaceAll(u, " ", "_")
	switch u {
	case "minute", "minutes", "min":
		return estTimeUnitMinute
	case "heure", "heures", "hour", "hours", "h":
		return estTimeUnitHour
	case "demi_journee", "demi_journée", "demi_journees", "half_day", "halfday":
		return estTimeUnitHalfDay
	case "jour", "jours", "day", "days", "d":
		return estTimeUnitDay
	case "semaine", "semaines", "week", "weeks", "w":
		return estTimeUnitWeek
	case "mois", "month", "months":
		return estTimeUnitMonth
	case "annee", "année", "annees", "années", "year", "years", "y":
		return estTimeUnitYear
	default:
		return ""
	}
}

func estimatedTimeToMinutes(value float64, unit string) (int64, string, error) {
	if value <= 0 || math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, "", fmt.Errorf("estimatedTimeValue must be greater than 0")
	}
	if value > 1_000_000 {
		return 0, "", fmt.Errorf("estimatedTimeValue is too large")
	}
	normUnit := normalizeEstimatedTimeUnit(unit)
	if normUnit == "" {
		return 0, "", fmt.Errorf("invalid estimatedTimeUnit")
	}
	mult, ok := validEstimatedTimeUnits[normUnit]
	if !ok {
		return 0, "", fmt.Errorf("invalid estimatedTimeUnit")
	}
	minutes := int64(math.Round(value * float64(mult)))
	if minutes <= 0 {
		return 0, "", fmt.Errorf("estimated time is too small")
	}
	if minutes > maxEstimatedTimeMinutes {
		return 0, "", fmt.Errorf("estimated time exceeds maximum allowed")
	}
	return minutes, formatEstimatedTimeLabel(value, normUnit), nil
}

func formatEstimatedTimeLabel(value float64, unit string) string {
	v := formatEstimatedTimeNumber(value)
	switch unit {
	case estTimeUnitMinute:
		if value == 1 {
			return "1 minute"
		}
		return v + " minutes"
	case estTimeUnitHour:
		if value == 1 {
			return "1 h"
		}
		return v + " h"
	case estTimeUnitHalfDay:
		if value == 1 {
			return "1 demi-journée"
		}
		return v + " demi-journées"
	case estTimeUnitDay:
		if value == 1 {
			return "1 jour"
		}
		return v + " jours"
	case estTimeUnitWeek:
		if value == 1 {
			return "1 semaine"
		}
		return v + " semaines"
	case estTimeUnitMonth:
		if value == 1 {
			return "1 mois"
		}
		return v + " mois"
	case estTimeUnitYear:
		if value == 1 {
			return "1 an"
		}
		return v + " ans"
	default:
		return v
	}
}

func formatEstimatedTimeNumber(value float64) string {
	if math.Mod(value, 1) == 0 {
		return fmt.Sprintf("%d", int64(value))
	}
	s := fmt.Sprintf("%.2f", value)
	s = strings.TrimRight(strings.TrimRight(s, "0"), ".")
	return strings.ReplaceAll(s, ".", ",")
}

// resolveEstimatedTime calcule minutes + libellé à partir de value/unit ; vide si non renseigné.
func resolveEstimatedTime(meta *ConseilMetaPayload) error {
	if meta == nil {
		return nil
	}
	unit := normalizeEstimatedTimeUnit(meta.EstimatedTimeUnit)
	hasValue := meta.EstimatedTimeValue != nil && *meta.EstimatedTimeValue > 0

	if !hasValue && unit == "" {
		meta.estimatedTimeMinutes = 0
		meta.EstimatedTime = ""
		meta.estimatedTimeValueStored = 0
		meta.EstimatedTimeUnit = ""
		return nil
	}
	if !hasValue {
		return fmt.Errorf("estimatedTimeValue is required when estimatedTimeUnit is set")
	}
	if unit == "" {
		return fmt.Errorf("estimatedTimeUnit is required when estimatedTimeValue is set")
	}
	minutes, label, err := estimatedTimeToMinutes(*meta.EstimatedTimeValue, unit)
	if err != nil {
		return err
	}
	meta.estimatedTimeMinutes = minutes
	meta.EstimatedTime = label
	meta.estimatedTimeValueStored = *meta.EstimatedTimeValue
	meta.EstimatedTimeUnit = unit
	return nil
}

func conseilContentRowFromMeta(payload ConseilMetaPayload) conseilContentRow {
	return conseilContentRow{
		ContentType:          "conseil",
		Category:             payload.Category,
		TargetAudienceJSON:   encodeStringArrayJSON(payload.TargetAudience),
		DifficultyLevel:      payload.DifficultyLevel,
		EstimatedTime:        payload.EstimatedTime,
		EstimatedTimeMinutes: payload.estimatedTimeMinutes,
		EstimatedTimeValue:   payload.estimatedTimeValueStored,
		EstimatedTimeUnit:    payload.EstimatedTimeUnit,
		MaterialsJSON:        encodeStringArrayJSON(payload.Materials),
		SafetyTips:           payload.SafetyTips,
		Summary:              payload.Summary,
		TagsJSON:             encodeStringArrayJSON(payload.Tags),
		ExternalURL:          payload.ExternalUrl,
	}
}

func appendEstimatedTimeToMap(m map[string]interface{}, row conseilContentRow) {
	m["estimatedTime"] = row.EstimatedTime
	if row.EstimatedTimeMinutes > 0 {
		m["estimatedTimeMinutes"] = row.EstimatedTimeMinutes
		m["estimatedTimeValue"] = row.EstimatedTimeValue
		m["estimatedTimeUnit"] = row.EstimatedTimeUnit
	} else {
		m["estimatedTimeMinutes"] = nil
		m["estimatedTimeValue"] = nil
		m["estimatedTimeUnit"] = ""
	}
}
