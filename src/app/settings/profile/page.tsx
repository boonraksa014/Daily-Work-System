"use client";

import { LogOut } from "lucide-react";
import { useData } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const SWATCHES = ["#7c3aed", "#ec4899", "#0ea5e9", "#059669", "#d97706", "#db2777", "#0891b2", "#475569"];

const inputStyle: React.CSSProperties = {
  border: "2px solid var(--wt-border)", background: "var(--wt-soft)",
  color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.9rem",
};

export default function ProfileSettingsPage() {
  const { settings, updateSettings } = useData();
  const { user, signOut } = useAuth();
  const initial = (settings.displayName.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>โปรไฟล์</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>ข้อมูลตัวตนที่แสดงในแอป</p>

        {/* Preview */}
        <div className="flex items-center gap-4 rounded-2xl p-4 mt-4" style={{ background: "var(--wt-soft)", border: "1px solid var(--wt-border)" }}>
          <div className="rounded-2xl flex items-center justify-center shrink-0"
            style={{ width: 64, height: 64, background: settings.avatarColor, boxShadow: `0 6px 18px ${settings.avatarColor}55` }}>
            <span style={{ fontSize: "1.7rem", fontWeight: 900, color: "#fff" }}>{initial}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>{settings.displayName || "—"}</p>
            <p className="truncate" style={{ fontSize: "0.82rem", color: "var(--wt-muted)" }}>{settings.role || "ยังไม่ได้ระบุตำแหน่ง"}</p>
          </div>
        </div>

        <div className="space-y-2.5 mt-4">
          {/* Name */}
          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>ชื่อที่แสดง</p>
            <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>ตัวอักษรแรกใช้เป็นไอคอนโปรไฟล์</p>
            <input value={settings.displayName} onChange={e => updateSettings({ displayName: e.target.value })} placeholder="ชื่อของคุณ"
              className="w-full mt-3 px-4 py-2.5 rounded-xl outline-none transition-colors"
              style={{ ...inputStyle, maxWidth: 360 }}
              onFocus={e => (e.target.style.borderColor = "#a78bfa")} onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />
          </div>

          {/* Role */}
          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>ตำแหน่ง / บทบาท</p>
            <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>เช่น ฟรีแลนซ์ นักพัฒนา</p>
            <input value={settings.role} onChange={e => updateSettings({ role: e.target.value })} placeholder="ตำแหน่งของคุณ"
              className="w-full mt-3 px-4 py-2.5 rounded-xl outline-none transition-colors"
              style={{ ...inputStyle, maxWidth: 360 }}
              onFocus={e => (e.target.style.borderColor = "#a78bfa")} onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />
          </div>

          {/* Avatar color */}
          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>สีไอคอนโปรไฟล์</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {SWATCHES.map(c => {
                const active = settings.avatarColor.toLowerCase() === c;
                return (
                  <button key={c} onClick={() => updateSettings({ avatarColor: c })} aria-label={`สี ${c}`} aria-pressed={active}
                    className="rounded-full transition-transform"
                    style={{ width: 30, height: 30, background: c, border: active ? "3px solid var(--wt-card)" : "3px solid transparent", boxShadow: active ? `0 0 0 2px ${c}` : "none", transform: active ? "scale(1.1)" : "scale(1)" }} />
                );
              })}
              <label className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 cursor-pointer" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-soft)" }}>
                <input type="color" value={settings.avatarColor} onChange={e => updateSettings({ avatarColor: e.target.value })} aria-label="สีกำหนดเอง"
                  style={{ width: 22, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer" }} />
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--wt-muted)" }}>กำหนดเอง</span>
              </label>
            </div>
          </div>

          {/* Account */}
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>บัญชี</p>
              <p className="truncate" style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>{user?.email ?? "—"}</p>
            </div>
            <button onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl shrink-0 transition-colors"
              style={{ border: "1px solid #fecdd3", color: "#e11d48", fontSize: "0.82rem", fontWeight: 800, background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <LogOut size={15} /> ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
