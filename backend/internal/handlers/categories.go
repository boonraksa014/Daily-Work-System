package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

type categoryDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Emoji    string `json:"emoji"`
	Color    string `json:"color"`
	IsActive bool   `json:"isActive"`
}

type categoryInput struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Emoji    string `json:"emoji"`
	Color    string `json:"color"`
	IsActive *bool  `json:"isActive"`
}

func (in *categoryInput) normalize() {
	if in.Emoji == "" {
		in.Emoji = "🏷️"
	}
	if in.Color == "" {
		in.Color = "#7c3aed"
	}
}

func activeOrTrue(b *bool) bool {
	if b == nil {
		return true
	}
	return *b
}

// GET /api/v1/categories
func (h *Handler) ListCategories(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	rows, err := h.DB.Query(c.Context(), `
		select id, name, emoji, color, is_active
		from public.categories
		where user_id = $1 and deleted_at is null
		order by sort_order, name`, uid)
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []categoryDTO{}
	for rows.Next() {
		var cat categoryDTO
		if err := rows.Scan(&cat.ID, &cat.Name, &cat.Emoji, &cat.Color, &cat.IsActive); err != nil {
			return err
		}
		out = append(out, cat)
	}
	return c.JSON(fiber.Map{"categories": out})
}

// POST /api/v1/categories
func (h *Handler) CreateCategory(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var in categoryInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อหมวดหมู่")
	}
	in.normalize()

	var dto categoryDTO
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		row := tx.QueryRow(c.Context(), `
			insert into public.categories (id, user_id, name, emoji, color, is_active)
			values ($1,$2,$3,$4,$5,$6)
			on conflict (id) do update set
				name=excluded.name, emoji=excluded.emoji, color=excluded.color, is_active=excluded.is_active
			where public.categories.user_id = excluded.user_id
			returning id, name, emoji, color, is_active`,
			ensureID(in.ID), uid, in.Name, in.Emoji, in.Color, activeOrTrue(in.IsActive))
		return row.Scan(&dto.ID, &dto.Name, &dto.Emoji, &dto.Color, &dto.IsActive)
	})
	if err == pgx.ErrNoRows {
		return fiber.NewError(fiber.StatusConflict, "id ซ้ำกับข้อมูลของผู้ใช้อื่น")
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(dto)
}

// PATCH /api/v1/categories/:id
func (h *Handler) UpdateCategory(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	id := c.Params("id")
	var in categoryInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อหมวดหมู่")
	}
	in.normalize()

	var dto categoryDTO
	found := true
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		row := tx.QueryRow(c.Context(), `
			update public.categories
			set name=$1, emoji=$2, color=$3, is_active=$4
			where id=$5 and user_id=$6 and deleted_at is null
			returning id, name, emoji, color, is_active`,
			in.Name, in.Emoji, in.Color, activeOrTrue(in.IsActive), id, uid)
		if err := row.Scan(&dto.ID, &dto.Name, &dto.Emoji, &dto.Color, &dto.IsActive); err != nil {
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
		return fiber.NewError(fiber.StatusNotFound, "ไม่พบหมวดหมู่")
	}
	return c.JSON(dto)
}

// DELETE /api/v1/categories/:id  (soft delete)
func (h *Handler) DeleteCategory(c *fiber.Ctx) error {
	return h.softDelete(c, "categories")
}
