package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// supabaseClaims = โครงสร้าง claim ใน access token ของ Supabase
type supabaseClaims struct {
	jwt.RegisteredClaims
	Email       string                 `json:"email"`
	AppMetadata map[string]interface{} `json:"app_metadata"`
}

// Locals keys
const (
	LocalUserID = "userID"
	LocalEmail  = "email"
	LocalRole   = "role" // "admin" | "user" (จาก app_metadata.role)
)

// Auth ตรวจสอบ Bearer token (HS256 ด้วย Supabase JWT Secret)
// แล้วเก็บ userID / email / role ไว้ใน c.Locals
func Auth(secret string) fiber.Handler {
	key := []byte(secret)
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if len(header) < 8 || !strings.EqualFold(header[:7], "bearer ") {
			return fiber.NewError(fiber.StatusUnauthorized, "ไม่ได้เข้าสู่ระบบ")
		}
		tokenStr := strings.TrimSpace(header[7:])

		claims := &supabaseClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return key, nil
		})
		if err != nil || !token.Valid {
			return fiber.NewError(fiber.StatusUnauthorized, "เซสชันไม่ถูกต้องหรือหมดอายุ")
		}
		if claims.Subject == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "token ไม่มีผู้ใช้")
		}

		role := "user"
		if claims.AppMetadata != nil {
			if r, ok := claims.AppMetadata["role"].(string); ok && r != "" {
				role = r
			}
		}

		c.Locals(LocalUserID, claims.Subject)
		c.Locals(LocalEmail, claims.Email)
		c.Locals(LocalRole, role)
		return c.Next()
	}
}

// RequireAdmin อนุญาตเฉพาะผู้ใช้ที่ role == "admin"
func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Locals(LocalRole) != "admin" {
			return fiber.NewError(fiber.StatusForbidden, "ต้องเป็นผู้ดูแลระบบ")
		}
		return c.Next()
	}
}

// UserID ดึง user id ของผู้เรียกจาก context (ใช้ใน handler)
func UserID(c *fiber.Ctx) string {
	if v, ok := c.Locals(LocalUserID).(string); ok {
		return v
	}
	return ""
}
