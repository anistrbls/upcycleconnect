package sirene

import (
	"fmt"
	"strings"
)

// NormalizeSiret removes spaces and checks that the SIRET is exactly 14 digits.
func NormalizeSiret(raw string) (string, error) {
	s := strings.ReplaceAll(strings.TrimSpace(raw), " ", "")
	if len(s) != 14 {
		return "", fmt.Errorf("le SIRET doit contenir exactement 14 chiffres")
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return "", fmt.Errorf("le SIRET ne doit contenir que des chiffres")
		}
	}
	return s, nil
}
