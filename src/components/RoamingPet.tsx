"use client";

// น้องแมวเดินเล่นขอบล่างจอ (สไตล์ VS Code Pets) — วนเฟรมแบบคม (sprite) + เลื่อนลื่น
//   ใช้รูปใน public/ : cat-1..cat-N = ลำดับเฟรมเดิน (ยิ่งหลายเฟรม ยิ่งเดินลื่น)
//   ตอนนี้มี Walk1/Walk2 (cat-1, cat-2) — เพิ่มไฟล์เฟรมเดินในอาเรย์นี้ได้เลยถ้ามีมากขึ้น
// ของตกแต่งล้วน: ไม่ขวางการคลิก + ปิดเมื่อ prefers-reduced-motion
import { useEffect, useState } from "react";

const WALK_FRAMES = ["/cat-1.png", "/cat-2.png"];
const HEIGHT = 64;       // ความสูงที่แสดง (px)
const BOX = 80;          // กรอบกว้างคงที่ + จัดเท้าให้นิ่ง (กันสั่นจากเฟรมขนาดต่างกัน)
const FPS_MS = 200;      // เวลาต่อเฟรม

export function RoamingPet() {
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let done = 0, ok = true;
    WALK_FRAMES.forEach(src => {
      const im = new Image();
      im.onload = () => { if (++done === WALK_FRAMES.length && ok) setReady(true); };
      im.onerror = () => { ok = false; };
      im.src = src;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setFrame(f => (f + 1) % WALK_FRAMES.length), FPS_MS);
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
        animation: "wt-walk 46s linear infinite", // เลื่อนข้ามจอลื่นๆ + พลิกหันทิศ
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WALK_FRAMES[frame]}
        alt=""
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)", // ยึดกึ่งกลาง/เท้าให้นิ่ง
          height: HEIGHT,
          width: "auto",
          filter: "drop-shadow(0 3px 4px rgba(45,31,110,0.28))",
        }}
      />
    </div>
  );
}
