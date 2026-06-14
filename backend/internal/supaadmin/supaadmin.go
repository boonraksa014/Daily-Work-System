// Package supaadmin เป็น client บางๆ สำหรับเรียก GoTrue Admin API ของ Supabase
// (ใช้ service_role key — ฝั่ง server เท่านั้น)
package supaadmin

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	key     string
	http    *http.Client
}

func New(supabaseURL, serviceRoleKey string) *Client {
	return &Client{
		baseURL: supabaseURL,
		key:     serviceRoleKey,
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

// Enabled = ตั้งค่า env ครบหรือยัง
func (c *Client) Enabled() bool { return c.baseURL != "" && c.key != "" }

// User = รูปแบบที่ส่งกลับให้ frontend
type User struct {
	ID           string  `json:"id"`
	Email        string  `json:"email"`
	Role         string  `json:"role"`
	Active       bool    `json:"active"`
	CreatedAt    string  `json:"createdAt"`
	LastSignInAt *string `json:"lastSignInAt"`
}

// gotrueUser = โครงสร้างดิบจาก GoTrue
type gotrueUser struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	CreatedAt    string         `json:"created_at"`
	LastSignInAt *string        `json:"last_sign_in_at"`
	BannedUntil  *string        `json:"banned_until"`
	AppMetadata  map[string]any `json:"app_metadata"`
}

func (u gotrueUser) toUser() User {
	role := "user"
	if u.AppMetadata != nil {
		if r, ok := u.AppMetadata["role"].(string); ok && r != "" {
			role = r
		}
	}
	active := true
	if u.BannedUntil != nil && *u.BannedUntil != "" {
		if t, err := time.Parse(time.RFC3339, *u.BannedUntil); err == nil {
			active = !t.After(time.Now())
		} else {
			active = false
		}
	}
	return User{ID: u.ID, Email: u.Email, Role: role, Active: active, CreatedAt: u.CreatedAt, LastSignInAt: u.LastSignInAt}
}

func (c *Client) do(ctx context.Context, method, path string, body any) ([]byte, int, error) {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("apikey", c.key)
	req.Header.Set("Authorization", "Bearer "+c.key)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(res.Body)
	return data, res.StatusCode, nil
}

// apiError ดึงข้อความ error จาก response ของ GoTrue
func apiError(data []byte, status int) error {
	var e struct {
		Msg     string `json:"msg"`
		Message string `json:"message"`
		Error   string `json:"error"`
	}
	_ = json.Unmarshal(data, &e)
	msg := e.Msg
	if msg == "" {
		msg = e.Message
	}
	if msg == "" {
		msg = e.Error
	}
	if msg == "" {
		msg = fmt.Sprintf("GoTrue error (status %d)", status)
	}
	return fmt.Errorf("%s", msg)
}

// List คืนผู้ใช้ทั้งหมด (เรียงตามอีเมล)
func (c *Client) List(ctx context.Context) ([]User, error) {
	data, status, err := c.do(ctx, http.MethodGet, "/auth/v1/admin/users?per_page=1000", nil)
	if err != nil {
		return nil, err
	}
	if status >= 300 {
		return nil, apiError(data, status)
	}
	var wrap struct {
		Users []gotrueUser `json:"users"`
	}
	if err := json.Unmarshal(data, &wrap); err != nil {
		return nil, err
	}
	out := make([]User, 0, len(wrap.Users))
	for _, u := range wrap.Users {
		out = append(out, u.toUser())
	}
	return out, nil
}

// Create สร้างผู้ใช้ใหม่ (ยืนยันอีเมลอัตโนมัติ + ตั้ง role ใน app_metadata)
func (c *Client) Create(ctx context.Context, email, password, role string) (User, error) {
	body := map[string]any{
		"email":         email,
		"password":      password,
		"email_confirm": true,
		"app_metadata":  map[string]any{"role": role},
	}
	data, status, err := c.do(ctx, http.MethodPost, "/auth/v1/admin/users", body)
	if err != nil {
		return User{}, err
	}
	if status >= 300 {
		return User{}, apiError(data, status)
	}
	var u gotrueUser
	if err := json.Unmarshal(data, &u); err != nil {
		return User{}, err
	}
	return u.toUser(), nil
}

// SetRole เปลี่ยนสิทธิ์ (app_metadata.role)
func (c *Client) SetRole(ctx context.Context, id, role string) error {
	body := map[string]any{"app_metadata": map[string]any{"role": role}}
	return c.update(ctx, id, body)
}

// SetActive เปิด/ปิดการใช้งานบัญชี (ban/unban)
func (c *Client) SetActive(ctx context.Context, id string, active bool) error {
	dur := "876000h" // ~100 ปี = ปิดถาวรจนกว่าจะเปิดใหม่
	if active {
		dur = "none"
	}
	return c.update(ctx, id, map[string]any{"ban_duration": dur})
}

func (c *Client) update(ctx context.Context, id string, body map[string]any) error {
	data, status, err := c.do(ctx, http.MethodPut, "/auth/v1/admin/users/"+id, body)
	if err != nil {
		return err
	}
	if status >= 300 {
		return apiError(data, status)
	}
	return nil
}

// Delete ลบผู้ใช้
func (c *Client) Delete(ctx context.Context, id string) error {
	data, status, err := c.do(ctx, http.MethodDelete, "/auth/v1/admin/users/"+id, nil)
	if err != nil {
		return err
	}
	if status >= 300 {
		return apiError(data, status)
	}
	return nil
}
