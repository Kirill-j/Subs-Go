package handlers

import (
	"fmt"
	"subscription-backend-go/config"
	"subscription-backend-go/models"
	"subscription-backend-go/utils"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	db, _ := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	db.AutoMigrate(&models.User{}, &models.Subscription{})
	config.DB = db
	return r
}

func CreateTestUserAndToken(t *testing.T) (models.User, string) {
	// Уникальный номер, чтобы тесты не падали из-за дубликатов в базе
	phone := fmt.Sprintf("+7999%d", time.Now().UnixNano()%1000000)
	hashedPassword, _ := utils.HashPassword("password123")

	user := models.User{
		PhoneNumber: phone,
		Password:    hashedPassword,
		Name:        "Test User",
	}
	config.DB.Create(&user)

	token, _ := utils.GenerateToken(user.ID)
	return user, token // ВОЗВРАЩАЕМ ДВА ЗНАЧЕНИЯ
}
