"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

function pad(n: number) { return String(n).padStart(2, "0"); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

interface DatePickerProps {
  value: string;                 // YYYY-MM-DD ("" = ยังไม่เลือก)
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  tone?: "light" | "default";    // light = บนพื้น gradient (ตัวอักษรขาว)
  placeholder?: string;
  clearable?: boolean;
  ariaLabel?: string;
}

const CAL_WIDTH = 268;

export function DatePicker({ value, onChange, min, max, tone = "default", placeholder = "เลือกวันที่", clearable, ariaLabel }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const today = new Date();
  const [view, setView] = useState(() => { const d = value ? parseKey(value) : today; return { y: d.getFullYear(), m: d.getMonth() }; });

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openAt(e: React.MouseEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(8, Math.min(r.left, window.innerWidth - CAL_WIDTH - 8));
    setPos({ x, y: r.bottom + 6 });
    if (value) { const d = parseKey(value); setView({ y: d.getFullYear(), m: d.getMonth() }); }
    setOpen(true);
  }

  function pick(day: number) {
    onChange(toKey(new Date(view.y, view.m, day)));
    setOpen(false);
  }

  const triggerLabel = value
    ? parseKey(value).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
    : placeholder;

  const triggerStyle: React.CSSProperties = tone === "light"
    ? { background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }
    : { background: "var(--wt-soft)", color: value ? "var(--wt-text)" : "var(--wt-muted)", border: "2px solid var(--wt-border)" };

  // calendar grid
  const first = new Date(view.y, view.m, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const todayKey = toKey(today);
  const disabled = (key: string) => (min !== undefined && key < min) || (max !== undefined && key > max);

  return (
    <>
      <button type="button" onClick={openAt} aria-label={ariaLabel ?? "เลือกวันที่"} aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-xl outline-none transition-colors"
        style={{ ...triggerStyle, padding: tone === "light" ? "0.35rem 0.7rem" : "0.55rem 0.8rem", fontSize: "0.8rem", fontWeight: 600 }}>
        <Calendar size={14} /> {triggerLabel}
      </button>

      {open && pos && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 90 }} onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="ปฏิทิน"
            className="fixed rounded-2xl p-3"
            style={{ top: pos.y, left: pos.x, width: CAL_WIDTH, zIndex: 91, background: "var(--wt-card)", border: "1px solid var(--wt-border)", boxShadow: "0 14px 36px rgba(76,29,149,0.22)" }}>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
                aria-label="เดือนก่อนหน้า" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--wt-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-text)" }}>{monthLabel}</span>
              <button type="button" onClick={() => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
                aria-label="เดือนถัดไป" className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--wt-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="text-center" style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--wt-muted)", padding: "2px 0" }}>{w}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: startOffset }, (_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const key = toKey(new Date(view.y, view.m, day));
                const selected = key === value;
                const isToday = key === todayKey;
                const off = disabled(key);
                return (
                  <button key={day} type="button" disabled={off} onClick={() => pick(day)}
                    className="rounded-lg transition-colors"
                    style={{
                      height: 32, fontSize: "0.8rem", fontWeight: selected || isToday ? 800 : 600,
                      cursor: off ? "not-allowed" : "pointer", opacity: off ? 0.3 : 1,
                      background: selected ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "transparent",
                      color: selected ? "#fff" : isToday ? "#7c3aed" : "var(--wt-text)",
                      border: isToday && !selected ? "1px solid #a78bfa" : "1px solid transparent",
                    }}
                    onMouseEnter={e => { if (!selected && !off) e.currentTarget.style.background = "var(--wt-soft2)"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}>
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid var(--wt-border)" }}>
              <button type="button" onClick={() => { onChange(todayKey); setOpen(false); }}
                style={{ fontSize: "0.76rem", fontWeight: 700, color: "#7c3aed" }}>วันนี้</button>
              {clearable && value && (
                <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                  className="inline-flex items-center gap-1" style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--wt-muted)" }}>
                  <X size={12} /> ล้าง
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
