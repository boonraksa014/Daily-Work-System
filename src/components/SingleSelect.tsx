"use client";

// SingleSelect — dropdown เลือกค่าเดียว สไตล์เข้าธีมแอป (ใช้แทน <select> ของระบบ ทั้งระบบ)
// เมนูใช้ position: fixed อิงตำแหน่งปุ่ม → ไม่ถูกตัดขอบเมื่ออยู่ใน modal/แถวที่ overflow
// และพลิกขึ้นบนอัตโนมัติถ้าด้านล่างพื้นที่ไม่พอ

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode; // emoji หรือจุดสี (ถ้ามี)
  dim?: boolean; // จาง (เช่น รายการที่ปิดใช้งาน)
}

const inputStyle: React.CSSProperties = {
  border: "2px solid var(--wt-border)", background: "var(--wt-soft)",
  color: "var(--wt-text)", fontFamily: "inherit",
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  disabled?: boolean;
  /** ใช้ในแถว/พื้นที่แคบ: ปุ่มขนาดเล็กลงและไม่เต็มความกว้าง */
  compact?: boolean;
  /** style เพิ่มเติมของปุ่ม (เช่น minWidth) */
  style?: React.CSSProperties;
}

const MENU_MAX_H = 248;

export function SingleSelect({ value, onChange, options, ariaLabel, disabled = false, compact = false, style }: Props) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // ปิดเมื่อเลื่อนหน้า/คอนเทนเนอร์ (กันเมนูหลุดจากปุ่ม) — แต่ไม่ปิดถ้าเลื่อน "ในเมนู" เอง
    const onScroll = (e: Event) => { if (menuRef.current?.contains(e.target as Node)) return; setOpen(false); };
    const onResize = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(o => !o);
  }

  const selected = options.find(o => o.value === value) ?? options[0];
  const isPlaceholder = !value;
  const fullWidth = !compact;

  // ตำแหน่งเมนู (พลิกขึ้นถ้าด้านล่างไม่พอ)
  const estHeight = Math.min(MENU_MAX_H, options.length * 42 + 8);
  const below = rect ? window.innerHeight - rect.bottom : 0;
  const openUp = rect ? below < estHeight && rect.top > below : false;
  const menuWidth = rect ? Math.max(rect.width, compact ? 160 : 0) : 0;

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        className={`${fullWidth ? "w-full flex" : "inline-flex"} ${compact ? "px-2.5 py-1.5" : "px-3 py-2.5"} rounded-xl outline-none items-center justify-between gap-2 transition-colors`}
        style={{ ...inputStyle, fontSize: compact ? "0.78rem" : "0.85rem", borderColor: open ? "#a78bfa" : "var(--wt-border)", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
        <span className="flex items-center gap-2 min-w-0" style={{ color: isPlaceholder ? "var(--wt-muted)" : "var(--wt-text)", fontWeight: isPlaceholder ? 400 : 600 }}>
          {!isPlaceholder && selected?.icon && <span className="flex items-center justify-center shrink-0" style={{ width: 18 }}>{selected.icon}</span>}
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDown size={16} style={{ color: "var(--wt-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
      </button>

      {open && rect && (
        <>
          {/* backdrop จับคลิกนอกเมนู */}
          <div className="fixed inset-0" style={{ zIndex: 90 }} onClick={() => setOpen(false)} />
          <div role="listbox" ref={menuRef} className="rounded-xl overflow-hidden"
            style={{
              position: "fixed",
              left: rect.left,
              width: menuWidth,
              top: openUp ? undefined : rect.bottom + 6,
              bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
              zIndex: 91,
              background: "var(--wt-card)",
              border: "1px solid var(--wt-border)",
              boxShadow: "0 14px 36px rgba(76,29,149,0.22)",
              animation: "wt-pop-in 0.14s ease-out",
            }}>
            <div style={{ maxHeight: MENU_MAX_H, overflowY: "auto" }}>
              {options.map(o => {
                const sel = o.value === value;
                return (
                  <button key={o.value || "__empty"} type="button" role="option" aria-selected={sel}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                    style={{ background: sel ? "var(--wt-soft2)" : "transparent", opacity: o.dim ? 0.55 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                    onMouseLeave={e => (e.currentTarget.style.background = sel ? "var(--wt-soft2)" : "transparent")}>
                    <span className="flex items-center justify-center shrink-0" style={{ width: 18 }}>{o.icon}</span>
                    <span className="flex-1 truncate" style={{ fontSize: "0.85rem", fontWeight: sel ? 700 : 500, color: o.value ? "var(--wt-text)" : "var(--wt-muted)" }}>{o.label}</span>
                    {sel && <Check size={15} color="#7c3aed" className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
