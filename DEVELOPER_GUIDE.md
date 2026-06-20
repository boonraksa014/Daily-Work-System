# คู่มือแก้โค้ด (สำหรับเจ้าของโปรเจกต์)

เอกสารนี้บอกว่า "อยากแก้อะไร ต้องไปไฟล์ไหน" เขียนให้คนที่ไม่ได้เป็นโปรแกรมเมอร์อ่านเข้าใจได้

## ภาพรวมระบบ

```
ผู้ใช้เปิดเว็บ → Frontend (Next.js, โฟลเดอร์ src/) 
                  └─เรียก API→ Backend (Go, โฟลเดอร์ backend/) 
                                  └─เก็บข้อมูล→ Supabase (ฐานข้อมูล + ระบบล็อกอิน)
```

- **Frontend** = หน้าตาเว็บที่ผู้ใช้เห็น (ปุ่ม, สี, ข้อความ, ฟอร์ม) → อยู่ใน `src/`
- **Backend** = ตัวกลางรับ-ส่งข้อมูลกับฐานข้อมูล → อยู่ใน `backend/`
- **Supabase** = ที่เก็บข้อมูลจริง + ระบบล็อกอิน (จัดการผ่านเว็บ supabase.com ไม่ใช่ในโค้ด)

> **deploy:** แค่ `git push` ขึ้น branch `main` → เว็บจริงอัปเดตให้อัตโนมัติ (Vercel + Render) ดูรายละเอียดท้ายไฟล์

---

## 🎨 อยากแก้หน้าตา / ข้อความ / สี

| อยากแก้ | ไปที่ไฟล์ |
|---|---|
| เมนูด้านซ้าย (เพิ่ม/แก้ชื่อเมนู) | [src/components/AppShell.tsx](src/components/AppShell.tsx) — ดูตัวแปร `NAV_ITEMS` และ `SETTINGS_ITEMS` |
| สีหลักของแอป (ม่วง-ชมพู) | [src/styles/theme.css](src/styles/theme.css) — ตัวแปร `--wt-*` |
| หน้าภาพรวม (Dashboard) | [src/components/DashboardView.tsx](src/components/DashboardView.tsx) |
| หน้า Kanban (การ์ดงาน) | [src/components/KanbanBoard.tsx](src/components/KanbanBoard.tsx) |
| หน้าบันทึกรายวัน | [src/components/DailyLog.tsx](src/components/DailyLog.tsx) |
| หน้ารายงาน/กราฟ | [src/components/Reports.tsx](src/components/Reports.tsx) |
| หน้าจอล็อกอิน | [src/components/AuthGate.tsx](src/components/AuthGate.tsx) |
| โลโก้ | [src/components/Logo.tsx](src/components/Logo.tsx) |

## 📋 อยากแก้ข้อมูลตั้งต้น (ของผู้ใช้ใหม่)

- **หมวดหมู่เริ่มต้น / งานตัวอย่าง** → [src/data/seed.ts](src/data/seed.ts)

## 🗄️ อยากเพิ่ม "ฟิลด์ข้อมูล" ใหม่ (เช่น เพิ่มช่องในงาน)

เพิ่มฟิลด์ต้องแก้ 4 ที่ให้ตรงกัน (ไม่งั้นข้อมูลจะไม่ไหลครบ):
1. **ฐานข้อมูล** — เพิ่ม column ใน [supabase/schema.sql](supabase/schema.sql) แล้วรันใน Supabase
2. **Backend** — รับ/ส่งฟิลด์ใน `backend/internal/handlers/<ชื่อ>.go`
3. **Frontend ชนิดข้อมูล** — [src/types.ts](src/types.ts) หรือใน component
4. **Frontend ตัวเชื่อม** — [src/lib/store.tsx](src/lib/store.tsx) (ตรงส่วน mapper `xxxFromApi` / `xxxBody`)

## 🔌 อยากเพิ่ม/แก้ API (ฝั่ง Backend)

- **เพิ่ม endpoint ใหม่** → [backend/cmd/server/main.go](backend/cmd/server/main.go) (ผูก route) + เขียน handler ใน `backend/internal/handlers/`
- **ตรรกะแต่ละ resource** อยู่แยกไฟล์: `tasks.go`, `logs.go`, `categories.go`, `tags.go`, `profile.go`, `users.go`
- **ระบบล็อกอิน/สิทธิ์** → `backend/internal/middleware/auth.go`

## 🔐 ตั้งค่าลับ (env)

- **Local (เครื่องตัวเอง):** `backend/.env` และ `.env.local` (ไฟล์ลับ ไม่ขึ้น git)
- **Production:** ตั้งในหน้าเว็บ Render (backend) และ Vercel (frontend) — ดูรายชื่อ env ใน `backend/.env.example` และ `.env.local.example`

---

## 🚀 วิธีรันบนเครื่องตัวเอง (ก่อน push ขึ้นจริง)

เปิด 2 terminal:

```bash
# Terminal 1 — backend
cd backend
go run ./cmd/server          # รันที่ http://localhost:8080

# Terminal 2 — frontend
corepack pnpm dev            # รันที่ http://localhost:3000
```

เปิด http://localhost:3000 ทดสอบ แก้โค้ดแล้วหน้าเว็บอัปเดตให้เองทันที (hot reload)

## 📤 วิธีเอาขึ้นเว็บจริง

```bash
git add -A
git commit -m "อธิบายสั้นๆ ว่าแก้อะไร"
git push origin main
```

push เสร็จ → Vercel (frontend) + Render (backend) จะ build + deploy ให้เองภายในไม่กี่นาที

## 🌐 ลิงก์ระบบจริง

- เว็บแอป: https://daily-work-system.vercel.app
- Backend API: https://daily-work-system.onrender.com
- จัดการ frontend: https://vercel.com
- จัดการ backend: https://render.com
- จัดการฐานข้อมูล/ผู้ใช้: https://supabase.com

> ⚠️ ก่อนแก้แล้ว push: ลองรันบนเครื่อง (ข้อด้านบน) ให้แน่ใจว่าไม่ error ก่อน — ถ้า build พังบน Vercel/Render เว็บจริงจะยังใช้ตัวเก่าอยู่ (ไม่พัง) แต่ของใหม่จะไม่ขึ้นจนกว่าจะแก้ให้ build ผ่าน
