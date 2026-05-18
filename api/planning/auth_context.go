package planning

import (
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

const authClaimsContextKey = "authClaims"

func callerRoleFromRequest(r *http.Request) string {
	claims, _ := r.Context().Value(authClaimsContextKey).(jwt.MapClaims)
	role, _ := claims["role"].(string)
	return role
}
