"use client";

// น้องแมว pixel เดินเล่นที่ขอบล่างจอ (สไตล์ VS Code Pets) — ใช้ sprite sheet
//   ไฟล์: public/cat-sprite.png  (8 เฟรม ๆ ละ 32×32, รวม 256×32, พื้นหลังโปร่งใส)
//   เฟรม 0,1 = เดิน → วนสองเฟรมนี้เป็นท่าเดิน
// ของตกแต่งล้วน: ไม่ขวางการคลิก + ปิดเมื่อ prefers-reduced-motion
// ถ้ายังไม่มีไฟล์ sprite จะไม่แสดงอะไร (ไม่ทำให้หน้าพัง)
import { useEffect, useState } from "react";

const SPRITE = "/cat-sprite.png";
const SCALE = 2; // 32px → 64px (คมแบบพิกเซล)

export function RoamingPet() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setReady(true);
    img.onerror = () => setReady(false);
    img.src = SPRITE;
  }, []);

  if (!ready) return null;

  return (
    <div
      className="wt-roam-pet"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        bottom: 6,
        width: 32 * SCALE,
        height: 32 * SCALE,
        zIndex: 40,
        pointerEvents: "none",
        animation: "wt-walk 40s linear infinite",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          transform: `scale(${SCALE})`,
          transformOrigin: "bottom left",
          backgroundImage: `url(${SPRITE})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "256px 32px",
          imageRendering: "pixelated",
          animation: "wt-cat-walk 0.7s steps(2) infinite",
          filter: "drop-shadow(0 3px 3px rgba(45,31,110,0.25))",
        }}
      />
    </div>
  );
}
