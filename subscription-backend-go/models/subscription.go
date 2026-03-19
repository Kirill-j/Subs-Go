package models

import (
	"time"
)

// Вместо Java Enum используем кастомный тип строки
type SubscriptionPeriod string

const (
	Monthly SubscriptionPeriod = "MONTHLY"
	Yearly  SubscriptionPeriod = "YEARLY"
)

type Subscription struct {
	ID        uint               `gorm:"primaryKey" json:"id"`
	Name      string             `gorm:"size:100;not null" json:"name"`
	Cost      float64            `gorm:"not null" json:"cost"`
	StartDate time.Time          `gorm:"not null" json:"startDate"`
	EndDate   *time.Time         `json:"endDate"`
	Period    SubscriptionPeriod `gorm:"size:20;not null" json:"period"`
	UserID    uint               `json:"userId"`
	User      User               `gorm:"foreignKey:UserID" json:"-"`
}
