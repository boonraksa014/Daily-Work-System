// Smoke test ทั้งสแตก: ล็อกอินผ่าน Supabase จริง → ยิงทุก endpoint ของ Go backend → สรุปผ่าน/ไม่ผ่าน
//
// วิธีรัน (จาก root ของโปรเจกต์):
//   node scripts/smoke.mjs <email> <password>
//   หรือ:  TEST_EMAIL=... TEST_PASSWORD=... node scripts/smoke.mjs
//
// ค่า SUPABASE_URL / ANON_KEY / API_URL อ่านจาก .env.local ให้อัตโนมัติ
// ทดสอบ backend ตัวไหน: ตั้ง API_URL=... (ดีฟอลต์ใช้ NEXT_PUBLIC_API_URL ใน .env.local)
//
// สร้าง "ผู้ใช้ทดสอบ" แยกไว้สักบัญชี (ตั้งค่า → ผู้ใช้งาน) แล้วใช้บัญชีนั้นรัน จะได้ไม่ปนข้อมูลจริง

import fs from "node:fs";
import { randomUUID } from "node:crypto";

// ── โหลด .env.local ──
function loadEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch { /* ไม่มีไฟล์ก็ข้าม */ }
  return out;
}
const env = loadEnv(".env.local");
const SUPABASE_URL = process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API = (process.env.API_URL || env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
const EMAIL = process.env.TEST_EMAIL || process.argv[2];
const PASSWORD = process.env.TEST_PASSWORD || process.argv[3];

if (!SUPABASE_URL || !ANON) { console.error("ขาด NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (.env.local)"); process.exit(2); }
if (!EMAIL || !PASSWORD) { console.error("ใส่อีเมล+รหัสผ่าน: node scripts/smoke.mjs <email> <password>"); process.exit(2); }

// ── ตัวช่วยรายงานผล ──
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { fail++; console.log(`  \x1b[31m✗\x1b[0m ${name} \x1b[2m${detail}\x1b[0m`); }
};
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

let token = "";
async function api(method, path, body, useToken = true) {
  const headers = { "Content-Type": "application/json" };
  if (useToken) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}/api/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  if (r.status !== 204) { try { json = await r.json(); } catch { /* ไม่ใช่ json */ } }
  return { status: r.status, json };
}

async function main() {
  console.log(`API: ${API}\nuser: ${EMAIL}`);

  // ── 1) health / liveness (ไม่ต้อง auth) ──
  section("Health");
  const h = await fetch(`${API}/health`).then(r => r.status).catch(() => 0);
  ok("GET /health = 200", h === 200, `ได้ ${h}`);
  const lv = await fetch(`${API}/live`).then(r => r.status).catch(() => 0);
  ok("GET /live = 200", lv === 200, `ได้ ${lv}`);

  // ── 2) auth gate (ไม่มี token ต้อง 401) ──
  section("Auth gate");
  const noTok = await api("GET", "/tasks", null, false);
  ok("ไม่มี token → 401", noTok.status === 401, `ได้ ${noTok.status}`);

  // ── 3) ล็อกอินผ่าน Supabase ──
  section("Login (Supabase)");
  const lr = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const lj = await lr.json().catch(() => ({}));
  token = lj.access_token || "";
  ok("ขอ access token ได้", !!token, lj.error_description || lj.msg || "");
  if (!token) { summary(); process.exit(1); }

  // ── 4) profile ──
  section("Profile");
  const p = await api("GET", "/profile");
  ok("GET /profile = 200", p.status === 200);
  const pu = await api("PUT", "/profile", { displayName: p.json?.displayName || "ผู้ใช้", role: "tester", avatarColor: "#7c3aed", defaultView: "dashboard" });
  ok("PUT /profile = 200", pu.status === 200);
  ok("PUT บันทึก role ได้", pu.json?.role === "tester", `ได้ ${pu.json?.role}`);

  // ── 5) categories (CRUD) ──
  section("Categories");
  const catId = randomUUID();
  const cc = await api("POST", "/categories", { id: catId, name: "หมวดทดสอบ", emoji: "🧪", color: "#10b981", isActive: true });
  ok("POST = 201", cc.status === 201, `ได้ ${cc.status}`);
  const cl = await api("GET", "/categories");
  ok("GET เจอที่เพิ่ง POST", Array.isArray(cl.json?.categories) && cl.json.categories.some(c => c.id === catId));
  const cp = await api("PATCH", `/categories/${catId}`, { name: "หมวดทดสอบ", emoji: "🧪", color: "#10b981", isActive: false });
  ok("PATCH ปิดใช้งาน → isActive=false", cp.status === 200 && cp.json?.isActive === false);

  // ── 6) tags (CRUD) ──
  section("Tags");
  const tagId = randomUUID();
  const tc = await api("POST", "/tags", { id: tagId, name: `smoke-${tagId.slice(0, 6)}`, isActive: true });
  ok("POST = 201", tc.status === 201, `ได้ ${tc.status}`);
  const tp = await api("PATCH", `/tags/${tagId}`, { name: `smoke-${tagId.slice(0, 6)}`, isActive: false });
  ok("PATCH = 200", tp.status === 200 && tp.json?.isActive === false);

  // ── 7) tasks (CRUD) ──
  section("Tasks");
  const taskId = randomUUID();
  const kc = await api("POST", "/tasks", { id: taskId, title: "งานทดสอบ smoke", priority: "high", status: "todo", tags: ["smoke"], dueDate: null });
  ok("POST = 201", kc.status === 201, `ได้ ${kc.status}`);
  const kp = await api("PATCH", `/tasks/${taskId}`, { title: "งานทดสอบ smoke", priority: "high", status: "inprogress", tags: ["smoke"], dueDate: null });
  ok("PATCH ย้ายสถานะ → inprogress", kp.status === 200 && kp.json?.status === "inprogress");

  // ── 8) logs (CRUD + ผูก category & task) ──
  section("Logs");
  const logId = randomUUID();
  const gc = await api("POST", "/logs", { id: logId, date: new Date().toISOString().slice(0, 10), title: "บันทึกทดสอบ", note: "smoke", hours: 2.5, categoryId: catId, taskId, done: false });
  ok("POST = 201", gc.status === 201, `ได้ ${gc.status}`);
  ok("ผูก task ได้ (taskId ตรง)", gc.json?.taskId === taskId);
  ok("ผูก category ได้ (คืนชื่อหมวด)", typeof gc.json?.category === "string" && gc.json.category.length > 0);
  const gp = await api("PATCH", `/logs/${logId}`, { date: gc.json.date, title: "บันทึกทดสอบ", note: "smoke", hours: 4, categoryId: catId, taskId, done: true });
  ok("PATCH ชั่วโมง+done", gp.status === 200 && gp.json?.hours === 4 && gp.json?.done === true);

  // ── 9) admin users (เฉพาะถ้าเป็นแอดมิน) ──
  section("Admin users");
  const au = await api("GET", "/admin/users");
  if (au.status === 403) ok("ไม่ใช่แอดมิน → 403 (ถูกต้อง)", true);
  else ok("GET /admin/users = 200 (แอดมิน)", au.status === 200 && Array.isArray(au.json?.users), `ได้ ${au.status}`);

  // ── 10) cleanup (soft delete ทุกอย่างที่สร้าง) ──
  section("Cleanup");
  const d1 = await api("DELETE", `/logs/${logId}`);
  ok("DELETE log = 204", d1.status === 204);
  const d2 = await api("DELETE", `/tasks/${taskId}`);
  ok("DELETE task = 204", d2.status === 204);
  const d3 = await api("DELETE", `/tags/${tagId}`);
  ok("DELETE tag = 204", d3.status === 204);
  const d4 = await api("DELETE", `/categories/${catId}`);
  ok("DELETE category = 204", d4.status === 204);
  const after = await api("GET", "/tasks");
  ok("งานที่ลบหายจากลิสต์แล้ว", !after.json?.tasks?.some(t => t.id === taskId));

  summary();
  process.exit(fail ? 1 : 0);
}

function summary() {
  console.log(`\n\x1b[1mสรุป:\x1b[0m \x1b[32m${pass} ผ่าน\x1b[0m, ${fail ? `\x1b[31m${fail} ไม่ผ่าน\x1b[0m` : "0 ไม่ผ่าน"}`);
}

main().catch(e => { console.error("error:", e.message); process.exit(1); });
