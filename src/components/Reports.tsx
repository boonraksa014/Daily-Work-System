"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, Clock, CheckCircle2, Target, Award, Zap, Layers, Download } from "lucide-react";
import { toDateStr, todayStr } from "../lib/date";
import type { LogEntry } from "./DailyLog";
import type { Task } from "./KanbanBoard";
import type { Category, Project } from "@/types";

interface ReportsProps {
  logEntries: LogEntry[];
  tasks: Task[];
  categories: Category[];
  projects: Project[];
}

const STAT_CARDS = [
  { key: "hours",      emoji: "⏱️", label: "ชั่วโมงงานทั้งหมด", unit: "ชม.",      accent: "#7c3aed", chip: "#ede9fe" },
  { key: "completion", emoji: "✅", label: "อัตราความสำเร็จ",   unit: "%",        accent: "#059669", chip: "#d1fae5" },
  { key: "avg",        emoji: "📈", label: "เฉลี่ยต่อวัน",      unit: "ชม./วัน", accent: "#d97706", chip: "#fef3c7" },
  { key: "topcat",     emoji: "🏆", label: "หมวดหมู่หลัก",      unit: "",         accent: "#7c3aed", chip: "#ede9fe" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
  unitSuffix?: string;
}

function CustomTooltip({ active, payload, label, unitSuffix = "" }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--wt-card)", border: "2px solid var(--wt-border)", borderRadius: 14, padding: "10px 14px", boxShadow: "0 8px 24px rgba(124,58,237,0.15)" }}>
      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--wt-muted)", marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: "0.88rem", fontWeight: 800, color: p.color }}>
          {p.value} {unitSuffix}
        </p>
      ))}
    </div>
  );
}

export function Reports({ logEntries, tasks, categories, projects }: ReportsProps) {
  const [rangeDays, setRangeDays] = useState(7);
  const [exporting, setExporting] = useState(false);
  const catColor = (name: string) => categories.find(c => c.name === name)?.color ?? "#a78bfa";

  // Per-day series over the selected range (oldest -> newest)
  const days = Array.from({ length: rangeDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (rangeDays - 1 - i));
    const dateStr = toDateStr(d);
    const dayName = d.toLocaleDateString("th-TH", rangeDays > 7 ? { day: "numeric", month: "short" } : { weekday: "short" });
    const hours = logEntries.filter(e => e.date === dateStr).reduce((s, e) => s + e.hours, 0);
    // นับงาน Kanban ที่ "เสร็จ" ตามวันที่เสร็จจริง (completedAt) — งานเก่าที่ไม่มีให้ใช้ createdAt แทน
    const done = tasks.filter(t => t.status === "done" && (t.completedAt ?? t.createdAt) === dateStr).length;
    return { day: dayName, hours, done };
  });

  // Category breakdown
  const catMap: Record<string, number> = {};
  logEntries.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.hours; });
  const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Streak: consecutive days with >=1 entry, ending today (or yesterday as grace)
  const entryDates = new Set(logEntries.map(e => e.date));
  let streak = 0;
  {
    const d = new Date();
    if (!entryDates.has(toDateStr(d))) d.setDate(d.getDate() - 1);
    while (entryDates.has(toDateStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  }

  // Stats
  const totalHours = logEntries.reduce((s, e) => s + e.hours, 0);
  const doneEntries = logEntries.filter(e => e.done).length;
  const completionRate = logEntries.length > 0 ? Math.round((doneEntries / logEntries.length) * 100) : 0;
  const avgHoursPerDay = (days.reduce((s, d) => s + d.hours, 0) / rangeDays).toFixed(1);
  const topCategory = categoryData[0]?.name ?? "-";

  // เวลาที่ใช้ต่องาน Kanban (จากบันทึกที่ผูก task) — Top 6
  const taskHourMap: Record<string, number> = {};
  logEntries.forEach(e => { if (e.taskId) taskHourMap[e.taskId] = (taskHourMap[e.taskId] || 0) + e.hours; });
  const taskTimeData = Object.entries(taskHourMap)
    .map(([id, value]) => ({ id, title: tasks.find(t => t.id === id)?.title ?? "(งานที่ถูกลบ)", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const taskTimeMax = taskTimeData[0]?.value ?? 1;

  const statValues: Record<string, string | number> = {
    hours: totalHours, completion: completionRate, avg: avgHoursPerDay, topcat: topCategory,
  };

  // สรุปตามโปรเจกต์: ชั่วโมง (จากบันทึก) + จำนวนงาน/เสร็จ (จาก Kanban) รวม "ไม่ระบุ" เป็นถังเดียว
  const NONE = "__none__";
  const projById = new Map(projects.map(p => [p.id, p]));
  const projAgg = new Map<string, { name: string; color: string; hours: number; tasks: number; done: number }>();
  const ensureProj = (id: string, name: string, color: string) => {
    let row = projAgg.get(id);
    if (!row) { row = { name, color, hours: 0, tasks: 0, done: 0 }; projAgg.set(id, row); }
    return row;
  };
  for (const e of logEntries) {
    const p = e.projectId ? projById.get(e.projectId) : undefined;
    ensureProj(p?.id ?? NONE, p?.name ?? "ไม่ระบุโปรเจกต์", p?.color ?? "#94a3b8").hours += e.hours;
  }
  for (const t of tasks) {
    const p = t.projectId ? projById.get(t.projectId) : undefined;
    const row = ensureProj(p?.id ?? NONE, p?.name ?? "ไม่ระบุโปรเจกต์", p?.color ?? "#94a3b8");
    row.tasks += 1;
    if (t.status === "done") row.done += 1;
  }
  const projectStats = [...projAgg.values()]
    .filter(r => r.hours > 0 || r.tasks > 0)
    .sort((a, b) => b.hours - a.hours || b.tasks - a.tasks);
  const projectHoursMax = Math.max(1, ...projectStats.map(r => r.hours));

  // Export รายงานเป็น Excel (.xlsx) — โหลด xlsx เฉพาะตอนกด (code-split)
  async function exportExcel() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const projName = (id?: string) => (id ? projById.get(id)?.name ?? "" : "");
      const catNameById = (id?: string) => (id ? categories.find(c => c.id === id)?.name ?? "" : "");
      const statusLabel: Record<string, string> = { todo: "รอดำเนินการ", inprogress: "กำลังดำเนินการ", done: "เสร็จสิ้น" };
      const priLabel: Record<string, string> = { low: "ต่ำ", medium: "กลาง", high: "สูง" };

      const logRows = [...logEntries].sort((a, b) => b.date.localeCompare(a.date)).map(e => ({
        "วันที่": e.date, "งาน": e.title, "หมวดหมู่": e.category, "โปรเจกต์": projName(e.projectId),
        "ชั่วโมง": e.hours, "สถานะ": e.done ? "เสร็จ" : "ค้าง",
        "งานที่ผูก": tasks.find(t => t.id === e.taskId)?.title ?? "", "บันทึก": e.note ?? "",
      }));
      const taskRows = tasks.map(t => ({
        "งาน": t.title, "สถานะ": statusLabel[t.status] ?? t.status, "ความสำคัญ": priLabel[t.priority] ?? t.priority,
        "โปรเจกต์": projName(t.projectId), "หมวดหมู่": catNameById(t.categoryId), "แท็ก": t.tags.join(", "),
        "กำหนดส่ง": t.dueDate ?? "", "วันที่เสร็จ": t.completedAt ?? "", "สร้างเมื่อ": t.createdAt,
      }));
      const projRows = projectStats.map(r => ({
        "โปรเจกต์": r.name, "ชั่วโมงรวม": r.hours, "งานทั้งหมด": r.tasks, "เสร็จแล้ว": r.done,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logRows), "บันทึกรายวัน");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "งาน Kanban");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), "สรุปโปรเจกต์");
      XLSX.writeFile(wb, `taskflow-report-${todayStr()}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const tickInterval = rangeDays > 7 ? Math.floor(rangeDays / 6) : 0;

  return (
    <div className="space-y-5">
      {/* Range toggle + streak */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--wt-border)" }}>
          {[7, 30].map(n => {
            const active = rangeDays === n;
            return (
              <button key={n} onClick={() => setRangeDays(n)} aria-pressed={active}
                style={{ padding: "0.45rem 0.9rem", fontSize: "0.8rem", fontWeight: 800,
                  background: active ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "var(--wt-card)",
                  color: active ? "#fff" : "var(--wt-muted)" }}>
                {n} วัน
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl" style={{ padding: "0.45rem 0.8rem", background: "var(--wt-tint-orange)", border: "1px solid var(--wt-c-prog-line)" }}>
            <span style={{ fontSize: "1rem" }}>🔥</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-c-prog-ink)" }}>{streak} วันติด</span>
          </div>
          <button onClick={exportExcel} disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl transition-opacity"
            style={{ padding: "0.5rem 0.9rem", background: "linear-gradient(135deg, #059669, #34d399)", color: "#fff", fontSize: "0.82rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(5,150,105,0.3)", opacity: exporting ? 0.6 : 1, cursor: exporting ? "wait" : "pointer" }}>
            <Download size={15} /> {exporting ? "กำลังสร้าง…" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(s => {
          const isText = s.key === "topcat"; // ค่าเป็นชื่อหมวด ไม่ใช่ตัวเลข → ใช้ขนาดเล็กลง ไม่ตะโกน
          return (
            <div key={s.key} className="rounded-2xl p-4 bg-white"
              style={{ border: "1px solid var(--wt-border)", boxShadow: "0 1px 3px rgba(76,29,149,0.06)" }}>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: s.accent + "22", fontSize: "1rem" }}>{s.emoji}</span>
              <p className={isText ? "truncate" : ""} title={isText ? String(statValues[s.key]) : undefined}
                style={{ fontSize: isText ? "1.15rem" : "1.7rem", fontWeight: 800, lineHeight: isText ? 1.35 : 1.1, marginTop: 8, color: s.accent }}>
                {statValues[s.key]}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)", fontWeight: 600, marginTop: 2 }}>{s.label}{s.unit ? ` · ${s.unit}` : ""}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Area chart: hours per day */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              <TrendingUp size={14} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>งานที่เสร็จ {rangeDays} วันล่าสุด</p>
              <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>จำนวนงานที่เสร็จต่อวัน</p>
            </div>
          </div>
          {days.every(d => d.done === 0) ? (
            <div className="flex flex-col items-center justify-center h-44" style={{ color: "var(--wt-muted)" }}>
              <span style={{ fontSize: "2rem" }}>📊</span>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={days} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9b8fb5", fontFamily: "Nunito" }} axisLine={false} tickLine={false} interval={tickInterval} />
                <YAxis tick={{ fontSize: 11, fill: "#9b8fb5", fontFamily: "Nunito" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip unitSuffix="งาน" />} />
                <Area type="monotone" dataKey="done" name="งานที่เสร็จ" stroke="#7c3aed" strokeWidth={3} fill="url(#hoursGrad)"
                  dot={{ fill: "#7c3aed", r: 5, strokeWidth: 0 }} activeDot={{ r: 7, fill: "#a855f7" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart: category */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #db2777, #f472b6)" }}>
              <Target size={14} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>สัดส่วนหมวดหมู่</p>
              <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>ชั่วโมงต่อหมวดหมู่</p>
            </div>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44" style={{ color: "var(--wt-muted)" }}>
              <span style={{ fontSize: "2rem" }}>🍩</span>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="45%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                  {categoryData.map((entry, i) => (
                    <Cell key={`cat-${i}`} fill={catColor(entry.name)} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip unitSuffix="ชม." />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: "Nunito", fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Task status */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #059669, #34d399)" }}>
              <CheckCircle2 size={14} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>สถานะงาน Kanban</p>
              <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>ภาพรวมงานทั้งหมด {tasks.length} รายการ</p>
            </div>
          </div>
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: "var(--wt-muted)" }}>
              <span style={{ fontSize: "2rem" }}>📋</span>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีงาน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "รอดำเนินการ",    emoji: "📋", count: tasks.filter(t => t.status === "todo").length,       gradient: "linear-gradient(90deg, #38bdf8, #7dd3fc)", bg: "#e0f2fe" },
                { label: "กำลังดำเนินการ", emoji: "⚡", count: tasks.filter(t => t.status === "inprogress").length, gradient: "linear-gradient(90deg, #fb923c, #fcd34d)", bg: "#ffedd5" },
                { label: "เสร็จสิ้น",      emoji: "✅", count: tasks.filter(t => t.status === "done").length,       gradient: "linear-gradient(90deg, #34d399, #6ee7b7)", bg: "#d1fae5" },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--wt-text)" }}>{s.emoji} {s.label}</span>
                    <span className="px-2.5 py-0.5 rounded-full" style={{ background: s.bg, fontSize: "0.75rem", fontWeight: 800, color: "var(--wt-text)" }}>
                      {s.count} งาน
                    </span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--wt-soft2)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: tasks.length > 0 ? `${(s.count / tasks.length) * 100}%` : "0%", background: s.gradient }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Per-project breakdown */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            <Layers size={14} style={{ color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>สรุปตามโปรเจกต์</p>
            <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>ชั่วโมงและจำนวนงานต่อโปรเจกต์</p>
          </div>
        </div>
        {projectStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: "var(--wt-muted)" }}>
            <span style={{ fontSize: "2rem" }}>📁</span>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีข้อมูลตามโปรเจกต์</p>
            <p style={{ fontSize: "0.78rem", marginTop: 2 }}>เลือกโปรเจกต์ตอนเพิ่มงาน/บันทึกรายวันเพื่อให้ขึ้นที่นี่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectStats.map((r, i) => (
              <div key={r.name + i}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="flex items-center gap-2 truncate" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--wt-text)", maxWidth: "60%" }} title={r.name}>
                    <span className="inline-block rounded-full shrink-0" style={{ width: 10, height: 10, background: r.color }} />
                    {r.name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed" }}>{r.hours} ชม.</span>
                    <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--wt-soft2)", fontSize: "0.72rem", fontWeight: 800, color: "var(--wt-text)" }}>{r.done}/{r.tasks} งาน</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--wt-soft2)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(r.hours / projectHoursMax) * 100}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time per task (linked Kanban tasks) */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #0369a1, #38bdf8)" }}>
            <Clock size={14} style={{ color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>เวลาที่ใช้ต่องาน</p>
            <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>ชั่วโมงรวมที่ลงให้งานใน Kanban</p>
          </div>
        </div>
        {taskTimeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: "var(--wt-muted)" }}>
            <span style={{ fontSize: "2rem" }}>🔗</span>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีบันทึกที่ผูกกับงาน</p>
            <p style={{ fontSize: "0.78rem", marginTop: 2 }}>ผูกงานได้ตอนเพิ่มบันทึกรายวัน (ช่อง “งานที่เกี่ยวข้อง”)</p>
          </div>
        ) : (
          <div className="space-y-3">
            {taskTimeData.map(t => (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="truncate" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--wt-text)", maxWidth: "75%" }} title={t.title}>📋 {t.title}</span>
                  <span className="shrink-0" style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0369a1" }}>{t.value} ชม.</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--wt-soft2)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(t.value / taskTimeMax) * 100}%`, background: "linear-gradient(90deg, #0369a1, #38bdf8)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent log table */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
            <Zap size={14} style={{ color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>รายการงานล่าสุด</p>
            <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>10 รายการล่าสุด</p>
          </div>
        </div>
        {logEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8" style={{ color: "var(--wt-muted)" }}>
            <span style={{ fontSize: "2rem" }}>📝</span>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีรายการ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["วันที่", "ชื่องาน", "หมวดหมู่", "ชม.", "สถานะ"].map(h => (
                    <th key={h} className="text-left pb-3 pr-3" style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid var(--wt-border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--wt-stripe)" }}>
                    <td className="py-3 pr-3" style={{ fontSize: "0.78rem", color: "var(--wt-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>{e.date}</td>
                    <td className="py-3 pr-3" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--wt-text)", borderBottom: "1px solid var(--wt-soft2)" }}>{e.title}</td>
                    <td className="py-3 pr-3" style={{ whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>
                      <span className="inline-block px-2.5 py-1 rounded-full" style={{ background: "var(--wt-border)", color: "#5b21b6", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>{e.category}</span>
                    </td>
                    <td className="py-3 pr-3" style={{ fontSize: "0.82rem", fontWeight: 800, color: "#7c3aed", textAlign: "right", whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>{e.hours}</td>
                    <td className="py-3" style={{ textAlign: "center", borderBottom: "1px solid var(--wt-soft2)" }}>
                      {e.done
                        ? <span className="inline-block px-2.5 py-1 rounded-full" style={{ background: "#d1fae5", color: "#065f46", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>✅ เสร็จ</span>
                        : <span className="inline-block px-2.5 py-1 rounded-full" style={{ background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>⏳ รอ</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
