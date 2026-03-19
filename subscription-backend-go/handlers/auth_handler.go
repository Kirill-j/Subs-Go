package handlers

import (
	"net/http"
	"subscription-backend-go/config"
	"subscription-backend-go/models"
	"subscription-backend-go/utils"

	"github.com/gin-gonic/gin"
)

// Register - функция регистрации
func Register(c *gin.Context) {
	var input struct {
		PhoneNumber string `json:"phoneNumber" binding:"required"`
		Password    string `json:"password" binding:"required"`
		Name        string `json:"name"`
	}

	// Читаем JSON из запроса
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные"})
		return
	}

	// Хешируем пароль
	hashedPassword, _ := utils.HashPassword(input.Password)

	user := models.User{
		PhoneNumber: input.PhoneNumber,
		Password:    hashedPassword,
		Name:        input.Name,
	}

	// Сохраняем в БД
	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Пользователь с таким номером уже существует"})
		return
	}

	// Генерируем токен
	token, _ := utils.GenerateToken(user.ID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"token":  token,
	})
}

// Login - вход пользователя
func Login(c *gin.Context) {
	var input struct {
		PhoneNumber string `json:"phoneNumber" binding:"required"`
		Password    string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Неверный формат данных"})
		return
	}

	var user models.User
	// Ищем пользователя в БД
	if err := config.DB.Where("phone_number = ?", input.PhoneNumber).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Неверный номер телефона или пароль"})
		return
	}

	// Проверяем хеш пароля
	if !utils.CheckPasswordHash(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Неверный номер телефона или пароль"})
		return
	}

	// Выпускаем JWT
	token, _ := utils.GenerateToken(user.ID)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"token":  token,
	})
}

// GetMe - получение данных профиля
func GetMe(c *gin.Context) {
	// Достаем userID
	userID, _ := c.Get("userID")

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateProfile - обновление данных пользователя
func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input struct {
		Name        string `json:"name"`
		PhoneNumber string `json:"phoneNumber"`
		Password    string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
		return
	}

	// Обновляем поля
	user.Name = input.Name
	user.PhoneNumber = input.PhoneNumber

	// Если передан пароль, хешируем его
	if input.Password != "" {
		hashedPassword, _ := utils.HashPassword(input.Password)
		user.Password = hashedPassword
	}

	// Сохраняем изменения
	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при обновлении (возможно, номер телефона уже занят)"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Профиль обновлен"})
}
