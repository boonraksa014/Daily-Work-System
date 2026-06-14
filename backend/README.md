# Daily Work System — Backend (Go + Fiber)

REST API ที่เชื่อมกับ Supabase เดิม (Postgres + Auth) เขียนด้วย **Go 1.26 + Fiber v2**

- ตรวจสอบสิทธิ์ด้วย **Supabase access token** (JWT) — รองรับทั้ง asymmetric (ES256/RS256 ผ่าน JWKS) และ HS256
- เข้าถึงข้อมูลผ่าน **pgx** ตรงไปยัง Postgres ของ Supabase
- บังคับให้เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง (กรองด้วย `user_id` ทุก query + ตั้ง `request.jwt.claims` ให้ audit/`auth.uid()` ทำงานถูกต้อง)
- จัดการผู้ใช้ (เฉพาะแอดมิน) ผ่าน **GoTrue Admin API** ด้วย service role key

## โครงสร้าง

```
backend/
  cmd/server/main.go            จุดเริ่ม + ผูก route ทั้งหมด
  internal/
    config/      โหลด env
    database/    pgx pool + WithUser (ตั้ง jwt claims ต่อ transaction)
    middleware/  auth (verify JWT) + requireAdmin
    handlers/    tasks, logs, categories, tags, profile, users
    supaadmin/   client เรียก GoTrue Admin API
```

## ตั้งค่า (.env)

ไฟล์ `backend/.env` ถูกสร้างให้แล้ว โดยคัดลอก `SUPABASE_URL` กับ `SUPABASE_SERVICE_ROLE_KEY`
มาจาก `../.env.local` ของ frontend — **เหลืออีก 2 ค่าที่ต้องเติมเอง**:

1. **DATABASE_URL** — Supabase Dashboard → Project Settings → **Database** → Connection string → **URI**
   - แนะนำใช้ **Connection pooler** (พอร์ต `6543`) และเติม `?sslmode=require` ต่อท้าย
   - ตัวอย่าง: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require`

2. **SUPABASE_JWT_SECRET** — *ไม่จำเป็นถ้าโปรเจกต์ใช้ asymmetric signing keys* (ES256/RS256)
   - backend จะดึง public key จาก `SUPABASE_URL/auth/v1/.well-known/jwks.json` มา verify เอง
   - ตั้งค่านี้เฉพาะโปรเจกต์เดิมที่ยังเซ็น token แบบ HS256 (Settings → API → JWT Secret)

## รัน

```bash
# จากโฟลเดอร์ backend/
go run ./cmd/server        # dev
go build -o server ./cmd/server && ./server   # build แล้วรัน
```

เซิร์ฟเวอร์ฟังที่ `http://localhost:8080`

ทดสอบสุขภาพ: `GET http://localhost:8080/health` → `{"status":"ok"}`

## API

ทุก endpoint ใต้ `/api/v1` ต้องส่ง header `Authorization: Bearer <supabase-access-token>`

| Method | Path | หมายเหตุ |
|---|---|---|
| GET/PUT | `/api/v1/profile` | โปรไฟล์/ตั้งค่าผู้ใช้ |
| GET/POST | `/api/v1/tasks` | งาน (Kanban) |
| PATCH/DELETE | `/api/v1/tasks/:id` | แก้ / ลบ (soft delete) |
| GET/POST | `/api/v1/logs` | บันทึกงานรายวัน |
| PATCH/DELETE | `/api/v1/logs/:id` | |
| GET/POST | `/api/v1/categories` | หมวดหมู่ (มี `isActive`) |
| PATCH/DELETE | `/api/v1/categories/:id` | |
| GET/POST | `/api/v1/tags` | แท็ก (มี `isActive`) |
| PATCH/DELETE | `/api/v1/tags/:id` | |
| GET/POST | `/api/v1/admin/users` | จัดการผู้ใช้ — **เฉพาะแอดมิน** |
| PATCH/DELETE | `/api/v1/admin/users/:id` | เปลี่ยน role / เปิด-ปิด / ลบ |

- `PATCH /admin/users/:id` รับ `{ "role": "admin"|"user" }` หรือ `{ "active": true|false }`
- การลบข้อมูล (tasks/logs/categories/tags) เป็น **soft delete** (`deleted_at`) — ข้อมูลไม่หายจริง

## หมายเหตุ

- โค้ดเชื่อมต่อ Postgres ในฐานะเจ้าของตาราง ซึ่ง **bypass RLS** — ความปลอดภัยจึงบังคับในชั้นโค้ด (กรอง `user_id` ทุก query) โดยมี RLS เป็นแนวกันสำรอง
- รองรับทั้ง asymmetric (ES256/RS256 ผ่าน JWKS) และ HS256 อัตโนมัติ — เลือกตาม `alg` ใน token
- **ยังไม่ได้ต่อ frontend เข้ากับ backend นี้** — ปัจจุบัน frontend ยังคุย Supabase ตรงๆ การสลับให้ frontend เรียก API นี้เป็นงานขั้นถัดไป
