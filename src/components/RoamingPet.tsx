"use client";

// น้องแมวเดินเล่นที่ขอบล่างจอ (สไตล์ VS Code Pets)
//   ใช้รูปแยก 8 เฟรมใน public/ (cat-1..cat-8.png) — เฟรม 1,2 = ท่าเดิน → สลับวนเป็นท่าเดิน
// ของตกแต่งล้วน: ไม่ขวางการคลิก + ปิดเมื่อ prefers-reduced-motion
// ถ้ายังไม่มีไฟล์รูป จะไม่แสดงอะไร (ไม่ทำให้หน้าพัง)
import { useEffect, useState } from "react";

const WALK_FRAMES = ["/cat-1.png", "/cat-2.png"]; // Walk1, Walk2
const HEIGHT = 64; // ความสูงที่แสดง (px)

export function RoamingPet() {
  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(0);

  // โหลดรูปท่าเดินก่อน — พร้อมค่อยแสดง
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

  // สลับเฟรมเดิน
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setFrame(f => (f + 1) % WALK_FRAMES.length), 360);
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
        height: HEIGHT,
        zIndex: 40,
        pointerEvents: "none",
        animation: "wt-walk 40s linear infinite",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WALK_FRAMES[frame]}
        alt=""
        style={{ height: HEIGHT, width: "auto", display: "block", filter: "drop-shadow(0 3px 4px rgba(45,31,110,0.28))" }}
      />
    </div>
  );
}
