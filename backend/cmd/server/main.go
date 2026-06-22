package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"

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
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 20 * time.Second,
		IdleTimeout:  60 * time.Second,
	})

	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	}))
	// rate limit ต่อ IP (เว้น health checks ที่ platform เรียกบ่อย)
	app.Use(limiter.New(limiter.Config{
		Max:        240,
		Expiration: time.Minute,
		Next:       func(c *fiber.Ctx) bool { return c.Path() == "/health" || c.Path() == "/live" },
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "คำขอถี่เกินไป ลองใหม่อีกครั้งในอีกสักครู่"})
		},
	}))

	// liveness (ไม่แตะ DB) — สำหรับ platform เช็คว่า process ยังอยู่
	app.Get("/live", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	// readiness (ping DB) — พร้อมรับทราฟฟิกไหม
	app.Get("/health", func(c *fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
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

	api.Get("/projects", h.ListProjects)
	api.Post("/projects", h.CreateProject)
	api.Patch("/projects/:id", h.UpdateProject)
	api.Delete("/projects/:id", h.DeleteProject)

	// จัดการผู้ใช้ — เฉพาะแอดมิน
	admin := api.Group("/admin", mw.RequireAdmin())
	admin.Get("/users", users.List)
	admin.Post("/users", users.Create)
	admin.Patch("/users/:id", users.Update)
	admin.Delete("/users/:id", users.Delete)

	addr := ":" + cfg.Port
	go func() {
		log.Printf("listening on %s", addr)
		if err := app.Listen(addr); err != nil {
			log.Fatalf("server: %v", err)
		}
	}()

	// graceful shutdown: รอสัญญาณแล้วปิดอย่างนุ่มนวล (ให้คำขอที่ค้างอยู่ทำงานจบ)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("shutting down…")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("stopped")
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
