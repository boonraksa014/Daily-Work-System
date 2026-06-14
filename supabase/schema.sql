-- TaskFlow — Supabase schema (relational, multi-user)
-- รันใน Supabase: Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run
-- รันซ้ำได้ (idempotent)

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ สิทธิ์ (Role)                                                  ║
-- ║ เก็บใน auth.users.app_metadata.role ('user' | 'admin')        ║
-- ║  • อยู่ใน JWT, ผู้ใช้แก้เองไม่ได้ (กันยกสิทธิ์ตัวเองเป็นแอดมิน) ║
-- ║  • helper is_admin() ใช้ในนโยบาย RLS ได้โดยไม่ recursion       ║
-- ╚══════════════════════════════════════════════════════════════╝
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ── profiles : ข้อมูลโปรไฟล์ที่ผู้ใช้แก้ได้ (1:1 กับ auth.users) ──
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'ผู้ใช้',
  job_title    text not null default '',     -- "ตำแหน่ง/บทบาท" ที่แสดงในโปรไฟล์ (คนละตัวกับ role สิทธิ์)
  avatar_color text not null default '#7c3aed',
  default_view text not null default 'dashboard',
  created_at   timestamptz not null default now()
);

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่ (แอดมินสร้างบัญชี)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── categories ──
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  emoji      text not null default '🏷️',
  color      text not null default '#7c3aed',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_user_idx on public.categories (user_id);

-- ── tasks ──
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  priority    text not null default 'medium' check (priority in ('low','medium','high')),
  status      text not null default 'todo'   check (status in ('todo','inprogress','done')),
  tags        text[] not null default '{}',
  due_date    date,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks (user_id);

-- ── log_entries ── (category เก็บเป็นชื่อ ให้ตรงกับ UI ปัจจุบัน)
create table if not exists public.log_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  title      text not null,
  note       text,
  hours      numeric(4,1) not null default 1,
  category   text not null default '',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists log_entries_user_idx on public.log_entries (user_id);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ Row Level Security : ทุกคนเห็น/แก้ได้เฉพาะข้อมูลของตัวเอง      ║
-- ╚══════════════════════════════════════════════════════════════╝
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.tasks       enable row level security;
alter table public.log_entries enable row level security;

-- profiles: เจ้าของ select/insert/update ได้ (role ไม่ได้อยู่ที่นี่ จึงยกสิทธิ์ไม่ได้)
drop policy if exists profiles_rw on public.profiles;
create policy profiles_rw on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- categories / tasks / log_entries: own-row ทุก operation
drop policy if exists categories_rw on public.categories;
create policy categories_rw on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tasks_rw on public.tasks;
create policy tasks_rw on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists log_entries_rw on public.log_entries;
create policy log_entries_rw on public.log_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- (อนาคต) ถ้าต้องการให้แอดมินดูข้อมูลทุกคนเพื่อทำรายงานรวม เพิ่มได้ เช่น:
--   create policy tasks_admin_read on public.tasks for select using (public.is_admin());

-- ╔══════════════════════════════════════════════════════════════╗
-- ║ ตั้งผู้ดูแลระบบคนแรก                                          ║
-- ║ 1) Authentication > Users > Add user (ใส่อีเมล+รหัส)          ║
-- ║ 2) รันคำสั่งนี้ (เปลี่ยนอีเมลเป็นของแอดมิน):                  ║
-- ║                                                              ║
-- ║   update auth.users                                          ║
-- ║   set raw_app_meta_data =                                    ║
-- ║       coalesce(raw_app_meta_data,'{}'::jsonb) ||             ║
-- ║       '{"role":"admin"}'::jsonb                              ║
-- ║   where email = 'admin@example.com';                        ║
-- ║                                                              ║
-- ║ จากนั้นแอดมินสร้าง/จัดการบัญชีอื่นได้ที่ ตั้งค่า > ผู้ใช้งาน   ║
-- ╚══════════════════════════════════════════════════════════════╝
