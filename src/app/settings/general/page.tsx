"use client";

import { useTheme } from "next-themes";
import { useData } from "@/lib/store";
import type { View } from "@/types";

const VIEW_LABELS: { value: View; label: string; emoji: string }[] = [
  { value: "dashboard", label: "ภาพรวม", emoji: "🏠" },
  { value: "kanban", label: "Kanban", emoji: "📋" },
  { value: "log", label: "บันทึกรายวัน", emoji: "✍️" },
  { value: "reports", label: "รายงาน", emoji: "📊" },
];

const THEMES: { value: string; label: string; emoji: string }[] = [
  { value: "light", label: "สว่าง", emoji: "☀️" },
  { value: "dark", label: "มืด", emoji: "🌙" },
  { value: "system", label: "ตามระบบ", emoji: "🖥️" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
      <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>{label}</p>
      {hint && <p style={{ fontSize: "0.74rem", color: "var(--wt-muted)", marginTop: 1 }}>{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function GeneralSettingsPage() {
  const { settings, updateSettings } = useData();
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto" style={{ maxWidth: 720 }}>
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>ทั่วไป</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>ปรับแต่งชื่อ ธีม และหน้าเริ่มต้น</p>

        <div className="space-y-2.5 mt-4">
        <Field label="ชื่อที่แสดง" hint="ใช้แสดงในแถบหัว (ตัวอักษรแรกเป็นไอคอนโปรไฟล์)">
          <input
            value={settings.displayName}
            onChange={e => updateSettings({ displayName: e.target.value })}
            placeholder="ชื่อของคุณ"
            className="w-full px-4 py-2.5 rounded-xl outline-none transition-colors"
            style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.9rem", maxWidth: 320 }}
            onFocus={e => (e.target.style.borderColor = "#a78bfa")}
            onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />
        </Field>

        <Field label="ธีม" hint="โหมดสีของแอป">
          <div className="inline-flex rounded-xl overflow-hidden flex-wrap" style={{ border: "1px solid var(--wt-border)" }}>
            {THEMES.map(t => {
              const active = (theme ?? "light") === t.value;
              return (
                <button key={t.value} onClick={() => setTheme(t.value)} aria-pressed={active}
                  className="flex items-center gap-1.5"
                  style={{ padding: "0.5rem 0.95rem", fontSize: "0.82rem", fontWeight: 700,
                    background: active ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "var(--wt-card)",
                    color: active ? "#fff" : "var(--wt-muted)" }}>
                  <span>{t.emoji}</span> {t.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="หน้าเริ่มต้น" hint="หน้าที่จะเปิดเมื่อเข้าแอป">
          <div className="flex flex-wrap gap-2">
            {VIEW_LABELS.map(v => {
              const active = settings.defaultView === v.value;
              return (
                <button key={v.value} onClick={() => updateSettings({ defaultView: v.value })} aria-pressed={active}
                  className="flex items-center gap-1.5 rounded-xl transition-colors"
                  style={{ padding: "0.5rem 0.9rem", fontSize: "0.82rem", fontWeight: 700,
                    background: active ? "var(--wt-soft2)" : "var(--wt-card)",
                    color: active ? "#7c3aed" : "var(--wt-muted)",
                    border: `1px solid ${active ? "#a78bfa" : "var(--wt-border)"}` }}>
                  <span>{v.emoji}</span> {v.label}
                </button>
              );
            })}
          </div>
        </Field>
        </div>
      </div>
    </div>
  );
}
