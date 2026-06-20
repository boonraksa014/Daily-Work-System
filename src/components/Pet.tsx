"use client";

// น้องสัตว์เลี้ยง (productivity buddy) — frontend-only
// อารมณ์/เลเวล/พลัง คำนวณจากข้อมูลที่มีอยู่แล้ว (งาน + บันทึกรายวัน) ไม่แตะ backend
// ชื่อเก็บใน localStorage ของเครื่อง (เปลี่ยนได้โดยคลิกที่ชื่อ)
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { Task } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";

const NAME_KEY = "wt.petName";
const DEFAULT_NAME = "น้องโฟลว์";
const DAILY_GOAL = 6; // ชั่วโมงต่อวันที่ถือว่า "พลังเต็ม"

const MOODS = {
  excited: { emoji: "😻", msg: "วันนี้ไฟแรงสุดๆ ไปต่อเลย! 🔥", color: "#db2777" },
  happy: { emoji: "😺", msg: "ทำได้ดีนะ เก็บไปเรื่อยๆ ✨", color: "#7c3aed" },
  sleepy: { emoji: "😴", msg: "ยังไม่มีบันทึกวันนี้เลย เริ่มกันไหม?", color: "#6b5c88" },
} as const;

export function PetCompanion({ tasks, logEntries }: { tasks: Task[]; logEntries: LogEntry[] }) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // โหลดชื่อจากเครื่องหลัง mount (กัน hydration mismatch)
  useEffect(() => {
    try { const s = localStorage.getItem(NAME_KEY); if (s) setName(s); } catch { /* ignore */ }
  }, []);

  function saveName() {
    const n = draft.trim() || DEFAULT_NAME;
    setName(n);
    try { localStorage.setItem(NAME_KEY, n); } catch { /* ignore */ }
    setEditing(false);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logEntries.filter(e => e.date === today);
  const todayHours = todayLogs.reduce((s, e) => s + e.hours, 0);
  const todayDone = todayLogs.filter(e => e.done).length;
  const totalDone = logEntries.filter(e => e.done).length + tasks.filter(t => t.status === "done").length;
  const level = Math.floor(totalDone / 5) + 1;
  const energy = Math.max(0, Math.min(1, todayHours / DAILY_GOAL));

  const mood: keyof typeof MOODS =
    todayHours >= 3 || todayDone >= 3 ? "excited" :
    todayLogs.length > 0 ? "happy" : "sleepy";
  const m = MOODS[mood];

  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
      <div className="shrink-0 flex items-center justify-center rounded-2xl" aria-hidden
        style={{ width: 64, height: 64, background: m.color + "1a", fontSize: "2.2rem", animation: "wt-bob 3s ease-in-out infinite" }}>
        {m.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {editing ? (
            <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus maxLength={20} aria-label="ชื่อสัตว์เลี้ยง"
              onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditing(false); }}
              onBlur={saveName}
              className="px-2 py-0.5 rounded-lg outline-none"
              style={{ border: "2px solid #a78bfa", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.95rem", fontWeight: 800, maxWidth: 170 }} />
          ) : (
            <button onClick={() => { setDraft(name); setEditing(true); }} className="group flex items-center gap-1.5" title="เปลี่ยนชื่อ">
              <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--wt-text)" }}>{name}</span>
              <Pencil size={12} className="opacity-0 group-hover:opacity-70 transition-opacity" style={{ color: "var(--wt-muted)" }} />
            </button>
          )}
          <span className="px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--wt-soft2)", color: "#7c3aed", fontSize: "0.68rem", fontWeight: 800 }}>Lv. {level}</span>
        </div>
        <p className="mt-1" style={{ fontSize: "0.82rem", color: "var(--wt-muted)", fontWeight: 600 }}>{m.msg}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--wt-soft2)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${energy * 100}%`, background: "linear-gradient(90deg, #7c3aed, #34d399)" }} />
          </div>
          <span className="shrink-0" style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--wt-muted)", whiteSpace: "nowrap" }}>พลังวันนี้ {todayHours}/{DAILY_GOAL} ชม.</span>
        </div>
      </div>
    </div>
  );
}
