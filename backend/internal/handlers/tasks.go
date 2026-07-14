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
	ProjectID   *string  `json:"projectId"`
	CategoryID  *string  `json:"categoryId"`
	CompletedAt *string  `json:"completedAt"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"` // อ่านอย่างเดียว (trigger เซ็ตให้) — ไม่รับจาก client
}

type taskInput struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description *string  `json:"description"`
	Priority    string   `json:"priority"`
	Status      string   `json:"status"`
	Tags        []string `json:"tags"`
	DueDate     *string  `json:"dueDate"`
	ProjectID   *string  `json:"projectId"`
	CategoryID  *string  `json:"categoryId"`
	CompletedAt *string  `json:"completedAt"`
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
		select id, title, description, priority, status, tags, due_date, project_id, category_id, completed_at, created_at, updated_at
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
			t         taskDTO
			due       *time.Time
			completed *time.Time
			created   time.Time
			updated   time.Time
		)
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Priority, &t.Status, &t.Tags, &due, &t.ProjectID, &t.CategoryID, &completed, &created, &updated); err != nil {
			return err
		}
		t.DueDate = dateStrPtr(due)
		t.CompletedAt = dateStrPtr(completed)
		t.CreatedAt = dateStr(created)
		t.UpdatedAt = updated.Format(time.RFC3339) // ISO เต็ม (มี timezone) ให้ frontend format เป็นเวลาท้องถิ่นเอง
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
			due       *time.Time
			completed *time.Time
			created   time.Time
		)
		row := tx.QueryRow(c.Context(), `
			insert into public.tasks (id, user_id, title, description, priority, status, tags, due_date, project_id, category_id, completed_at)
			values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			on conflict (id) do update set
				title=excluded.title, description=excluded.description, priority=excluded.priority,
				status=excluded.status, tags=excluded.tags, due_date=excluded.due_date,
				project_id=excluded.project_id, category_id=excluded.category_id, completed_at=excluded.completed_at
			where public.tasks.user_id = excluded.user_id
			returning id, title, description, priority, status, tags, due_date, project_id, category_id, completed_at, created_at`,
			ensureID(in.ID), uid, in.Title, in.Description, in.Priority, in.Status, in.Tags, in.DueDate, in.ProjectID, in.CategoryID, in.CompletedAt)
		if err := row.Scan(&dto.ID, &dto.Title, &dto.Description, &dto.Priority, &dto.Status, &dto.Tags, &due, &dto.ProjectID, &dto.CategoryID, &completed, &created); err != nil {
			return err
		}
		dto.DueDate = dateStrPtr(due)
		dto.CompletedAt = dateStrPtr(completed)
		dto.CreatedAt = dateStr(created)
		return nil
	})
	if err == pgx.ErrNoRows {
		return fiber.NewError(fiber.StatusConflict, "id ซ้ำกับข้อมูลของผู้ใช้อื่น")
	}
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
			due       *time.Time
			completed *time.Time
			created   time.Time
		)
		row := tx.QueryRow(c.Context(), `
			update public.tasks
			set title=$1, description=$2, priority=$3, status=$4, tags=$5, due_date=$6, project_id=$7, category_id=$8, completed_at=$9
			where id=$10 and user_id=$11 and deleted_at is null
			returning id, title, description, priority, status, tags, due_date, project_id, category_id, completed_at, created_at`,
			in.Title, in.Description, in.Priority, in.Status, in.Tags, in.DueDate, in.ProjectID, in.CategoryID, in.CompletedAt, id, uid)
		if err := row.Scan(&dto.ID, &dto.Title, &dto.Description, &dto.Priority, &dto.Status, &dto.Tags, &due, &dto.ProjectID, &dto.CategoryID, &completed, &created); err != nil {
			if err == pgx.ErrNoRows {
				found = false
				return nil
			}
			return err
		}
		dto.DueDate = dateStrPtr(due)
		dto.CompletedAt = dateStrPtr(completed)
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
