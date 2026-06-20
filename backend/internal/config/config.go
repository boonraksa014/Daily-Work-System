package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config รวมค่าตั้งค่าทั้งหมดจาก environment (.env)
type Config struct {
	Port           string
	DatabaseURL    string // Supabase Postgres connection string (pooler/direct)
	SupabaseURL    string // https://<ref>.supabase.co
	ServiceRoleKey string // ใช้เรียก GoTrue admin API (จัดการผู้ใช้)
	JWTSecret      string // ใช้ verify access token ของ Supabase (HS256)
	CORSOrigins    string // origin ของ frontend (คั่นด้วย comma)
}

func Load() *Config {
	_ = godotenv.Load() // โหลด .env ถ้ามี (ไม่มีก็ใช้ env จริง)

	c := &Config{
		Port:           getenv("PORT", "8080"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		SupabaseURL:    trimSlash(os.Getenv("SUPABASE_URL")),
		ServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		JWTSecret:      os.Getenv("SUPABASE_JWT_SECRET"),
		CORSOrigins:    sanitizeOrigins(getenv("CORS_ORIGINS", "http://localhost:3000")),
	}

	if c.DatabaseURL == "" {
		log.Fatal("config: DATABASE_URL is required")
	}
	// ต้องมีวิธี verify token อย่างน้อยหนึ่งอย่าง:
	//   - SUPABASE_URL → ใช้ JWKS verify token แบบ asymmetric (ES256/RS256) [โปรเจกต์ใหม่]
	//   - SUPABASE_JWT_SECRET → verify token แบบ HS256 [โปรเจกต์เดิม]
	if c.SupabaseURL == "" && c.JWTSecret == "" {
		log.Fatal("config: ต้องมี SUPABASE_URL (สำหรับ JWKS) หรือ SUPABASE_JWT_SECRET อย่างน้อยหนึ่งอย่าง")
	}
	if c.ServiceRoleKey == "" {
		log.Println("config: warning — SUPABASE_SERVICE_ROLE_KEY ว่าง, endpoint จัดการผู้ใช้ (admin) จะใช้งานไม่ได้")
	}
	return c
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func trimSlash(s string) string {
	for len(s) > 0 && s[len(s)-1] == '/' {
		s = s[:len(s)-1]
	}
	return s
}

// sanitizeOrigins ทำความสะอาดรายการ origin (คั่นด้วย comma):
// ตัดช่องว่าง + slash ท้าย เพื่อให้ค่าที่ก็อปมาแบบมี '/' ต่อท้ายไม่ทำให้ Fiber CORS panic
func sanitizeOrigins(s string) string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = trimSlash(strings.TrimSpace(p))
		if p != "" {
			out = append(out, p)
		}
	}
	return strings.Join(out, ",")
}
