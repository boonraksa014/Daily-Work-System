package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

type taskDTO struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description *string  `json:"description"`
	Priority    string   `json:"priority"`
	Status      string   `json:"status"`
	Tags        []string `json:"tags"`
	DueDate     *string  `json:"dueDate"`
	CreatedAt   string   `json:"createdAt"`
}

type taskInput struct {
	Title       string   `json:"title"`
	Description *string  `json:"description"`
	Priority    string   `json:"priority"`
	Status      string   `json:"status"`
	Tags        []string `json:"tags"`
	DueDate     *string  `json:"dueDate"`
}

func (in *taskInput) normalize() {
	if in.Priority == "" {
		in.Priority = "medium"
	}
	if in.Status == "" {
		in.Status = "todo"
	}
	if in.Tags == nil {
		in.Tags = []string{}
	}
}

// GET /api/v1/tasks
func (h *Handler) ListTasks(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	rows, err := h.DB.Query(c.Context(), `
		select id, title, description, priority, status, tags, due_date, created_at
		from public.tasks
		where user_id = $1 and deleted_at is null
		order by sort_order, created_at`, uid)
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []taskDTO{}
	for rows.Next() {
		var (
			t       taskDTO
			due     *time.Time
			created time.Time
		)
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Priority, &t.Status, &t.Tags, &due, &created); err != nil {
			return err
		}
		t.DueDate = dateStrPtr(due)
		t.CreatedAt = dateStr(created)
		out = append(out, t)
	}
	return c.JSON(fiber.Map{"tasks": out})
}

// POST /api/v1/tasks
func (h *Handler) CreateTask(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var in taskInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Title == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่องาน")
	}
	in.normalize()

	var dto taskDTO
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		var (
			due     *time.Time
			created time.Time
		)
		row := tx.QueryRow(c.Context(), `
			insert into public.tasks (user_id, title, description, priority, status, tags, due_date)
			values ($1,$2,$3,$4,$5,$6,$7)
			returning id, title, description, priority, status, tags, due_date, created_at`,
			uid, in.Title, in.Description, in.Priority, in.Status, in.Tags, in.DueDate)
		if err := row.Scan(&dto.ID, &dto.Title, &dto.Description, &dto.Priority, &dto.Status, &dto.Tags, &due, &created); err != nil {
			return err
		}
		dto.DueDate = dateStrPtr(due)
		dto.CreatedAt = dateStr(created)
		return nil
	})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(dto)
}

// PATCH /api/v1/tasks/:id
func (h *Handler) UpdateTask(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	id := c.Params("id")
	var in taskInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Title == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่องาน")
	}
	in.normalize()

	var dto taskDTO
	found := true
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		var (
			due     *time.Time
			created time.Time
		)
		row := tx.QueryRow(c.Context(), `
			update public.tasks
			set title=$1, description=$2, priority=$3, status=$4, tags=$5, due_date=$6
			where id=$7 and user_id=$8 and deleted_at is null
			returning id, title, description, priority, status, tags, due_date, created_at`,
			in.Title, in.Description, in.Priority, in.Status, in.Tags, in.DueDate, id, uid)
		if err := row.Scan(&dto.ID, &dto.Title, &dto.Description, &dto.Priority, &dto.Status, &dto.Tags, &due, &created); err != nil {
			if err == pgx.ErrNoRows {
				found = false
				return nil
			}
			return err
		}
		dto.DueDate = dateStrPtr(due)
		dto.CreatedAt = dateStr(created)
		return nil
	})
	if err != nil {
		return err
	}
	if !found {
		return fiber.NewError(fiber.StatusNotFound, "ไม่พบงาน")
	}
	return c.JSON(dto)
}

// DELETE /api/v1/tasks/:id  (soft delete)
func (h *Handler) DeleteTask(c *fiber.Ctx) error {
	return h.softDelete(c, "tasks")
}
