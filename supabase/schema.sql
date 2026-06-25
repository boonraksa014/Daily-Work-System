-- TaskFlow — Supabase schema (relational, multi-user, audited)
-- รันใน Supabase: SQL Editor > วางทั้งไฟล์ > Run (รันซ้ำได้)
--
-- หมายเหตุการออกแบบ
--  • RLS ทุกตาราง: เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง (auth.uid() = user_id)
--  • role อยู่ใน auth.users.app_metadata ('user'|'admin') — ผู้ใช้แก้เองไม่ได้
--  • Audit ทุกตารางข้อมูล: created/updated/deleted + _by_id (ใคร) + _at (เมื่อไร)
--  • Soft delete: ลบ = ตั้ง deleted_at/deleted_by_id (ไม่ลบแถวจริง) → query กรอง deleted_at is null
--  • FK เชื่อมตาราง: log_entries.category_id → categories.id

-- ── helper: เช็คแอดมินจาก JWT (ใช้ใน RLS ได้โดยไม่ recursion) ──
create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ── trigger: เซ็ต updated_at / updated_by_id อัตโนมัติทุกครั้งที่ UPDATE ──
create or replace function public.tg_touch_audit()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by_id := auth.uid();
  return new;
end;
$$;

-- ══════════════════════════ profiles ══════════════════════════
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default 'ผู้ใช้',
  job_title     text not null default '',
  avatar_color  text not null default '#7c3aed',
  default_view  text not null default 'dashboard',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by_id uuid references auth.users (id) on delete set null
);

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.tg_touch_audit();

-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้ใหม่
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- handle_new_user เป็น SECURITY DEFINER สำหรับ trigger เท่านั้น — ไม่ให้เรียกผ่าน API
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ══════════════════════════ categories ══════════════════════════
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  emoji         text not null default '🏷️',
  color         text not null default '#7c3aed',
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by_id uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id uuid references auth.users (id) on delete set null
);
create index if not exists categories_user_active_idx on public.categories (user_id) where deleted_at is null;

drop trigger if exists touch_categories on public.categories;
create trigger touch_categories before update on public.categories
  for each row execute function public.tg_touch_audit();

-- ══════════════════════════ tags (master) ══════════════════════════
create table if not exists public.tags (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by_id uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id uuid references auth.users (id) on delete set null
);
create unique index if not exists tags_user_name_uidx on public.tags (user_id, name) where deleted_at is null;

drop trigger if exists touch_tags on public.tags;
create trigger touch_tags before update on public.tags
  for each row execute function public.tg_touch_audit();

-- ══════════════════════════ projects (master) ══════════════════════════
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  color         text not null default '#7c3aed',
  sort_order    int  not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by_id uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id uuid references auth.users (id) on delete set null
);
create index if not exists projects_user_active_idx on public.projects (user_id) where deleted_at is null;

drop trigger if exists touch_projects on public.projects;
create trigger touch_projects before update on public.projects
  for each row execute function public.tg_touch_audit();

-- ══════════════════════════ tasks ══════════════════════════
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  description   text,
  priority      text not null default 'medium' check (priority in ('low','medium','high')),
  status        text not null default 'todo'   check (status in ('todo','inprogress','done')),
  tags          text[] not null default '{}',
  due_date      date,
  project_id    uuid references public.projects (id) on delete set null,
  category_id   uuid references public.categories (id) on delete set null,
  completed_at  date,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  created_by_id uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id uuid references auth.users (id) on delete set null
);
create index if not exists tasks_user_active_idx on public.tasks (user_id) where deleted_at is null;
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_category_idx on public.tasks (category_id);

drop trigger if exists touch_tasks on public.tasks;
create trigger touch_tasks before update on public.tasks
  for each row execute function public.tg_touch_audit();

-- ══════════════════════════ log_entries ══════════════════════════
create table if not exists public.log_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  entry_date    date not null,
  title         text not null,
  note          text,
  hours         numeric(4,1) not null default 1,
  category_id   uuid references public.categories (id) on delete set null,
  task_id       uuid references public.tasks (id) on delete set null,
  project_id    uuid references public.projects (id) on delete set null,
  done          boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by_id uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id uuid references auth.users (id) on delete set null
);
create index if not exists log_entries_user_active_idx on public.log_entries (user_id) where deleted_at is null;
create index if not exists log_entries_category_idx on public.log_entries (category_id);
create index if not exists log_entries_task_idx on public.log_entries (task_id);
create index if not exists log_entries_project_idx on public.log_entries (project_id);

drop trigger if exists touch_log_entries on public.log_entries;
create trigger touch_log_entries before update on public.log_entries
  for each row execute function public.tg_touch_audit();

-- ══════════════════════════ Grants ══════════════════════════
-- ให้สิทธิ์ระดับตารางแก่ role ของ Supabase (ความปลอดภัยระดับแถวคุมด้วย RLS ด้านล่าง)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ══════════════════════════ Row Level Security ══════════════════════════
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.tags        enable row level security;
alter table public.projects    enable row level security;
alter table public.tasks       enable row level security;
alter table public.log_entries enable row level security;

drop policy if exists profiles_rw on public.profiles;
create policy profiles_rw on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists categories_rw on public.categories;
create policy categories_rw on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tags_rw on public.tags;
create policy tags_rw on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists projects_rw on public.projects;
create policy projects_rw on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists tasks_rw on public.tasks;
create policy tasks_rw on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists log_entries_rw on public.log_entries;
create policy log_entries_rw on public.log_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- (อนาคต) ให้แอดมินดูข้อมูลทุกคนเพื่อรายงานรวม:
--   create policy tasks_admin_read on public.tasks for select using (public.is_admin());

-- ══════════════════════════ ตั้งแอดมินคนแรก ══════════════════════════
-- 1) Authentication > Users > Add user (อีเมล + รหัส)
-- 2) รัน (เปลี่ยนอีเมล):
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
--   where email = 'admin@example.com';
