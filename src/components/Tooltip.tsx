"use client";

// Tooltip — ป้ายข้อความลอยสวย ๆ เข้าธีม ใช้แทน native title=
// ลอยแบบ fixed อิงตำแหน่ง trigger (ไม่โดนตัดขอบใน overflow/ตาราง) + พลิกลงล่างถ้าด้านบนไม่พอ

import { useState, useRef, type ReactNode, type CSSProperties } from "react";

interface Props {
  label: string;
  children: ReactNode;
  wrapperStyle?: CSSProperties;
}

export function Tooltip({ label, children, wrapperStyle }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const open = () => {
    const el = ref.current;
    if (!el || !label) return;
    const r = el.getBoundingClientRect();
    const below = r.top < 96; // ใกล้ขอบบน → แสดงด้านล่างแทน
    setTip({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const close = () => setTip(null);

  return (
    <span ref={ref} onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}
      style={{ display: "inline-block", maxWidth: "100%", ...wrapperStyle }}>
      {children}
      {tip && (
        <span role="tooltip"
          style={{
            position: "fixed", left: tip.x, top: tip.y,
            transform: `translate(-50%, ${tip.below ? "0" : "-100%"})`,
            maxWidth: 320, zIndex: 100, pointerEvents: "none",
            background: "var(--wt-text)", color: "var(--wt-card)",
            fontSize: "0.76rem", fontWeight: 600, lineHeight: 1.55,
            padding: "0.5rem 0.7rem", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(45,31,110,0.30)",
            whiteSpace: "pre-wrap", textAlign: "left",
            animation: "wt-pop-in 0.12s ease-out",
          }}>
          {label}
          {/* ลูกศร */}
          <span style={{
            position: "absolute", left: "50%", width: 9, height: 9,
            background: "var(--wt-text)", transform: "translateX(-50%) rotate(45deg)",
            [tip.below ? "top" : "bottom"]: -4,
          } as CSSProperties} />
        </span>
      )}
    </span>
  );
}
