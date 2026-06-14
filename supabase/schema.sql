-- TaskFlow — Supabase schema
-- รันไฟล์นี้ใน Supabase: Dashboard > SQL Editor > New query > วาง > Run

-- เก็บข้อมูลทั้งหมดของผู้ใช้แต่ละคนเป็น JSON หนึ่งแถว (tasks/logs/categories/settings)
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- เปิด Row Level Security: แต่ละคนเห็น/แก้ได้เฉพาะแถวของตัวเอง
alter table public.user_data enable row level security;

drop policy if exists "own row select" on public.user_data;
create policy "own row select" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "own row insert" on public.user_data;
create policy "own row insert" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "own row update" on public.user_data;
create policy "own row update" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own row delete" on public.user_data;
create policy "own row delete" on public.user_data
  for delete using (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────
-- สิทธิ์ (Role): เก็บใน app_metadata ของ auth.users ("user" | "admin")
--   • ผู้ใช้แก้ค่านี้เองไม่ได้ (แก้ได้ผ่าน service role เท่านั้น)
--   • ใช้ขยาย role/permission อื่นในอนาคตได้ (เพิ่มคีย์ใน app_metadata)
--
-- ตั้งผู้ดูแลระบบคนแรก: สร้างบัญชีก่อน (Authentication > Users > Add user)
-- แล้วรันคำสั่งนี้โดยเปลี่ยนอีเมลเป็นของแอดมิน:
--
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   where email = 'admin@example.com';
--
-- หลังจากนั้นแอดมินสร้าง/จัดการบัญชีอื่นได้จากในแอป (ตั้งค่า > ผู้ใช้งาน)
-- ───────────────────────────────────────────────────────────────
