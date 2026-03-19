package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPasswordHashing(t *testing.T) {
	password := "secret123"

	hash, err := HashPassword(password)
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)

	// Проверка правильного пароля
	assert.True(t, CheckPasswordHash(password, hash))

	// Проверка неверного пароля
	assert.False(t, CheckPasswordHash("wrong_pass", hash))
}
