package handlers

import (
	"net/http"
	"subscription-backend-go/config"
	"subscription-backend-go/models"
	"time"

	"github.com/gin-gonic/gin"
)

// GetSubscriptions - получить список с фильтрацией и статистикой
func GetSubscriptions(c *gin.Context) {
	userID, _ := c.Get("userID")
	var subscriptions []models.Subscription

	query := config.DB.Where("user_id = ?", userID)

	if name := c.Query("name"); name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}
	if minCost := c.Query("costMin"); minCost != "" {
		query = query.Where("cost >= ?", minCost)
	}
	if maxCost := c.Query("costMax"); maxCost != "" {
		query = query.Where("cost <= ?", maxCost)
	}
	if startDate := c.Query("startDate"); startDate != "" {
		query = query.Where("start_date >= ?", startDate)
	}
	if endDate := c.Query("endDate"); endDate != "" {
		query = query.Where("start_date <= ?", endDate)
	}
	if period := c.Query("period"); period != "" && period != "Все" {
		query = query.Where("period = ?", period)
	}

	sort := c.DefaultQuery("sort", "asc")
	if sort == "desc" {
		query = query.Order("cost desc")
	} else {
		query = query.Order("cost asc")
	}

	query.Find(&subscriptions)

	var totalCost float64
	var monthlyCount, yearlyCount int64
	var monthlyCost, yearlyCost float64

	for _, sub := range subscriptions {
		totalCost += sub.Cost
		if sub.Period == models.Monthly {
			monthlyCount++
			monthlyCost += sub.Cost
		} else if sub.Period == models.Yearly {
			yearlyCount++
			yearlyCost += sub.Cost
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"subscriptions": subscriptions,
		"statistics": gin.H{
			"totalSubscriptions": len(subscriptions),
			"totalCost":          totalCost,
			"monthlyCount":       monthlyCount,
			"yearlyCount":        yearlyCount,
			"monthlyCost":        monthlyCost,
			"yearlyCost":         yearlyCost,
		},
	})
}

func CreateSubscription(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input struct {
		Name      string  `json:"name" binding:"required"`
		Cost      float64 `json:"cost" binding:"required"`
		StartDate string  `json:"startDate" binding:"required"`
		EndDate   string  `json:"endDate"`
		Period    string  `json:"period" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ошибка данных: " + err.Error()})
		return
	}

	layout := "2006-01-02"

	start, err := time.Parse(layout, input.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты начала"})
		return
	}

	subscription := models.Subscription{
		Name:      input.Name,
		Cost:      input.Cost,
		StartDate: start,
		Period:    models.SubscriptionPeriod(input.Period),
		UserID:    userID.(uint),
	}

	if input.EndDate != "" {
		end, err := time.Parse(layout, input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты окончания"})
			return
		}
		subscription.EndDate = &end
	}

	if err := config.DB.Create(&subscription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения в БД"})
		return
	}

	c.JSON(http.StatusCreated, subscription)
}

func DeleteSubscription(c *gin.Context) {
	userID, _ := c.Get("userID")
	subID := c.Param("id")

	result := config.DB.Where("id = ? AND user_id = ?", subID, userID).Delete(&models.Subscription{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Подписка не найдена или доступ запрещен"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Подписка удалена"})
}

func UpdateSubscription(c *gin.Context) {
	userID, _ := c.Get("userID")
	subID := c.Param("id")

	var subscription models.Subscription
	if err := config.DB.Where("id = ? AND user_id = ?", subID, userID).First(&subscription).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Подписка не найдена"})
		return
	}

	var input struct {
		Name      string  `json:"name"`
		Cost      float64 `json:"cost"`
		StartDate string  `json:"startDate"`
		EndDate   string  `json:"endDate"`
		Period    string  `json:"period"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных"})
		return
	}

	subscription.Name = input.Name
	subscription.Cost = input.Cost
	subscription.Period = models.SubscriptionPeriod(input.Period)

	layout := "2006-01-02"

	if input.StartDate != "" {
		start, err := time.Parse(layout, input.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты начала"})
			return
		}
		subscription.StartDate = start
	}

	if input.EndDate != "" {
		end, err := time.Parse(layout, input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат даты окончания"})
			return
		}
		subscription.EndDate = &end
	} else {
		subscription.EndDate = nil
	}

	if err := config.DB.Save(&subscription).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Не удалось обновить подписку"})
		return
	}

	c.JSON(http.StatusOK, subscription)
}
