package middleware

import (
	"net/http"
	"strings"
	"subscription-backend-go/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Токен отсутствует"})
			c.Abort()
			return
		}

		// Формат заголовка обычно: Bearer <token>
		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)

		token, err := utils.ValidateToken(tokenString)
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Недействительный токен"})
			c.Abort()
			return
		}

		// Извлекаем user_id из токена и кладем его в контекст запроса
		claims, ok := token.Claims.(jwt.MapClaims)
		if ok && token.Valid {
			userID := uint(claims["user_id"].(float64))
			c.Set("userID", userID) // Контроллеры смогут получить ID текущего пользователя
		}

		c.Next()
	}
}
