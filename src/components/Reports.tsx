"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import { TrendingUp, Clock, CheckCircle2, BarChart2, Target, Award, Zap } from "lucide-react";
import type { LogEntry } from "./DailyLog";
import type { Task } from "./KanbanBoard";

interface ReportsProps {
  logEntries: LogEntry[];
  tasks: Task[];
}

const CAT_COLORS: Record<string, string> = {
  "พัฒนาระบบ": "#a78bfa",
  "ประชุม":    "#38bdf8",
  "วางแผน":   "#f472b6",
  "ทดสอบ":    "#fbbf24",
  "เอกสาร":   "#34d399",
  "สนับสนุน":  "#22d3ee",
  "อื่นๆ":    "#94a3b8",
};

const STAT_CARDS = [
  { key: "hours",      emoji: "⏱️", label: "ชั่วโมงงานทั้งหมด", unit: "ชม.",      accent: "#7c3aed", chip: "#ede9fe" },
  { key: "completion", emoji: "✅", label: "อัตราความสำเร็จ",   unit: "%",        accent: "#059669", chip: "#d1fae5" },
  { key: "avg",        emoji: "📈", label: "เฉลี่ยต่อวัน",      unit: "ชม./วัน", accent: "#d97706", chip: "#fef3c7" },
  { key: "topcat",     emoji: "🏆", label: "หมวดหมู่หลัก",      unit: "",         accent: "#db2777", chip: "#fce7f3" },
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

export function Reports({ logEntries, tasks }: ReportsProps) {
  const [rangeDays, setRangeDays] = useState(7);

  // Per-day series over the selected range (oldest -> newest)
  const days = Array.from({ length: rangeDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (rangeDays - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("th-TH", rangeDays > 7 ? { day: "numeric", month: "short" } : { weekday: "short" });
    const hours = logEntries.filter(e => e.date === dateStr).reduce((s, e) => s + e.hours, 0);
    const done = logEntries.filter(e => e.date === dateStr && e.done).length;
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
    if (!entryDates.has(d.toISOString().split("T")[0])) d.setDate(d.getDate() - 1);
    while (entryDates.has(d.toISOString().split("T")[0])) { streak++; d.setDate(d.getDate() - 1); }
  }

  // Stats
  const totalHours = logEntries.reduce((s, e) => s + e.hours, 0);
  const doneEntries = logEntries.filter(e => e.done).length;
  const completionRate = logEntries.length > 0 ? Math.round((doneEntries / logEntries.length) * 100) : 0;
  const avgHoursPerDay = (days.reduce((s, d) => s + d.hours, 0) / rangeDays).toFixed(1);
  const topCategory = categoryData[0]?.name ?? "-";

  const statValues: Record<string, string | number> = {
    hours: totalHours, completion: completionRate, avg: avgHoursPerDay, topcat: topCategory,
  };

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
        <div className="flex items-center gap-2 rounded-xl" style={{ padding: "0.45rem 0.8rem", background: "var(--wt-tint-orange)", border: "1px solid var(--wt-c-prog-line)" }}>
          <span style={{ fontSize: "1rem" }}>🔥</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--wt-c-prog-ink)" }}>{streak} วันติด</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(s => (
          <div key={s.key} className="rounded-2xl p-4 bg-white"
            style={{ border: "1px solid var(--wt-border)", boxShadow: "0 1px 3px rgba(76,29,149,0.06)" }}>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: s.chip, fontSize: "1rem" }}>{s.emoji}</span>
            <p style={{ fontSize: "1.7rem", fontWeight: 800, lineHeight: 1.1, marginTop: 8, color: s.accent }}>{statValues[s.key]}</p>
            <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)", fontWeight: 600, marginTop: 2 }}>{s.label}{s.unit ? ` · ${s.unit}` : ""}</p>
          </div>
        ))}
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
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>ชั่วโมงงาน {rangeDays} วันล่าสุด</p>
              <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>บันทึกการทำงานรายวัน</p>
            </div>
          </div>
          {days.every(d => d.hours === 0) ? (
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
                <YAxis tick={{ fontSize: 11, fill: "#9b8fb5", fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unitSuffix="ชม." />} />
                <Area type="monotone" dataKey="hours" name="ชั่วโมง" stroke="#7c3aed" strokeWidth={3} fill="url(#hoursGrad)"
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
                    <Cell key={`cat-${i}`} fill={CAT_COLORS[entry.name] || "#a78bfa"} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip unitSuffix="ชม." />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: "Nunito", fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Task status + Bar chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        {/* Daily done bar chart */}
        <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)" }}>
              <BarChart2 size={14} style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--wt-text)" }}>งานสำเร็จรายวัน</p>
              <p style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>จำนวนงานที่เสร็จ {rangeDays} วัน</p>
            </div>
          </div>
          {days.every(d => d.done === 0) ? (
            <div className="flex flex-col items-center justify-center h-44" style={{ color: "var(--wt-muted)" }}>
              <span style={{ fontSize: "2rem" }}>📊</span>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 8 }}>ยังไม่มีข้อมูล</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={days} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.12)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9b8fb5", fontFamily: "Nunito" }} axisLine={false} tickLine={false} interval={tickInterval} />
                <YAxis tick={{ fontSize: 11, fill: "#9b8fb5", fontFamily: "Nunito" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unitSuffix="งาน" />} />
                <Bar dataKey="done" name="เสร็จ" radius={[8, 8, 0, 0]} fill="url(#doneGrad)" />
                <defs>
                  <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
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
                {[...logEntries].reverse().slice(0, 10).map((e, i) => (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--wt-stripe)" }}>
                    <td className="py-3 pr-3" style={{ fontSize: "0.78rem", color: "var(--wt-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>{e.date}</td>
                    <td className="py-3 pr-3" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--wt-text)", borderBottom: "1px solid var(--wt-soft2)" }}>{e.title}</td>
                    <td className="py-3 pr-3" style={{ borderBottom: "1px solid var(--wt-soft2)" }}>
                      <span className="px-2.5 py-1 rounded-full" style={{ background: "var(--wt-border)", color: "#5b21b6", fontSize: "0.7rem", fontWeight: 700 }}>{e.category}</span>
                    </td>
                    <td className="py-3 pr-3" style={{ fontSize: "0.82rem", fontWeight: 800, color: "#7c3aed", textAlign: "right", borderBottom: "1px solid var(--wt-soft2)" }}>{e.hours}</td>
                    <td className="py-3" style={{ textAlign: "center", borderBottom: "1px solid var(--wt-soft2)" }}>
                      {e.done
                        ? <span className="px-2.5 py-1 rounded-full" style={{ background: "#d1fae5", color: "#065f46", fontSize: "0.7rem", fontWeight: 700 }}>✅ เสร็จ</span>
                        : <span className="px-2.5 py-1 rounded-full" style={{ background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 700 }}>⏳ รอ</span>}
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
