package main

import (
	"subscription-backend-go/config"
	"subscription-backend-go/handlers"
	"subscription-backend-go/middleware"
	"subscription-backend-go/models"

	"github.com/gin-gonic/gin"
)

// Middleware для настройки CORS (чтобы React мог достучаться до Go)
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func SetupRouter() *gin.Engine {
	r := gin.Default()
	r.Use(CORSMiddleware())

	// 1. Публичные роуты
	public := r.Group("/api/public")
	{
		public.POST("/register", handlers.Register)
		public.POST("/login", handlers.Login)
	}

	// 2. Защищенные роуты
	protected := r.Group("/api")
	protected.Use(middleware.AuthRequired())
	{
		protected.GET("/users/me", handlers.GetMe)
		protected.PUT("/users/update", handlers.UpdateProfile)
		protected.GET("/subscription", handlers.GetSubscriptions)
		protected.POST("/subscription/add", handlers.CreateSubscription)
		protected.PUT("/subscription/edit/:id", handlers.UpdateSubscription)
		protected.DELETE("/subscription/delete/:id", handlers.DeleteSubscription)
	}
	return r
}

func main() {
	config.ConnectDatabase()
	config.DB.AutoMigrate(&models.User{}, &models.Subscription{})

	r := SetupRouter()
	r.Run(":8080")
}
