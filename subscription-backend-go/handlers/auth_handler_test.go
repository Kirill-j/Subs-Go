package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRegisterHandler(t *testing.T) {
	router := SetupTestRouter()
	router.POST("/register", Register)

	// 1. Тест успешной регистрации
	userJSON := `{"phoneNumber": "+7999-000-00-00", "password": "password123", "name": "Test User"}`
	req, _ := http.NewRequest("POST", "/register", bytes.NewBufferString(userJSON))
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)
	assert.Contains(t, resp.Body.String(), "success")

	// 2. Тест дубликата (должен вернуть ошибку)
	req2, _ := http.NewRequest("POST", "/register", bytes.NewBufferString(userJSON))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)

	assert.Equal(t, http.StatusInternalServerError, resp2.Code)
}

func TestLoginHandler(t *testing.T) {
	router := SetupTestRouter()
	router.POST("/login", Login)

	// Создаем юзера в базе
	user, _ := CreateTestUserAndToken(t)

	// 1. Успешный вход
	loginJSON := `{"phoneNumber": "` + user.PhoneNumber + `", "password": "password123"}`
	req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(loginJSON))
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 2. Неверный пароль (для покрытия веток ошибок)
	wrongJSON := `{"phoneNumber": "` + user.PhoneNumber + `", "password": "wrong"}`
	req2, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(wrongJSON))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusUnauthorized, resp2.Code)
}

func TestUserAuthFlow(t *testing.T) {
	router := SetupTestRouter()
	router.POST("/login", Login)

	// 1. Создаем реального юзера в тестовой БД
	user, token := CreateTestUserAndToken(t)

	// 2. ТЕСТ: Успешный логин (Happy Path)
	loginJSON := `{"phoneNumber": "` + user.PhoneNumber + `", "password": "password123"}`
	req, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(loginJSON))
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 3. ТЕСТ: Логин с несуществующим номером (ВОТ ТО, ЧТО ТЫ СПРАШИВАЛ)
	// Это покроет ветку "record not found" в Login
	noUserJSON := `{"phoneNumber": "+70000000000", "password": "123"}`
	req2, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(noUserJSON))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusUnauthorized, resp2.Code)

	// 4. ТЕСТ: Логин с неверным паролем
	// Это покроет ветку CheckPasswordHash == false
	wrongPassJSON := `{"phoneNumber": "` + user.PhoneNumber + `", "password": "wrongpassword"}`
	req3, _ := http.NewRequest("POST", "/login", bytes.NewBufferString(wrongPassJSON))
	resp3 := httptest.NewRecorder()
	router.ServeHTTP(resp3, req3)
	assert.Equal(t, http.StatusUnauthorized, resp3.Code)

	// 5. ТЕСТ: GetMe (Проверка получения своего профиля)
	router.GET("/api/users/me", func(c *gin.Context) {
		c.Set("userID", user.ID)
		GetMe(c)
	})
	req4, _ := http.NewRequest("GET", "/api/users/me", nil)
	req4.Header.Set("Authorization", "Bearer "+token)
	resp4 := httptest.NewRecorder()
	router.ServeHTTP(resp4, req4)
	assert.Equal(t, http.StatusOK, resp4.Code)
}

func TestUpdateProfileFlow(t *testing.T) {
	router := SetupTestRouter()
	user, token := CreateTestUserAndToken(t)

	// Настраиваем роут для обновления профиля
	router.PUT("/api/users/update", func(c *gin.Context) {
		c.Set("userID", user.ID)
		UpdateProfile(c)
	})

	// 1. ТЕСТ: Успешное обновление имени и телефона
	updateJSON := `{"name": "New Cool Name", "phoneNumber": "+71112223344"}`
	req, _ := http.NewRequest("PUT", "/api/users/update", bytes.NewBufferString(updateJSON))
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 2. ТЕСТ: Ошибка парсинга JSON (для покрытия ветки ShouldBindJSON)
	req2, _ := http.NewRequest("PUT", "/api/users/update", bytes.NewBufferString(`{invalid:json}`))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusBadRequest, resp2.Code)
}

func TestUpdateProfileWithPassword(t *testing.T) {
	router := SetupTestRouter()
	user, token := CreateTestUserAndToken(t)

	router.PUT("/api/users/update", func(c *gin.Context) {
		c.Set("userID", user.ID)
		UpdateProfile(c)
	})

	// Тестируем смену пароля (это закроет сложную ветку в коде)
	updateJSON := `{"name": "Ivan", "password": "newpassword123"}`
	req, _ := http.NewRequest("PUT", "/api/users/update", bytes.NewBufferString(updateJSON))
	req.Header.Set("Authorization", "Bearer "+token)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)
}
