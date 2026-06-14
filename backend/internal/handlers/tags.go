package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

type tagDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	IsActive bool   `json:"isActive"`
}

type tagInput struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	IsActive *bool  `json:"isActive"`
}

// GET /api/v1/tags
func (h *Handler) ListTags(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	rows, err := h.DB.Query(c.Context(), `
		select id, name, is_active
		from public.tags
		where user_id = $1 and deleted_at is null
		order by name`, uid)
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []tagDTO{}
	for rows.Next() {
		var t tagDTO
		if err := rows.Scan(&t.ID, &t.Name, &t.IsActive); err != nil {
			return err
		}
		out = append(out, t)
	}
	return c.JSON(fiber.Map{"tags": out})
}

// POST /api/v1/tags
func (h *Handler) CreateTag(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var in tagInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อแท็ก")
	}

	var dto tagDTO
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		// on conflict (id) → idempotent ต่อการ retry; ชื่อซ้ำจะชน unique index (user_id,name)
		row := tx.QueryRow(c.Context(), `
			insert into public.tags (id, user_id, name, is_active)
			values ($1,$2,$3,$4)
			on conflict (id) do update set name=excluded.name, is_active=excluded.is_active
			where public.tags.user_id = excluded.user_id
			returning id, name, is_active`,
			ensureID(in.ID), uid, in.Name, activeOrTrue(in.IsActive))
		return row.Scan(&dto.ID, &dto.Name, &dto.IsActive)
	})
	if err == pgx.ErrNoRows {
		return fiber.NewError(fiber.StatusConflict, "id ซ้ำกับข้อมูลของผู้ใช้อื่น")
	}
	if isUniqueViolation(err) {
		return fiber.NewError(fiber.StatusConflict, "มีแท็กนี้อยู่แล้ว")
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(dto)
}

// PATCH /api/v1/tags/:id  (เปลี่ยนชื่อ / เปิด-ปิด)
func (h *Handler) UpdateTag(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	id := c.Params("id")
	var in tagInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อแท็ก")
	}

	var dto tagDTO
	found := true
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		row := tx.QueryRow(c.Context(), `
			update public.tags
			set name=$1, is_active=$2
			where id=$3 and user_id=$4 and deleted_at is null
			returning id, name, is_active`,
			in.Name, activeOrTrue(in.IsActive), id, uid)
		if err := row.Scan(&dto.ID, &dto.Name, &dto.IsActive); err != nil {
			if err == pgx.ErrNoRows {
				found = false
				return nil
			}
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	if !found {
		return fiber.NewError(fiber.StatusNotFound, "ไม่พบแท็ก")
	}
	return c.JSON(dto)
}

// DELETE /api/v1/tags/:id  (soft delete)
func (h *Handler) DeleteTag(c *fiber.Ctx) error {
	return h.softDelete(c, "tags")
}
