/**
 * แบรนด์ TaskFlow — lockup: ไอคอนริบบอน (public/logo.png) + ตัวอักษร.
 * ตัวอักษรเป็น text จริง ปรับสีตามธีม ("Task" ใช้สีหลัก, "Flow" สีชมพูแบรนด์)
 * favicon อยู่ที่ app/icon.png และ app/apple-icon.png
 */
export function Logo({ iconSize = 32, showText = true }: { iconSize?: number; showText?: boolean }) {
  return (
    <div className="flex items-center" style={{ gap: showText ? iconSize * 0.22 : 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="TaskFlow"
        width={iconSize}
        height={iconSize}
        style={{ width: iconSize, height: iconSize, objectFit: "contain", flexShrink: 0 }}
      />
      {showText && (
        <span style={{ fontWeight: 900, fontSize: `${iconSize / 32}rem`, letterSpacing: "-0.015em", lineHeight: 1 }}>
          <span style={{ color: "var(--wt-text)" }}>Task</span>
          <span style={{ color: "#ec4899" }}>Flow</span>
        </span>
      )}
    </div>
  );
}
