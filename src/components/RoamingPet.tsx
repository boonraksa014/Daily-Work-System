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
  // แมวชิบิมุมข้าง หันขวา (ตอนเดินกลับ wrapper จะ scaleX(-1) ให้หันซ้ายเอง)
  return (
    <svg width="58" height="46" viewBox="0 0 62 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* tail (ปลายม้วนน่ารัก) */}
      <path className="wt-cat-tail" d="M16 30 C 5 28, 5 15, 13 13 C 17 12, 16 18, 13 18" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" />
      {/* legs สั้นป้อม (สลับเฟส) */}
      <rect className="wt-cat-leg" style={{ animationDelay: "-0.2s" }} x="20" y="31" width="6" height="10" rx="3" fill="#f97316" />
      <rect className="wt-cat-leg" x="28" y="31" width="6" height="10" rx="3" fill="#fb923c" />
      <rect className="wt-cat-leg" x="38" y="31" width="6" height="10" rx="3" fill="#f97316" />
      <rect className="wt-cat-leg" style={{ animationDelay: "-0.2s" }} x="45" y="31" width="6" height="10" rx="3" fill="#fb923c" />
      {/* body อ้วนกลม */}
      <ellipse cx="32" cy="27" rx="17" ry="11" fill="#fb923c" />
      {/* tabby stripes บนตัว */}
      <path d="M27 18 q 2 4 0 9" stroke="#ea6a12" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M32 17 q 2 5 0 11" stroke="#ea6a12" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M37 18 q 2 4 0 9" stroke="#ea6a12" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* back ear (หลังหัว) */}
      <path d="M41 11 Q 42 3 48 8 Q 45 10 44 14 Z" fill="#f97316" />
      {/* head หัวโต */}
      <circle cx="47" cy="19" r="12.5" fill="#fb923c" />
      {/* tabby บนหัว */}
      <path d="M44 8 q 1.5 4 0 7" stroke="#ea6a12" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* front ear มน + ข้างในชมพู */}
      <path d="M51 8 Q 57 4 57.5 13 Q 53 11 51 14 Z" fill="#fb923c" />
      <path d="M52.2 10 Q 55.2 7.5 55.6 12.2 Q 53.2 11 52.2 13 Z" fill="#fda4af" />
      {/* muzzle ครีม */}
      <ellipse cx="51" cy="23" rx="7.5" ry="6" fill="#fff7ed" />
      {/* eye กลมโต + ไฮไลต์ */}
      <circle cx="48.5" cy="18" r="3.4" fill="#3f2a12" />
      <circle cx="49.8" cy="16.8" r="1.1" fill="#ffffff" />
      {/* blush แก้มชมพู */}
      <circle cx="45" cy="22.5" r="2.1" fill="#fb7185" opacity="0.7" />
      {/* nose */}
      <path d="M57.5 20.5 l2.2 1.4 -2.2 1.4 z" fill="#fb7185" />
      {/* mouth ยิ้มเล็ก */}
      <path d="M55 25 q 1.6 2.2 3.2 0.2" stroke="#d9700f" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* whiskers */}
      <path d="M53 22.5 H 60.5 M53 25 H 60" stroke="#fed7aa" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
