package database

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// New สร้าง connection pool ไปยัง Postgres ของ Supabase
func New(ctx context.Context, connURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(connURL)
	if err != nil {
		// รหัสผ่านอาจมีอักขระพิเศษ ( / [ ] @ ) ที่ทำให้ URL parser ล้มเหลว
		// → ถอดรหัสผ่านออกจาก URL ให้ parse ส่วนที่เหลือได้ แล้วเซ็ตรหัสผ่านดิบกลับเข้า pgx
		if stripped, pass, ok := stripPassword(connURL); ok {
			cfg, err = pgxpool.ParseConfig(stripped)
			if err == nil {
				cfg.ConnConfig.Password = pass
			}
		}
		if err != nil {
			return nil, fmt.Errorf("parse database url: %w", err)
		}
	}
	cfg.MaxConns = 10
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// stripPassword แยกรหัสผ่านออกจาก connection URL คืน (urlไม่มีรหัสผ่าน, รหัสผ่านดิบ, ok)
// ใช้ LastIndex("@") หา separator ก่อน host (host/query ไม่มี '@') จึงทนต่อ / [ ] @ ในรหัสผ่าน
func stripPassword(raw string) (string, string, bool) {
	i := strings.Index(raw, "://")
	if i < 0 {
		return raw, "", false
	}
	scheme := raw[:i]
	rest := raw[i+3:]

	at := strings.LastIndex(rest, "@")
	if at < 0 {
		return raw, "", false
	}
	userinfo := rest[:at]
	hostTail := rest[at+1:]

	c := strings.Index(userinfo, ":")
	if c < 0 {
		return raw, "", false // ไม่มีรหัสผ่านในส่วน userinfo
	}
	user := userinfo[:c]
	pass := userinfo[c+1:]
	return scheme + "://" + user + "@" + hostTail, pass, true
}

// WithUser รัน fn ภายใน transaction ที่ตั้ง request.jwt.claims ของผู้ใช้ไว้
// ทำให้ auth.uid() ใน trigger/default ของ Supabase คืนค่า user id ที่ถูกต้อง
// (audit columns: created_by_id / updated_by_id / deleted_by_id ถูกบันทึกครบ)
func WithUser(ctx context.Context, pool *pgxpool.Pool, userID string, fn func(tx pgx.Tx) error) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck — no-op หลัง commit

	claims := fmt.Sprintf(`{"sub":%q,"role":"authenticated"}`, userID)
	if _, err := tx.Exec(ctx, "select set_config('request.jwt.claims', $1, true)", claims); err != nil {
		return fmt.Errorf("set jwt claims: %w", err)
	}
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
