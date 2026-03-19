package middleware

import (
	"net/http"
	"net/http/httptest"
	"subscription-backend-go/utils"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAuthRequiredMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(AuthRequired())
	r.GET("/test", func(c *gin.Context) { c.Status(200) })

	// 1. Нет токена (401)
	req, _ := http.NewRequest("GET", "/test", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusUnauthorized, resp.Code)

	// 2. Валидный токен (200)
	token, _ := utils.GenerateToken(1)
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	resp2 := httptest.NewRecorder()
	r.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusOK, resp2.Code)
}
