"use client";

// น้องแมวเดินเล่นที่ขอบล่างจอ (สไตล์ VS Code Pets) — แอนิเมชันลื่น
//   ใช้รูปแยกใน public/ (cat-1 = Walk1, cat-2 = Walk2) สลับแบบครอสเฟด + บ็อบ/โยกตัวนุ่มๆ
// ของตกแต่งล้วน: ไม่ขวางการคลิก + ปิดเมื่อ prefers-reduced-motion
// ถ้ายังไม่มีไฟล์รูป จะไม่แสดงอะไร (ไม่ทำให้หน้าพัง)
import { useEffect, useState } from "react";

const WALK_FRAMES = ["/cat-1.png", "/cat-2.png"]; // Walk1, Walk2
const HEIGHT = 64; // ความสูงที่แสดง (px)
const BOX = 78;    // กรอบกว้างคงที่ (กันสั่นจากขนาดเฟรมที่ต่างกัน)

export function RoamingPet() {
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let done = 0;
    let ok = true;
    WALK_FRAMES.forEach(src => {
      const im = new Image();
      im.onload = () => { if (++done === WALK_FRAMES.length && ok) setReady(true); };
      im.onerror = () => { ok = false; };
      im.src = src;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setFrame(f => (f + 1) % WALK_FRAMES.length), 420);
    return () => clearInterval(id);
  }, [ready]);

  if (!ready) return null;

  return (
    <div
      className="wt-roam-pet"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        bottom: 6,
        width: BOX,
        height: HEIGHT,
        zIndex: 40,
        pointerEvents: "none",
        animation: "wt-walk 46s linear infinite",
      }}
    >
      {/* บ็อบ + โยกตัวนุ่มๆ */}
      <div style={{ position: "relative", width: "100%", height: "100%", animation: "wt-step 0.84s ease-in-out infinite" }}>
        {WALK_FRAMES.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              height: HEIGHT,
              width: "auto",
              opacity: frame === i ? 1 : 0,
              transition: "opacity 0.24s ease-in-out",
              filter: "drop-shadow(0 3px 4px rgba(45,31,110,0.28))",
            }}
          />
        ))}
      </div>
    </div>
  );
}
