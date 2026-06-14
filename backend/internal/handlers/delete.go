package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"dailywork-backend/internal/database"
	"dailywork-backend/internal/middleware"
)

// softDelete ตั้ง deleted_at/deleted_by_id ของแถวที่เป็นของผู้ใช้ (ไม่ลบจริง)
// table มาจากโค้ดภายในเท่านั้น (ค่าคงที่) — ไม่ใช่ input ของผู้ใช้
func (h *Handler) softDelete(c *fiber.Ctx, table string) error {
	uid := middleware.UserID(c)
	id := c.Params("id")

	var affected int64
	err := database.WithUser(c.Context(), h.DB, uid, func(tx pgx.Tx) error {
		ct, err := tx.Exec(c.Context(),
			"update public."+table+" set deleted_at = now(), deleted_by_id = $1::uuid where id = $2 and user_id = $1::uuid and deleted_at is null",
			uid, id)
		if err != nil {
			return err
		}
		affected = ct.RowsAffected()
		return nil
	})
	if err != nil {
		return err
	}
	if affected == 0 {
		return fiber.NewError(fiber.StatusNotFound, "ไม่พบรายการ")
	}
	return c.SendStatus(fiber.StatusNoContent)
}
