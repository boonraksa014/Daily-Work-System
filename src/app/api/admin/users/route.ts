import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Role = "admin" | "user";

// ตรวจว่า caller เป็น admin จริง (verify token ด้วย service client + เช็ค role ใน app_metadata)
async function requireAdmin(req: NextRequest) {
  if (!supabaseAdmin) return { error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY", status: 500 as const };
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "ไม่ได้เข้าสู่ระบบ", status: 401 as const };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: "เซสชันไม่ถูกต้อง", status: 401 as const };
  if ((data.user.app_metadata?.role as Role) !== "admin") return { error: "ต้องเป็นผู้ดูแลระบบ", status: 403 as const };
  return { user: data.user };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await supabaseAdmin!.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const now = Date.now();
  const users = data.users
    .map(u => {
      const bannedUntil = (u as { banned_until?: string | null }).banned_until ?? null;
      const active = !bannedUntil || new Date(bannedUntil).getTime() <= now;
      return { id: u.id, email: u.email ?? "", role: (u.app_metadata?.role as Role) ?? "user", active, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at ?? null };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const role: Role = body.role === "admin" ? "admin" : "user";
  if (!email || password.length < 6) return NextResponse.json({ error: "ต้องมีอีเมลและรหัสผ่านอย่างน้อย 6 ตัว" }, { status: 400 });
  const { data, error } = await supabaseAdmin!.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: { id: data.user.id, email: data.user.email, role } });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });

  // เปิด/ปิดการใช้งานบัญชี (ban/unban)
  if (typeof body.active === "boolean") {
    if (id === auth.user.id) return NextResponse.json({ error: "ปิดการใช้งานบัญชีตัวเองไม่ได้" }, { status: 400 });
    const ban_duration = body.active ? "none" : "876000h"; // ~100 ปี = ปิดถาวรจนกว่าจะเปิดใหม่
    const { error } = await supabaseAdmin!.auth.admin.updateUserById(id, { ban_duration });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // เปลี่ยนสิทธิ์ (role)
  const role: Role = body.role === "admin" ? "admin" : "user";
  if (id === auth.user.id && role !== "admin") return NextResponse.json({ error: "ถอดสิทธิ์แอดมินของตัวเองไม่ได้" }, { status: 400 });
  const { error } = await supabaseAdmin!.auth.admin.updateUserById(id, { app_metadata: { role } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });
  if (id === auth.user.id) return NextResponse.json({ error: "ลบบัญชีตัวเองไม่ได้" }, { status: 400 });
  const { error } = await supabaseAdmin!.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
