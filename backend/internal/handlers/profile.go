package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

type profileDTO struct {
	DisplayName string `json:"displayName"`
	Role        string `json:"role"` // = job_title
	AvatarColor string `json:"avatarColor"`
	DefaultView string `json:"defaultView"`
}

// GET /api/v1/profile
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var p profileDTO
	err := h.DB.QueryRow(c.Context(), `
		select display_name, job_title, avatar_color, default_view
		from public.profiles where id = $1`, uid).
		Scan(&p.DisplayName, &p.Role, &p.AvatarColor, &p.DefaultView)
	if err == pgx.ErrNoRows {
		// ยังไม่มี profile (เผื่อกรณี trigger ไม่ทำงาน) — คืนค่า default
		return c.JSON(profileDTO{DisplayName: "ผู้ใช้", AvatarColor: "#7c3aed", DefaultView: "dashboard"})
	}
	if err != nil {
		return err
	}
	return c.JSON(p)
}

// PUT /api/v1/profile
func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var in profileDTO
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.DisplayName == "" {
		in.DisplayName = "ผู้ใช้"
	}
	if in.AvatarColor == "" {
		in.AvatarColor = "#7c3aed"
	}
	if in.DefaultView == "" {
		in.DefaultView = "dashboard"
	}

	var p profileDTO
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		row := tx.QueryRow(c.Context(), `
			insert into public.profiles (id, display_name, job_title, avatar_color, default_view)
			values ($1,$2,$3,$4,$5)
			on conflict (id) do update set
				display_name = excluded.display_name,
				job_title    = excluded.job_title,
				avatar_color = excluded.avatar_color,
				default_view = excluded.default_view
			returning display_name, job_title, avatar_color, default_view`,
			uid, in.DisplayName, in.Role, in.AvatarColor, in.DefaultView)
		return row.Scan(&p.DisplayName, &p.Role, &p.AvatarColor, &p.DefaultView)
	})
	if err != nil {
		return err
	}
	return c.JSON(p)
}
