package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCORSMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORSMiddleware())
	r.GET("/ping", func(c *gin.Context) { c.Status(200) })

	// Тестируем OPTIONS запрос (Preflight)
	req, _ := http.NewRequest("OPTIONS", "/ping", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusNoContent, resp.Code)
	assert.Equal(t, "http://localhost:3000", resp.Header().Get("Access-Control-Allow-Origin"))
}

func TestSetupRouter(t *testing.T) {
	r := SetupRouter()
	assert.NotNil(t, r)
}
