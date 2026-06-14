"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface ManagedUser {
  id: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  lastSignInAt: string | null;
}

const inputStyle: React.CSSProperties = {
  border: "2px solid var(--wt-border)", background: "var(--wt-soft)",
  color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.88rem",
};

export default function UsersSettingsPage() {
  const { isAdmin, user, getToken } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);

  const api = useCallback(async (method: string, body?: unknown) => {
    const token = await getToken();
    const res = await fetch("/api/admin/users", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "เกิดข้อผิดพลาด");
    return json;
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const json = await api("GET");
      setUsers(json.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดรายชื่อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin, load]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError(null);
    try {
      await api("POST", { email: email.trim(), password, role });
      setEmail(""); setPassword(""); setRole("user");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  async function setUserRole(id: string, next: "admin" | "user") {
    setError(null);
    try { await api("PATCH", { id, role: next }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "เปลี่ยนสิทธิ์ไม่สำเร็จ"); }
  }

  async function removeUser(id: string, mail: string) {
    if (!confirm(`ลบบัญชี ${mail}? ข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบด้วย`)) return;
    setError(null);
    try { await api("DELETE", { id }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "ลบบัญชีไม่สำเร็จ"); }
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <div className="bg-white rounded-2xl p-6 text-center" style={{ border: "2px solid var(--wt-border)" }}>
          <p style={{ fontSize: "1.4rem" }}>🔒</p>
          <p className="mt-2" style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--wt-text)" }}>เฉพาะผู้ดูแลระบบ</p>
          <p style={{ fontSize: "0.82rem", color: "var(--wt-muted)" }}>หน้านี้ใช้จัดการบัญชีผู้ใช้ ต้องมีสิทธิ์ admin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>ผู้ใช้งาน</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>สร้างและจัดการบัญชีผู้ใช้ (เฉพาะแอดมิน)</p>

        {error && (
          <div className="mt-4 rounded-xl px-4 py-2.5" style={{ fontSize: "0.82rem", fontWeight: 700, background: "#fff1f2", color: "#e11d48" }}>{error}</div>
        )}

        {/* Create */}
        <form onSubmit={createUser} className="rounded-2xl p-4 mt-4 flex flex-wrap items-end gap-3" style={{ background: "var(--wt-soft)", border: "2px solid #a78bfa" }}>
          <div className="flex-1" style={{ minWidth: 180 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase" }}>อีเมล *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com"
              className="block w-full mt-1 px-3 py-2.5 rounded-xl outline-none" style={inputStyle} />
          </div>
          <div style={{ minWidth: 150 }}>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase" }}>รหัสผ่าน *</label>
            <input type="text" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัว"
              className="block w-full mt-1 px-3 py-2.5 rounded-xl outline-none" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase" }}>สิทธิ์</label>
            <select value={role} onChange={e => setRole(e.target.value as "admin" | "user")}
              className="block mt-1 px-3 py-2.5 rounded-xl outline-none" style={inputStyle}>
              <option value="user">ผู้ใช้</option>
              <option value="admin">แอดมิน</option>
            </select>
          </div>
          <button type="submit" disabled={creating} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-opacity"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.85rem", fontWeight: 800, border: "none", opacity: creating ? 0.6 : 1 }}>
            <Plus size={15} /> สร้างบัญชี
          </button>
        </form>

        {/* List */}
        <div className="space-y-2 mt-4">
          {loading && <p style={{ fontSize: "0.85rem", color: "var(--wt-muted)" }}>กำลังโหลด...</p>}
          {!loading && users.map(u => {
            const self = u.id === user?.id;
            const admin = u.role === "admin";
            return (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: admin ? "var(--wt-tint-orange)" : "var(--wt-soft2)", color: admin ? "var(--wt-c-prog-ink)" : "var(--wt-muted)" }}>
                  {admin ? <ShieldCheck size={17} /> : <UserIcon size={17} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--wt-text)" }}>
                    {u.email} {self && <span style={{ fontSize: "0.72rem", color: "var(--wt-muted)", fontWeight: 600 }}>(คุณ)</span>}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>{admin ? "แอดมิน" : "ผู้ใช้"} · {u.lastSignInAt ? "เคยเข้าใช้" : "ยังไม่เคยเข้า"}</p>
                </div>
                <select value={u.role} onChange={e => setUserRole(u.id, e.target.value as "admin" | "user")} disabled={self}
                  aria-label={`สิทธิ์ของ ${u.email}`}
                  className="px-2.5 py-1.5 rounded-lg outline-none shrink-0" style={{ ...inputStyle, fontSize: "0.78rem", opacity: self ? 0.5 : 1 }}>
                  <option value="user">ผู้ใช้</option>
                  <option value="admin">แอดมิน</option>
                </select>
                <button onClick={() => removeUser(u.id, u.email)} disabled={self} aria-label={`ลบ ${u.email}`}
                  className="p-2 rounded-xl transition-colors shrink-0" style={{ color: "#f43f5e", opacity: self ? 0.3 : 1 }}
                  onMouseEnter={e => { if (!self) e.currentTarget.style.background = "rgba(244,63,94,0.1)"; }}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {!loading && users.length === 0 && !error && (
            <p style={{ fontSize: "0.85rem", color: "var(--wt-muted)" }}>ยังไม่มีผู้ใช้</p>
          )}
        </div>
      </div>
    </div>
  );
}
