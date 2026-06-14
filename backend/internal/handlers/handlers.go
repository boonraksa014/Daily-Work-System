// Package handlers รวม HTTP handler ของแต่ละ resource
package handlers

import (
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler ถือ dependency ที่ handler ทุกตัวใช้ร่วมกัน
type Handler struct {
	DB *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Handler { return &Handler{DB: db} }

// dateStr แปลง time.Time -> "YYYY-MM-DD" (รูปแบบที่ frontend ใช้)
func dateStr(t time.Time) string { return t.Format("2006-01-02") }

// dateStrPtr แปลง *time.Time -> *string ("YYYY-MM-DD") คง nil ไว้ถ้าไม่มีค่า
func dateStrPtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}
