/**
 * แบรนด์ TaskFlow — lockup: ไอคอนเช็ค (tile ไล่สีม่วง→ชมพู) + ตัวอักษร.
 * ตัวอักษรเป็น text จริง ปรับสีตามธีม ("Task" ใช้สีหลัก, "Flow" สีชมพูแบรนด์)
 * ไอคอนล้วนอยู่ที่ app/icon.svg (favicon)
 */
export function Logo({ iconSize = 38, showText = true }: { iconSize?: number; showText?: boolean }) {
  return (
    <div className="flex items-center" style={{ gap: showText ? 10 : 0 }}>
      <div style={{ borderRadius: iconSize * 0.28, boxShadow: "0 4px 12px rgba(124,58,237,0.4)", lineHeight: 0 }}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TaskFlow">
          <defs>
            <linearGradient id="wt-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c3aed" />
              <stop offset="1" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="10" fill="url(#wt-logo)" />
          <path d="M9 16.6l4.6 4.6L23 10.8" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {showText && (
        <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "-0.015em", lineHeight: 1 }}>
          <span style={{ color: "var(--wt-text)" }}>Task</span>
          <span style={{ color: "#ec4899" }}>Flow</span>
        </span>
      )}
    </div>
  );
}
