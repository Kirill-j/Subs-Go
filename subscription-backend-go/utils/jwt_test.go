package utils

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestJWT(t *testing.T) {
	os.Setenv("JWT_SECRET", "test_secret")
	userID := uint(1)

	token, err := GenerateToken(userID)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	parsedToken, err := ValidateToken(token)
	assert.NoError(t, err)
	assert.True(t, parsedToken.Valid)
}
