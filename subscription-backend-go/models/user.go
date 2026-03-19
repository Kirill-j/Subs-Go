package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	PhoneNumber string `gorm:"size:20;uniqueIndex;not null" json:"phoneNumber"`
	Password    string `gorm:"not null" json:"-"`
	Name        string `json:"name"`

	Subscriptions []Subscription `gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"subscriptions,omitempty"`
}
