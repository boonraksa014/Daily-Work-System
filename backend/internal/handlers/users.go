package handlers

import (
	"github.com/gofiber/fiber/v2"

	"dailywork-backend/internal/middleware"
	"dailywork-backend/internal/supaadmin"
)

// UsersHandler จัดการบัญชีผู้ใช้ (เฉพาะแอดมิน) ผ่าน GoTrue Admin API
type UsersHandler struct {
	Admin *supaadmin.Client
}

func NewUsers(admin *supaadmin.Client) *UsersHandler { return &UsersHandler{Admin: admin} }

func (h *UsersHandler) ensureEnabled() error {
	if h.Admin == nil || !h.Admin.Enabled() {
		return fiber.NewError(fiber.StatusServiceUnavailable, "ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
	}
	return nil
}

func normRole(r string) string {
	if r == "admin" {
		return "admin"
	}
	return "user"
}

// GET /api/v1/admin/users
func (h *UsersHandler) List(c *fiber.Ctx) error {
	if err := h.ensureEnabled(); err != nil {
		return err
	}
	users, err := h.Admin.List(c.Context())
	if err != nil {
		return fiber.NewError(fiber.StatusBadGateway, err.Error())
	}
	return c.JSON(fiber.Map{"users": users})
}

// POST /api/v1/admin/users
func (h *UsersHandler) Create(c *fiber.Ctx) error {
	if err := h.ensureEnabled(); err != nil {
		return err
	}
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}
	if in.Email == "" || len(in.Password) < 6 {
		return fiber.NewError(fiber.StatusBadRequest, "ต้องมีอีเมลและรหัสผ่านอย่างน้อย 6 ตัว")
	}
	u, err := h.Admin.Create(c.Context(), in.Email, in.Password, normRole(in.Role))
	if err != nil {
		return fiber.NewError(fiber.StatusBadGateway, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(u)
}

// PATCH /api/v1/admin/users/:id  (เปลี่ยน role หรือเปิด/ปิดการใช้งาน)
func (h *UsersHandler) Update(c *fiber.Ctx) error {
	if err := h.ensureEnabled(); err != nil {
		return err
	}
	id := c.Params("id")
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ไม่พบผู้ใช้")
	}
	self := middleware.UserID(c)

	var in struct {
		Role   *string `json:"role"`
		Active *bool   `json:"active"`
	}
	if err := c.BodyParser(&in); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "รูปแบบข้อมูลไม่ถูกต้อง")
	}

	// เปิด/ปิดการใช้งาน
	if in.Active != nil {
		if id == self {
			return fiber.NewError(fiber.StatusBadRequest, "ปิดการใช้งานบัญชีตัวเองไม่ได้")
		}
		if err := h.Admin.SetActive(c.Context(), id, *in.Active); err != nil {
			return fiber.NewError(fiber.StatusBadGateway, err.Error())
		}
		return c.JSON(fiber.Map{"ok": true})
	}

	// เปลี่ยนสิทธิ์
	if in.Role != nil {
		role := normRole(*in.Role)
		if id == self && role != "admin" {
			return fiber.NewError(fiber.StatusBadRequest, "ถอดสิทธิ์แอดมินของตัวเองไม่ได้")
		}
		if err := h.Admin.SetRole(c.Context(), id, role); err != nil {
			return fiber.NewError(fiber.StatusBadGateway, err.Error())
		}
		return c.JSON(fiber.Map{"ok": true})
	}

	return fiber.NewError(fiber.StatusBadRequest, "ไม่มีข้อมูลให้แก้ไข")
}

// DELETE /api/v1/admin/users/:id
func (h *UsersHandler) Delete(c *fiber.Ctx) error {
	if err := h.ensureEnabled(); err != nil {
		return err
	}
	id := c.Params("id")
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "ไม่พบผู้ใช้")
	}
	if id == middleware.UserID(c) {
		return fiber.NewError(fiber.StatusBadRequest, "ลบบัญชีตัวเองไม่ได้")
	}
	if err := h.Admin.Delete(c.Context(), id); err != nil {
		return fiber.NewError(fiber.StatusBadGateway, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}
