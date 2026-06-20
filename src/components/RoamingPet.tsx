"use client";

// น้องแมวเดินเล่นที่ขอบล่างจอ (สไตล์ VS Code Pets) — SVG วาดเอง ขาแกว่ง+หางสะบัด
// ของตกแต่งล้วน: ไม่ขวางการคลิก (pointer-events:none) และปิดเมื่อ prefers-reduced-motion
export function RoamingPet() {
  return (
    <div
      className="wt-roam-pet"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        bottom: 6,
        zIndex: 40,
        pointerEvents: "none",
        animation: "wt-walk 40s linear infinite",
      }}
    >
      <span style={{ display: "inline-block", animation: "wt-bob 0.4s ease-in-out infinite", filter: "drop-shadow(0 4px 4px rgba(45,31,110,0.25))" }}>
        <CatSvg />
      </span>
    </div>
  );
}

function CatSvg() {
  // แมวมุมข้าง หันขวา (ตอนเดินกลับ wrapper จะ scaleX(-1) ให้หันซ้ายเอง)
  return (
    <svg width="52" height="38" viewBox="0 0 56 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* tail */}
      <path className="wt-cat-tail" d="M12 22 C 4 20, 2 10, 8 3" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
      {/* legs (สลับเฟสด้วย animationDelay) */}
      <rect className="wt-cat-leg" style={{ animationDelay: "-0.2s" }} x="16" y="23" width="4" height="12" rx="2" fill="#7c3aed" />
      <rect className="wt-cat-leg" x="23" y="23" width="4" height="12" rx="2" fill="#8b5cf6" />
      <rect className="wt-cat-leg" x="34" y="23" width="4" height="12" rx="2" fill="#7c3aed" />
      <rect className="wt-cat-leg" style={{ animationDelay: "-0.2s" }} x="41" y="23" width="4" height="12" rx="2" fill="#8b5cf6" />
      {/* body */}
      <ellipse cx="28" cy="19" rx="18" ry="9" fill="#a78bfa" />
      {/* head */}
      <circle cx="45" cy="15" r="8.5" fill="#a78bfa" />
      {/* ears */}
      <path d="M38 8 L40 1 L45 6 Z" fill="#a78bfa" />
      <path d="M48 6 L53 1 L53 9 Z" fill="#a78bfa" />
      <path d="M40 6.5 L41.4 3 L43.4 5.5 Z" fill="#7c3aed" />
      {/* eye + nose */}
      <circle cx="46.5" cy="14" r="1.5" fill="#2d1f6e" />
      <circle cx="52.6" cy="16" r="1" fill="#f472b6" />
    </svg>
  );
}
