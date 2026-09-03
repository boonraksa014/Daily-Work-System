package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

type logDTO struct {
	ID           string  `json:"id"`
	Date         string  `json:"date"`
	Title        string  `json:"title"`
	Note         *string `json:"note"`
	Hours        float64 `json:"hours"`
	CategoryID   *string `json:"categoryId"`
	Category     string  `json:"category"`  // ชื่อหมวด (สะดวกฝั่ง frontend)
	TaskID       *string `json:"taskId"`    // งาน Kanban ที่ผูกไว้ (ถ้ามี)
	ProjectID    *string `json:"projectId"` // โปรเจกต์ที่เกี่ยวข้อง (ถ้ามี)
	Done         bool    `json:"done"`
	CancelledAt  *string `json:"cancelledAt"`
	CancelReason *string `json:"cancelReason"`
}

type logInput struct {
	ID           string  `json:"id"`
	Date         string  `json:"date"`
	Title        string  `json:"title"`
	Note         *string `json:"note"`
	Hours        float64 `json:"hours"`
	CategoryID   *string `json:"categoryId"`
	TaskID       *string `json:"taskId"`
	ProjectID    *string `json:"projectId"`
	Done         bool    `json:"done"`
	CancelledAt  *string `json:"cancelledAt"`
	CancelReason *string `json:"cancelReason"`
}

// GET /api/v1/logs
func (h *Handler) ListLogs(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	rows, err := h.DB.Query(c.Context(), `
		select l.id, l.entry_date, l.title, l.note, l.hours::double precision,
		       l.category_id, coalesce(c.name, ''), l.task_id, l.project_id, l.done, l.cancelled_at, l.cancel_reason
		from public.log_entries l
		left join public.categories c on c.id = l.category_id
		where l.user_id = $1 and l.deleted_at is null
		order by l.entry_date desc, l.created_at desc`, uid)
	if err != nil {
		return err
	}
	defer rows.Close()

	out := []logDTO{}
	for rows.Next() {
		var (
			e         logDTO
			day       time.Time
			cancelled *time.Time
		)
		if err := rows.Scan(&e.ID, &day, &e.Title, &e.Note, &e.Hours, &e.CategoryID, &e.Category, &e.TaskID, &e.ProjectID, &e.Done, &cancelled, &e.CancelReason); err != nil {
			return err
		}
		e.Date = dateStr(day)
		e.CancelledAt = dateStrPtr(cancelled)
		out = append(out, e)
	}
	return c.JSON(fiber.Map{"logs": out})
}

// POST /api/v1/logs
func (h *Handler) CreateLog(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	var in logInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Title == "" || in.Date == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อรายการและวันที่")
	}
	if in.Hours <= 0 {
		in.Hours = 1
	}

	dto, err := h.insertOrUpdateLog(c, uid, in, "")
	if err == pgx.ErrNoRows {
		return fiber.NewError(fiber.StatusConflict, "id ซ้ำกับข้อมูลของผู้ใช้อื่น")
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(dto)
}

// PATCH /api/v1/logs/:id
func (h *Handler) UpdateLog(c *fiber.Ctx) error {
	uid := middleware.UserID(c)
	id := c.Params("id")
	var in logInput
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Title == "" || in.Date == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีชื่อรายการและวันที่")
	}
	if in.Hours <= 0 {
		in.Hours = 1
	}

	dto, err := h.insertOrUpdateLog(c, uid, in, id)
	if err == pgx.ErrNoRows {
		return fiber.NewError(fiber.StatusNotFound, "ไม่พบรายการ")
	}
	if err != nil {
		return err
	}
	return c.JSON(dto)
}

// insertOrUpdateLog: id == "" => insert, ไม่งั้น update
func (h *Handler) insertOrUpdateLog(c *fiber.Ctx, uid string, in logInput, id string) (logDTO, error) {
	var dto logDTO
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		var (
			day        time.Time
			catName    *string
			catID      *string
			taskID     *string
			projectID  *string
			cancelled  *time.Time
			returnedID string
		)
		var row pgx.Row
		if id == "" {
			row = tx.QueryRow(c.Context(), `
				insert into public.log_entries (id, user_id, entry_date, title, note, hours, category_id, task_id, project_id, done, cancelled_at, cancel_reason)
				values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
				on conflict (id) do update set
					entry_date=excluded.entry_date, title=excluded.title, note=excluded.note,
					hours=excluded.hours, category_id=excluded.category_id, task_id=excluded.task_id,
					project_id=excluded.project_id, done=excluded.done,
					cancelled_at=excluded.cancelled_at, cancel_reason=excluded.cancel_reason
				where public.log_entries.user_id = excluded.user_id
				returning id, entry_date, title, note, hours::double precision, category_id, task_id, project_id, done, cancelled_at, cancel_reason`,
				ensureID(in.ID), uid, in.Date, in.Title, in.Note, in.Hours, in.CategoryID, in.TaskID, in.ProjectID, in.Done, in.CancelledAt, in.CancelReason)
		} else {
			row = tx.QueryRow(c.Context(), `
				update public.log_entries
				set entry_date=$1, title=$2, note=$3, hours=$4, category_id=$5, task_id=$6, project_id=$7, done=$8, cancelled_at=$9, cancel_reason=$10
				where id=$11 and user_id=$12 and deleted_at is null
				returning id, entry_date, title, note, hours::double precision, category_id, task_id, project_id, done, cancelled_at, cancel_reason`,
				in.Date, in.Title, in.Note, in.Hours, in.CategoryID, in.TaskID, in.ProjectID, in.Done, in.CancelledAt, in.CancelReason, id, uid)
		}
		if err := row.Scan(&returnedID, &day, &dto.Title, &dto.Note, &dto.Hours, &catID, &taskID, &projectID, &dto.Done, &cancelled, &dto.CancelReason); err != nil {
			return err
		}
		dto.ID = returnedID
		dto.Date = dateStr(day)
		dto.CategoryID = catID
		dto.TaskID = taskID
		dto.ProjectID = projectID
		dto.CancelledAt = dateStrPtr(cancelled)

		// resolve ชื่อหมวด (ถ้ามี)
		if catID != nil {
			if err := tx.QueryRow(c.Context(),
				"select coalesce(name,'') from public.categories where id=$1", *catID).Scan(&catName); err == nil && catName != nil {
				dto.Category = *catName
			}
		}
		return nil
	})
	return dto, err
}

// DELETE /api/v1/logs/:id  (soft delete)
func (h *Handler) DeleteLog(c *fiber.Ctx) error {
	return h.softDelete(c, "log_entries")
}
