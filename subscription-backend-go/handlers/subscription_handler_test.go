package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"subscription-backend-go/config"
	"subscription-backend-go/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSubscriptionCRUD(t *testing.T) {
	// 1. Инициализируем роутер и базу
	router := SetupTestRouter()

	// Имитируем защищенную группу роутов
	protected := router.Group("/api")
	protected.Use(func(c *gin.Context) {
		c.Set("userID", uint(1)) // Принудительно ставим ID пользователя = 1
		c.Next()
	})
	{
		protected.POST("/subscription/add", CreateSubscription)
		protected.GET("/subscription", GetSubscriptions)
	}

	// 2. ТЕСТ: Успешное создание подписки
	subJSON := `{"name": "Netflix", "cost": 10.99, "startDate": "2026-01-01", "period": "MONTHLY"}`
	req, _ := http.NewRequest("POST", "/api/subscription/add", bytes.NewBufferString(subJSON))
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusCreated, resp.Code)
	assert.Contains(t, resp.Body.String(), "Netflix")

	// 3. ТЕСТ: Ошибка (неверный формат даты) - ДАЕТ ПЛЮС К ПОКРЫТИЮ
	badDateJSON := `{"name": "Spotify", "cost": 5.0, "startDate": "01-01-2026", "period": "MONTHLY"}`
	req2, _ := http.NewRequest("POST", "/api/subscription/add", bytes.NewBufferString(badDateJSON))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)

	// Здесь код может вернуть 400 или 500 в зависимости от твоей реализации
	assert.NotEqual(t, http.StatusCreated, resp2.Code)

	// 4. ТЕСТ: Получение списка подписок
	req3, _ := http.NewRequest("GET", "/api/subscription", nil)
	resp3 := httptest.NewRecorder()
	router.ServeHTTP(resp3, req3)

	assert.Equal(t, http.StatusOK, resp3.Code)
	assert.Contains(t, resp3.Body.String(), "subscriptions")
}

func TestSubscriptionExtended(t *testing.T) {
	router := SetupTestRouter()

	// Имитируем userID = 1
	router.Use(func(c *gin.Context) {
		c.Set("userID", uint(1))
		c.Next()
	})

	router.POST("/api/subscription/add", CreateSubscription)
	router.PUT("/api/subscription/edit/:id", UpdateSubscription)
	router.DELETE("/api/subscription/:id", DeleteSubscription)

	// 1. Создаем подписку
	subJSON := `{"name": "Netflix", "cost": 500, "startDate": "2026-01-01", "period": "MONTHLY"}`
	req, _ := http.NewRequest("POST", "/api/subscription/add", bytes.NewBufferString(subJSON))
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	// Получаем ID созданной подписки из базы (SQLite)
	var sub models.Subscription
	config.DB.First(&sub)

	// 2. ТЕСТ: Update (Успех)
	updateJSON := `{"name": "Netflix Premium", "cost": 1000}`
	req, _ = http.NewRequest("PUT", "/api/subscription/edit/1", bytes.NewBufferString(updateJSON))
	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 3. ТЕСТ: Delete (Успех)
	req, _ = http.NewRequest("DELETE", "/api/subscription/1", nil)
	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 4. ТЕСТ: Delete (404 - когда подписки уже нет) - ПЛЮС К ПОКРЫТИЮ
	req, _ = http.NewRequest("DELETE", "/api/subscription/999", nil)
	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusNotFound, resp.Code)
}

func TestSubscriptionAdvanced(t *testing.T) {
	router := SetupTestRouter()
	userID := uint(1)
	router.Use(func(c *gin.Context) { c.Set("userID", userID); c.Next() })

	router.GET("/api/subscription", GetSubscriptions)
	router.POST("/api/subscription/add", CreateSubscription)

	// Добавляем тестовую подписку
	config.DB.Create(&models.Subscription{Name: "Netflix", Cost: 500, UserID: userID, Period: "MONTHLY", StartDate: time.Now()})

	// 1. ТЕСТ: Фильтр по имени (Покрытие веток фильтрации)
	req, _ := http.NewRequest("GET", "/api/subscription?name=Net&costMin=100&period=MONTHLY", nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)
	assert.Contains(t, resp.Body.String(), "Netflix")

	// 2. ТЕСТ: Сортировка DESC
	req, _ = http.NewRequest("GET", "/api/subscription?sort=desc", nil)
	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 3. ТЕСТ: Ошибка Create (Пропущенное поле "cost") -> Покрытие binding:"required"
	badSub := `{"name": "No Cost"}`
	req, _ = http.NewRequest("POST", "/api/subscription/add", bytes.NewBufferString(badSub))
	resp = httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusBadRequest, resp.Code)
}

func TestSubscriptionManagement(t *testing.T) {
	router := SetupTestRouter()
	user, _ := CreateTestUserAndToken(t)

	api := router.Group("/api")
	api.Use(func(c *gin.Context) {
		c.Set("userID", user.ID)
		c.Next()
	})
	{
		api.POST("/subscription/add", CreateSubscription)
		api.GET("/subscription", GetSubscriptions)
	}

	// Создаем ЕЖЕМЕСЯЧНУЮ подписку
	subJSON := `{"name": "Netflix", "cost": 100, "startDate": "2026-03-20", "period": "MONTHLY"}`
	req, _ := http.NewRequest("POST", "/api/subscription/add", bytes.NewBufferString(subJSON))
	router.ServeHTTP(httptest.NewRecorder(), req)

	// Вставляем сюда ЕЖЕГОДНУЮ (напрямую в базу для скорости)
	config.DB.Create(&models.Subscription{
		Name:      "Amazon Annual",
		Cost:      1200,
		UserID:    user.ID,
		Period:    "YEARLY",
		StartDate: time.Now(),
	})

	// Делаем GET запрос, который заберет ОБЕ подписки
	reqGet, _ := http.NewRequest("GET", "/api/subscription", nil)
	respGet := httptest.NewRecorder()
	router.ServeHTTP(respGet, reqGet)

	assert.Equal(t, http.StatusOK, respGet.Code)
	// Проверяем, что в ответе есть обе подписки и статистика посчитана
	assert.Contains(t, respGet.Body.String(), "Netflix")
	assert.Contains(t, respGet.Body.String(), "Amazon Annual")
	assert.Contains(t, respGet.Body.String(), "yearlyCount")
}

func TestUpdateSubscriptionFlow(t *testing.T) {
	router := SetupTestRouter()
	user, _ := CreateTestUserAndToken(t)

	// Создаем подписку через базу
	testSub := models.Subscription{
		Name:      "Old Name",
		Cost:      100,
		UserID:    user.ID,
		StartDate: time.Now(),
		Period:    "MONTHLY",
	}
	config.DB.Create(&testSub) // Теперь у testSub есть реальный ID

	router.PUT("/api/subscription/edit/:id", func(c *gin.Context) {
		c.Set("userID", user.ID)
		UpdateSubscription(c)
	})

	// 1. Успех: используем РЕАЛЬНЫЙ ID (testSub.ID)
	updJSON := `{"name": "New Name", "cost": 200, "startDate": "2026-05-01"}`
	url := fmt.Sprintf("/api/subscription/edit/%d", testSub.ID)
	req, _ := http.NewRequest("PUT", url, bytes.NewBufferString(updJSON))
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusOK, resp.Code)

	// 2. Ошибка: Подписка не найдена (ID 99999)
	req2, _ := http.NewRequest("PUT", "/api/subscription/edit/99999", bytes.NewBufferString(updJSON))
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusNotFound, resp2.Code)

	// 3. Ошибка: Кривая дата (должно быть 400)
	badDateJSON := `{"startDate": "01-01-2026"}`
	req3, _ := http.NewRequest("PUT", url, bytes.NewBufferString(badDateJSON))
	resp3 := httptest.NewRecorder()
	router.ServeHTTP(resp3, req3)
	assert.Equal(t, http.StatusBadRequest, resp3.Code)
}

func TestGetSubscriptionsFilters(t *testing.T) {
	router := SetupTestRouter()
	user, _ := CreateTestUserAndToken(t)

	// Добавим ежегодную подписку, чтобы закрыть ветку "Yearly" в статистике
	config.DB.Create(&models.Subscription{
		Name: "Amazon", Cost: 1200, UserID: user.ID, Period: "YEARLY", StartDate: time.Now(),
	})

	router.GET("/api/subscription", func(c *gin.Context) {
		c.Set("userID", user.ID)
		GetSubscriptions(c)
	})

	// Отправляем запрос СО ВСЕМИ фильтрами сразу
	url := "/api/subscription?name=Ama&costMin=100&costMax=2000&startDate=2020-01-01&endDate=2030-01-01&period=YEARLY"
	req, _ := http.NewRequest("GET", url, nil)
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusOK, resp.Code)
	assert.Contains(t, resp.Body.String(), "Amazon")
}

// Тест для CreateSubscription
func TestCreateSubscriptionErrors(t *testing.T) {
	router := SetupTestRouter()
	user, _ := CreateTestUserAndToken(t)

	router.POST("/add", func(c *gin.Context) {
		c.Set("userID", user.ID)
		CreateSubscription(c)
	})

	// 1. Ошибка EndDate (красная строка на скриншоте)
	badData := `{"name":"Test", "cost":10, "startDate":"2026-01-01", "endDate":"01-01-2026", "period":"MONTHLY"}`
	req, _ := http.NewRequest("POST", "/add", bytes.NewBufferString(badData))
	resp := httptest.NewRecorder()
	router.ServeHTTP(resp, req)
	assert.Equal(t, http.StatusBadRequest, resp.Code)

	// 2. Ошибка BindJSON (совсем кривой JSON)
	req2, _ := http.NewRequest("POST", "/add", bytes.NewBufferString(`{ "name": `)) // Незакрытая кавычка
	resp2 := httptest.NewRecorder()
	router.ServeHTTP(resp2, req2)
	assert.Equal(t, http.StatusBadRequest, resp2.Code)
}
