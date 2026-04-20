package items

import (
	"fmt"
	"math"
	"strings"
)

const (
	minWeightGrams = 0.001
	maxWeightGrams = 10000000.0 // 10 000 kg
)

type normalizedWeight struct {
	HasWeight  bool
	InputValue float64
	InputUnit  string
	Grams      float64
}

func roundTo(v float64, decimals int) float64 {
	pow := math.Pow(10, float64(decimals))
	return math.Round(v*pow) / pow
}

func hasMoreThan3Decimals(v float64) bool {
	rounded := roundTo(v, 3)
	return math.Abs(v-rounded) > 1e-9
}

func normalizeWeightInput(value *float64, unit string) (normalizedWeight, error) {
	cleanUnit := strings.ToLower(strings.TrimSpace(unit))
	hasValue := value != nil
	hasUnit := cleanUnit != ""

	if !hasValue && !hasUnit {
		return normalizedWeight{HasWeight: false}, nil
	}
	if hasValue != hasUnit {
		return normalizedWeight{}, fmt.Errorf("weight value and unit must be provided together")
	}

	if cleanUnit != "mg" && cleanUnit != "g" && cleanUnit != "kg" {
		return normalizedWeight{}, fmt.Errorf("weight unit must be one of: mg, g, kg")
	}

	v := *value
	if math.IsNaN(v) || math.IsInf(v, 0) {
		return normalizedWeight{}, fmt.Errorf("weight value must be numeric")
	}
	if v <= 0 {
		return normalizedWeight{}, fmt.Errorf("weight value must be greater than 0")
	}
	if hasMoreThan3Decimals(v) {
		return normalizedWeight{}, fmt.Errorf("weight value supports max 3 decimals")
	}
	v = roundTo(v, 3)

	grams := v
	switch cleanUnit {
	case "mg":
		grams = v / 1000.0
	case "kg":
		grams = v * 1000.0
	}
	grams = roundTo(grams, 3)

	if grams < minWeightGrams {
		return normalizedWeight{}, fmt.Errorf("weight is below minimum allowed (1 mg)")
	}
	if grams > maxWeightGrams {
		return normalizedWeight{}, fmt.Errorf("weight exceeds maximum allowed (10 000 kg)")
	}

	return normalizedWeight{
		HasWeight:  true,
		InputValue: v,
		InputUnit:  cleanUnit,
		Grams:      grams,
	}, nil
}
