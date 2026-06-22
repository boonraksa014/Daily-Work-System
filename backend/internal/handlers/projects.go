package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

type projectDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Color    string `json:"color"`
	IsActive bool   `json:"isActive"`
}

type projectInput struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Color    string `json:"color"`
	IsActive *bool  `json:"isActive"`
}

// GET /api/v1/projects
func (h *Handler) ListProjects(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	rows, err := h.DB.Query(c.Context(), `
		select id, name, color, is_active
		from public.projects
		where user_id = $1 and deleted_at is null
		order by sort_order, name`, uid)
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []projectDTO{}
	for rows.Next() {
		var p projectDTO
		if err := rows.Scan(&p.ID, &p.Name, &p.Color, &p.IsActive); err != nil {
			return err
		}
		out = append(out, p)
	}
	return c.JSON(fiber.Map{"projects": out})
}

// POST /api/v1/projects
func (h *Handler) CreateProject(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var in projectInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อโปรเจกต์")
	}
	if in.Color == "" {
		in.Color = "#7c3aed"
	}

	var dto projectDTO
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		row := tx.QueryRow(c.Context(), `
			insert into public.projects (id, user_id, name, color, is_active)
			values ($1,$2,$3,$4,$5)
			on conflict (id) do update set
				name=excluded.name, color=excluded.color, is_active=excluded.is_active
			where public.projects.user_id = excluded.user_id
			returning id, name, color, is_active`,
			ensureID(in.ID), uid, in.Name, in.Color, activeOrTrue(in.IsActive))
		return row.Scan(&dto.ID, &dto.Name, &dto.Color, &dto.IsActive)
	})
	if err == pgx.ErrNoRows {
		return fiber.NewError(fiber.StatusConflict, "id ซ้ำกับข้อมูลของผู้ใช้อื่น")
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(dto)
}

// PATCH /api/v1/projects/:id
func (h *Handler) UpdateProject(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	id := c.Params("id")
	var in projectInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อโปรเจกต์")
	}
	if in.Color == "" {
		in.Color = "#7c3aed"
	}

	var dto projectDTO
	found := true
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		row := tx.QueryRow(c.Context(), `
			update public.projects
			set name=$1, color=$2, is_active=$3
			where id=$4 and user_id=$5 and deleted_at is null
			returning id, name, color, is_active`,
			in.Name, in.Color, activeOrTrue(in.IsActive), id, uid)
		if err := row.Scan(&dto.ID, &dto.Name, &dto.Color, &dto.IsActive); err != nil {
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
		return fiber.NewError(fiber.StatusNotFound, "ไม่พบโปรเจกต์")
	}
	return c.JSON(dto)
}

// DELETE /api/v1/projects/:id  (soft delete)
func (h *Handler) DeleteProject(c *fiber.Ctx) error {
	return h.softDelete(c, "projects")
}
