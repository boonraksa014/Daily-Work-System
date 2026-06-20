"use client";

// น้องสัตว์เลี้ยงเดินเล่นไปมาที่ขอบล่างจอ (ของตกแต่ง — ไม่ขวางการคลิก, ปิดเมื่อ reduced-motion)
import { useData } from "@/lib/store";
import { petEmoji } from "@/components/Pet";

export function RoamingPet() {
  const { tasks, logEntries } = useData();
  const emoji = petEmoji(tasks, logEntries);

  return (
    <div
      className="wt-roam-pet"
      aria-hidden
      style={{
        position: "fixed",
        left: 0,
        bottom: 6,
        zIndex: 40,
        pointerEvents: "none", // ไม่ขวางการคลิกอะไรเลย
        animation: "wt-walk 44s linear infinite",
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontSize: "2rem",
          lineHeight: 1,
          animation: "wt-bob 1.1s ease-in-out infinite",
          filter: "drop-shadow(0 4px 6px rgba(45,31,110,0.25))",
        }}
      >
        {emoji}
      </span>
    </div>
  );
}
