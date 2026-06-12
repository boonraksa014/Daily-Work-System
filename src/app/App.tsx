import { useState } from "react";
import {
  LayoutDashboard, Kanban, BookOpen, BarChart3,
  CheckCircle2, Clock, TrendingUp, Sun,
  Menu, X, Zap, Target, Sparkles
} from "lucide-react";
import { KanbanBoard, Task } from "./components/KanbanBoard";
import { DailyLog, LogEntry } from "./components/DailyLog";
import { Reports } from "./components/Reports";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { INITIAL_TASKS, INITIAL_LOGS } from "./data/seed";

type View = "dashboard" | "kanban" | "log" | "reports";

const NAV_ITEMS = [
  { id: "dashboard" as View, label: "ภาพรวม",       emoji: "🏠", icon: <LayoutDashboard size={17} />, gradient: "linear-gradient(135deg, #7c3aed, #a855f7)" },
  { id: "kanban"    as View, label: "Kanban",        emoji: "📋", icon: <Kanban size={17} />,           gradient: "linear-gradient(135deg, #0369a1, #38bdf8)" },
  { id: "log"       as View, label: "บันทึกรายวัน", emoji: "✍️", icon: <BookOpen size={17} />,         gradient: "linear-gradient(135deg, #059669, #34d399)" },
  { id: "reports"   as View, label: "รายงาน",        emoji: "📊", icon: <BarChart3 size={17} />,        gradient: "linear-gradient(135deg, #d97706, #fbbf24)" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "อรุณสวัสดิ์", emoji: "🌤️" };
  if (h < 17) return { text: "สวัสดีตอนบ่าย", emoji: "☀️" };
  return { text: "สวัสดีตอนเย็น", emoji: "🌙" };
}

function DashboardView({ tasks, logEntries, onNavigate }: { tasks: Task[]; logEntries: LogEntry[]; onNavigate: (v: View) => void }) {
  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logEntries.filter(e => e.date === today);
  const todayHours = todayLogs.reduce((s, e) => s + e.hours, 0);
  const todayDone = todayLogs.filter(e => e.done).length;
  const inProgress = tasks.filter(t => t.status === "inprogress").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const greet = greeting();

  const QUICK_STATS = [
    { emoji: "📋", label: "งานวันนี้",      value: todayLogs.length,  unit: "รายการ", gradient: "linear-gradient(135deg, #7c3aed, #a855f7)", shadow: "rgba(124,58,237,0.25)", nav: "log" as View },
    { emoji: "✅", label: "เสร็จแล้ววันนี้", value: todayDone,         unit: "รายการ", gradient: "linear-gradient(135deg, #059669, #34d399)", shadow: "rgba(52,211,153,0.25)", nav: "log" as View },
    { emoji: "⏱️", label: "ชม. วันนี้",    value: todayHours,        unit: "ชม.",   gradient: "linear-gradient(135deg, #d97706, #fbbf24)", shadow: "rgba(251,191,36,0.25)",  nav: "log" as View },
    { emoji: "⚡", label: "กำลังดำเนินการ", value: inProgress,        unit: "งาน",   gradient: "linear-gradient(135deg, #0369a1, #38bdf8)", shadow: "rgba(56,189,248,0.25)", nav: "kanban" as View },
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
              <div className="h-full rounded-full" style={{ width: `${tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0}%`, background: "rgba(255,255,255,0.9)", transition: "width 0.8s ease" }} />
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
            className="text-left rounded-2xl p-4 text-white transition-all"
            style={{ background: s.gradient, boxShadow: `0 6px 20px ${s.shadow}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 30px ${s.shadow}`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${s.shadow}`; }}>
            <span style={{ fontSize: "1.6rem" }}>{s.emoji}</span>
            <p style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>{s.value}</p>
            <p style={{ fontSize: "0.72rem", opacity: 0.85, fontWeight: 600, marginTop: 2 }}>{s.label} · {s.unit}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active tasks */}
        <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid #ede9fe", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #0369a1, #38bdf8)" }}>
                <Zap size={14} style={{ color: "white" }} />
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "#2d1f6e" }}>งานที่กำลังดำเนินการ</p>
            </div>
            <button onClick={() => onNavigate("kanban")}
              style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }}
              className="hover:underline">ดูทั้งหมด →</button>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status !== "done").length === 0 && (
              <div className="text-center py-8">
                <span style={{ fontSize: "2rem" }}>🎉</span>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#2d1f6e", marginTop: 8 }}>เสร็จหมดแล้ว!</p>
              </div>
            )}
            {tasks.filter(t => t.status !== "done").slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition"
                style={{ background: task.status === "inprogress" ? "#fff7ed" : "#f0f9ff" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateX(4px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}>
                <span style={{ fontSize: "0.85rem" }}>{task.status === "inprogress" ? "⚡" : "📋"}</span>
                <p className="flex-1 truncate" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#2d1f6e" }}>{task.title}</p>
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
        <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid #ede9fe", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}>
                <BookOpen size={14} style={{ color: "white" }} />
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "#2d1f6e" }}>บันทึกงานวันนี้</p>
            </div>
            <button onClick={() => onNavigate("log")} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }} className="hover:underline">ดูทั้งหมด →</button>
          </div>
          <div className="space-y-2">
            {todayLogs.length === 0 && (
              <div className="text-center py-8">
                <span style={{ fontSize: "2rem" }}>✍️</span>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#2d1f6e", marginTop: 8 }}>ยังไม่มีบันทึกวันนี้</p>
                <button onClick={() => onNavigate("log")} className="mt-2 px-4 py-2 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white", fontSize: "0.78rem", fontWeight: 800, border: "none" }}>
                  เริ่มบันทึก
                </button>
              </div>
            )}
            {todayLogs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                style={{ background: log.done ? "#f0fdf4" : "#faf8ff" }}>
                <span style={{ fontSize: "0.9rem" }}>{log.done ? "✅" : "⏳"}</span>
                <p className={`flex-1 truncate ${log.done ? "line-through" : ""}`}
                  style={{ fontSize: "0.83rem", fontWeight: 700, color: log.done ? "#7c6a9e" : "#2d1f6e" }}>
                  {log.title}
                </p>
                <span className="px-2 py-0.5 rounded-full shrink-0" style={{ background: "#ede9fe", color: "#7c3aed", fontSize: "0.68rem", fontWeight: 800 }}>
                  {log.hours} ชม.
                </span>
              </div>
            ))}
          </div>
          {todayHours > 0 && (
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "2px solid #f5f3ff" }}>
              <span style={{ fontSize: "0.78rem", color: "#7c6a9e", fontWeight: 600 }}>รวมวันนี้</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#7c3aed" }}>{todayHours} ชั่วโมง ⏱️</span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban mini summary */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid #ede9fe", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #db2777, #f472b6)" }}>
              <Target size={14} style={{ color: "white" }} />
            </div>
            <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "#2d1f6e" }}>ความคืบหน้างานทั้งหมด</p>
          </div>
          <button onClick={() => onNavigate("kanban")} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed" }} className="hover:underline">ไป Kanban →</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "รอดำเนินการ", emoji: "📋", count: tasks.filter(t => t.status === "todo").length,       gradient: "linear-gradient(135deg, #e0f2fe, #bae6fd)", border: "#7dd3fc", text: "#0369a1" },
            { label: "กำลังดำเนินการ", emoji: "⚡", count: tasks.filter(t => t.status === "inprogress").length, gradient: "linear-gradient(135deg, #ffedd5, #fed7aa)", border: "#fb923c", text: "#c2410c" },
            { label: "เสร็จสิ้น",   emoji: "✅", count: doneTasks,                                          gradient: "linear-gradient(135deg, #d1fae5, #a7f3d0)", border: "#34d399", text: "#065f46" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.gradient, border: `2px solid ${s.border}` }}>
              <span style={{ fontSize: "1.5rem" }}>{s.emoji}</span>
              <p style={{ fontSize: "2rem", fontWeight: 900, color: s.text, lineHeight: 1.1, marginTop: 4 }}>{s.count}</p>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: s.text, opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [tasks, setTasks] = useLocalStorage<Task[]>("worktrack.tasks", INITIAL_TASKS);
  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>("worktrack.logs", INITIAL_LOGS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentNav = NAV_ITEMS.find(n => n.id === view)!;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f3f0ff", fontFamily: "Nunito, 'Nunito Sans', system-ui, sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(45,31,110,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 h-full flex flex-col transition-transform duration-300 shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 220, background: "white", borderRight: "2px solid #ede9fe", boxShadow: "4px 0 24px rgba(124,58,237,0.08)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", boxShadow: "0 4px 12px rgba(124,58,237,0.4)" }}>
                <Sparkles size={17} style={{ color: "white" }} />
              </div>
              <div>
                <p style={{ fontSize: "0.95rem", fontWeight: 900, color: "#2d1f6e" }}>WorkTrack</p>
                <p style={{ fontSize: "0.6rem", color: "#7c6a9e", fontWeight: 600 }}>Daily Work Log</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-xl" style={{ color: "#7c6a9e" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left"
                style={{
                  background: active ? item.gradient : "transparent",
                  boxShadow: active ? "0 4px 12px rgba(124,58,237,0.25)" : "none",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f5f3ff"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span className="text-xl shrink-0">{item.emoji}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: active ? 800 : 600, color: active ? "white" : "#2d1f6e" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom widget */}
        <div className="px-4 pb-5 pt-3">
          <div className="rounded-2xl p-4 overflow-hidden relative" style={{ background: "linear-gradient(135deg, #ede9fe, #fce7f3)" }}>
            <div className="absolute" style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(124,58,237,0.08)", top: -20, right: -20 }} />
            <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em" }}>งานทั้งหมด</p>
            <p style={{ fontSize: "2rem", fontWeight: 900, color: "#2d1f6e", lineHeight: 1 }}>{tasks.length}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(124,58,237,0.15)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: tasks.length > 0 ? `${(tasks.filter(t => t.status === "done").length / tasks.length) * 100}%` : "0%", background: "linear-gradient(90deg, #7c3aed, #34d399)" }} />
              </div>
            </div>
            <p style={{ fontSize: "0.68rem", color: "#7c6a9e", fontWeight: 600, marginTop: 4 }}>
              ✅ เสร็จแล้ว {tasks.filter(t => t.status === "done").length} งาน
            </p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white flex items-center gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: "2px solid #ede9fe", boxShadow: "0 4px 16px rgba(124,58,237,0.06)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl transition"
            style={{ color: "#7c6a9e" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ff")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: currentNav.gradient, boxShadow: "0 3px 10px rgba(124,58,237,0.25)" }}>
              <div style={{ color: "white" }}>{currentNav.icon}</div>
            </div>
            <div>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#2d1f6e" }}>{currentNav.label}</h2>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#f5f3ff" }}>
              <span style={{ fontSize: "0.82rem" }}>📅</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
                {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "white" }}>ผ</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5" style={{ scrollbarWidth: "thin", scrollbarColor: "#ede9fe transparent" }}>
          {view === "dashboard" && <DashboardView tasks={tasks} logEntries={logEntries} onNavigate={setView} />}
          {view === "kanban" && (
            <div style={{ height: "calc(100vh - 114px)" }}>
              <KanbanBoard tasks={tasks} onTasksChange={setTasks} />
            </div>
          )}
          {view === "log" && <DailyLog entries={logEntries} onEntriesChange={setLogEntries} />}
          {view === "reports" && <Reports logEntries={logEntries} tasks={tasks} />}
        </main>
      </div>
    </div>
  );
}
