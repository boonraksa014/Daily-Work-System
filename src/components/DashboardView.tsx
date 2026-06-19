"use client";

import { BookOpen, Zap, Target } from "lucide-react";
import type { Task } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { View } from "@/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "อรุณสวัสดิ์", emoji: "🌤️" };
  if (h < 17) return { text: "สวัสดีตอนบ่าย", emoji: "☀️" };
  return { text: "สวัสดีตอนเย็น", emoji: "🌙" };
}

interface DashboardViewProps {
  tasks: Task[];
  logEntries: LogEntry[];
  onNavigate: (v: View) => void;
}

export function DashboardView({ tasks, logEntries, onNavigate }: DashboardViewProps) {
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logEntries.filter(e => e.date === today);
  const todayHours = todayLogs.reduce((s, e) => s + e.hours, 0);
  const todayDone = todayLogs.filter(e => e.done).length;
  const inProgress = tasks.filter(t => t.status === "inprogress").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const greet = greeting();

  const QUICK_STATS = [
    { emoji: "📋", label: "งานวันนี้",      value: todayLogs.length, unit: "รายการ", accent: "#7c3aed", chip: "#ede9fe", nav: "log" as View },
    { emoji: "✅", label: "เสร็จแล้ววันนี้", value: todayDone,         unit: "รายการ", accent: "#059669", chip: "#d1fae5", nav: "log" as View },
    { emoji: "⏱️", label: "ชม. วันนี้",    value: todayHours,        unit: "ชม.",   accent: "#d97706", chip: "#fef3c7", nav: "log" as View },
    { emoji: "⚡", label: "กำลังดำเนินการ", value: inProgress,        unit: "งาน",   accent: "#0369a1", chip: "#e0f2fe", nav: "kanban" as View },
  ];

  return (
    <div className="space-y-5">
      {/* Hero welcome */}
      <div className="rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #ec4899 70%, #fb923c 100%)", boxShadow: "0 12px 40px rgba(124,58,237,0.4)" }}>
        {/* Decorative circles */}
        <div className="absolute" style={{ width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", top: -60, right: -40 }} />
        <div className="absolute" style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -30, left: 60 }} />
        <div className="px-6 py-7 relative">
          <div className="flex items-start justify-between">
            <div>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <h1 style={{ fontSize: "1.7rem", fontWeight: 900, color: "white", marginTop: 4, lineHeight: 1.2 }}>
                {greet.emoji} {greet.text}!
              </h1>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.85)", marginTop: 6, fontWeight: 600 }}>
                คุณมี <span className="px-1.5 py-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.25)" }}>{inProgress} งาน</span> ที่กำลังดำเนินการอยู่
              </p>
            </div>
            <div style={{ fontSize: "3rem", opacity: 0.9 }}>{greet.emoji}</div>
          </div>

          {/* Mini progress */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
              <div className="h-full w-full rounded-full" style={{ transform: `scaleX(${tasks.length > 0 ? doneTasks / tasks.length : 0})`, transformOrigin: "left", background: "rgba(255,255,255,0.9)", transition: "transform 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.9)", fontWeight: 800, whiteSpace: "nowrap" }}>
              {doneTasks}/{tasks.length} งาน
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_STATS.map(s => (
          <button key={s.label} onClick={() => onNavigate(s.nav)}
            className="text-left rounded-2xl p-4 bg-white transition-all"
            style={{ border: "1px solid var(--wt-border)", boxShadow: "0 1px 3px rgba(76,29,149,0.06)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 24px rgba(76,29,149,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(76,29,149,0.06)"; }}>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: s.chip, fontSize: "1rem" }}>{s.emoji}</span>
            <p style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1.1, marginTop: 8, color: s.accent }}>{s.value}</p>
            <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)", fontWeight: 600, marginTop: 2 }}>{s.label} · {s.unit}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active tasks */}
        <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #0369a1, #38bdf8)" }}>
                <Zap size={14} style={{ color: "white" }} />
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>งานที่กำลังดำเนินการ</p>
            </div>
            <button onClick={() => onNavigate("kanban")}
              style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }}
              className="hover:underline">ดูทั้งหมด →</button>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status !== "done").length === 0 && (
              <div className="text-center py-8">
                {tasks.length === 0 ? (
                  <>
                    <span style={{ fontSize: "2rem" }}>🗂️</span>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--wt-text)", marginTop: 8 }}>ยังไม่มีงาน</p>
                    <button onClick={() => onNavigate("kanban")} className="mt-2 px-4 py-2 rounded-xl"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", fontSize: "0.78rem", fontWeight: 800, border: "none" }}>
                      เพิ่มงานแรก
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "2rem" }}>🎉</span>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--wt-text)", marginTop: 8 }}>เสร็จหมดแล้ว!</p>
                  </>
                )}
              </div>
            )}
            {tasks.filter(t => t.status !== "done").slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition"
                style={{ background: task.status === "inprogress" ? "var(--wt-tint-orange)" : "var(--wt-tint-blue)" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateX(4px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}>
                <span style={{ fontSize: "0.85rem" }}>{task.status === "inprogress" ? "⚡" : "📋"}</span>
                <p className="flex-1 truncate" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--wt-text)" }}>{task.title}</p>
                <span className="px-2 py-0.5 rounded-full shrink-0" style={{
                  background: task.priority === "high" ? "#ffe4e6" : task.priority === "medium" ? "#fef3c7" : "#d1fae5",
                  color: task.priority === "high" ? "#9f1239" : task.priority === "medium" ? "#92400e" : "#065f46",
                  fontSize: "0.68rem", fontWeight: 800,
                }}>
                  {task.priority === "high" ? "สูง" : task.priority === "medium" ? "กลาง" : "ต่ำ"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today log preview */}
        <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}>
                <BookOpen size={14} style={{ color: "white" }} />
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>บันทึกงานวันนี้</p>
            </div>
            <button onClick={() => onNavigate("log")} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }} className="hover:underline">ดูทั้งหมด →</button>
          </div>
          <div className="space-y-2">
            {todayLogs.length === 0 && (
              <div className="text-center py-8">
                <span style={{ fontSize: "2rem" }}>✍️</span>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--wt-text)", marginTop: 8 }}>ยังไม่มีบันทึกวันนี้</p>
                <button onClick={() => onNavigate("log")} className="mt-2 px-4 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", fontSize: "0.78rem", fontWeight: 800, border: "none" }}>
                  เริ่มบันทึก
                </button>
              </div>
            )}
            {todayLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                style={{ background: log.done ? "var(--wt-tint-green)" : "var(--wt-soft)" }}>
                <span style={{ fontSize: "0.9rem" }}>{log.done ? "✅" : "⏳"}</span>
                <p className={`flex-1 truncate ${log.done ? "line-through" : ""}`}
                  style={{ fontSize: "0.83rem", fontWeight: 700, color: log.done ? "var(--wt-muted)" : "var(--wt-text)" }}>
                  {log.title}
                </p>
                <span className="px-2 py-0.5 rounded-full shrink-0" style={{ background: "var(--wt-border)", color: "#7c3aed", fontSize: "0.68rem", fontWeight: 800 }}>
                  {log.hours} ชม.
                </span>
              </div>
            ))}
          </div>
          {todayHours > 0 && (
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "2px solid var(--wt-soft2)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--wt-muted)", fontWeight: 600 }}>รวมวันนี้</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#7c3aed" }}>{todayHours} ชั่วโมง ⏱️</span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban mini summary */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #db2777, #f472b6)" }}>
              <Target size={14} style={{ color: "white" }} />
            </div>
            <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>ความคืบหน้างานทั้งหมด</p>
          </div>
          <button onClick={() => onNavigate("kanban")} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }} className="hover:underline">ไป Kanban →</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "รอดำเนินการ",    count: tasks.filter(t => t.status === "todo").length,       tint: "var(--wt-tint-blue)",   border: "var(--wt-c-todo-line)", text: "var(--wt-c-todo-ink)" },
            { label: "กำลังดำเนินการ", count: tasks.filter(t => t.status === "inprogress").length, tint: "var(--wt-tint-orange)", border: "var(--wt-c-prog-line)", text: "var(--wt-c-prog-ink)" },
            { label: "เสร็จสิ้น",      count: doneTasks,                                          tint: "var(--wt-tint-green)",  border: "var(--wt-c-done-line)", text: "var(--wt-c-done-ink)" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.tint, border: `1px solid ${s.border}` }}>
              <p style={{ fontSize: "1.9rem", fontWeight: 800, color: s.text, lineHeight: 1.1 }}>{s.count}</p>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: s.text, opacity: 0.85, marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
