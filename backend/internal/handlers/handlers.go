// Package handlers รวม HTTP handler ของแต่ละ resource
package handlers

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// isUniqueViolation = error เป็น Postgres unique_violation (23505) หรือไม่
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// Handler ถือ dependency ที่ handler ทุกตัวใช้ร่วมกัน
type Handler struct {
	DB *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Handler { return &Handler{DB: db} }

// ensureID ใช้ id ที่ client ส่งมาถ้าเป็น UUID ที่ถูกต้อง ไม่งั้นสร้างใหม่
// (ให้ client gen uuid เองได้ เพื่อให้ diff-sync ฝั่ง frontend ทำงานง่าย)
func ensureID(id string) string {
	if _, err := uuid.Parse(id); err == nil {
		return id
	}
	return uuid.NewString()
}

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
