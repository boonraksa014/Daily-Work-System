package main

import (
	"context"
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"dailywork-backend/internal/config"
	"dailywork-backend/internal/database"
	"dailywork-backend/internal/handlers"
	mw "dailywork-backend/internal/middleware"
	"dailywork-backend/internal/supaadmin"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	log.Println("connected to database")

	app := fiber.New(fiber.Config{
		AppName:      "Daily Work System API",
		ErrorHandler: errorHandler,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	}))

	// health (ไม่ต้อง auth)
	app.Get("/health", func(c *fiber.Ctx) error {
		if err := pool.Ping(c.Context()); err != nil {
			return fiber.NewError(fiber.StatusServiceUnavailable, "database unavailable")
		}
		return c.JSON(fiber.Map{"status": "ok"})
	})

	h := handlers.New(pool)
	users := handlers.NewUsers(supaadmin.New(cfg.SupabaseURL, cfg.ServiceRoleKey))

	// JWKS สำหรับ verify access token แบบ asymmetric (ES256/RS256)
	var keys *mw.KeyCache
	if cfg.SupabaseURL != "" {
		keys = mw.NewKeyCache(cfg.SupabaseURL + "/auth/v1/.well-known/jwks.json")
	} else {
		keys = mw.NewKeyCache("")
	}

	// ทุก route ใต้ /api/v1 ต้องผ่าน auth
	api := app.Group("/api/v1", mw.Auth(cfg.JWTSecret, keys))

	api.Get("/profile", h.GetProfile)
	api.Put("/profile", h.UpdateProfile)

	api.Get("/tasks", h.ListTasks)
	api.Post("/tasks", h.CreateTask)
	api.Patch("/tasks/:id", h.UpdateTask)
	api.Delete("/tasks/:id", h.DeleteTask)

	api.Get("/logs", h.ListLogs)
	api.Post("/logs", h.CreateLog)
	api.Patch("/logs/:id", h.UpdateLog)
	api.Delete("/logs/:id", h.DeleteLog)

	api.Get("/categories", h.ListCategories)
	api.Post("/categories", h.CreateCategory)
	api.Patch("/categories/:id", h.UpdateCategory)
	api.Delete("/categories/:id", h.DeleteCategory)

	api.Get("/tags", h.ListTags)
	api.Post("/tags", h.CreateTag)
	api.Patch("/tags/:id", h.UpdateTag)
	api.Delete("/tags/:id", h.DeleteTag)

	// จัดการผู้ใช้ — เฉพาะแอดมิน
	admin := api.Group("/admin", mw.RequireAdmin())
	admin.Get("/users", users.List)
	admin.Post("/users", users.Create)
	admin.Patch("/users/:id", users.Update)
	admin.Delete("/users/:id", users.Delete)

	addr := ":" + cfg.Port
	log.Printf("listening on %s", addr)
	if err := app.Listen(addr); err != nil {
		log.Fatalf("server: %v", err)
	}
}

// errorHandler แปลง error เป็น JSON {"error": "..."} อย่างสม่ำเสมอ
func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	var fe *fiber.Error
	if errors.As(err, &fe) {
		code = fe.Code
	}
	msg := err.Error()
	if code == fiber.StatusInternalServerError {
		log.Printf("internal error: %v", err)
		msg = "เกิดข้อผิดพลาดภายในระบบ"
	}
	return c.Status(code).JSON(fiber.Map{"error": msg})
}
