"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useData } from "@/lib/store";
import { Tooltip } from "@/components/Tooltip";
import type { Status } from "@/components/KanbanBoard";

const NONE = "__none__";
const PAGE_SIZE = 12;

type StatusCfg = { label: string; bg: string; color: string; emoji: string };
const TASK_STATUS: Record<Status, StatusCfg> = {
  todo:       { label: "รอดำเนินการ",    bg: "#e0f2fe", color: "#0369a1", emoji: "📋" },
  inprogress: { label: "กำลังดำเนินการ", bg: "#ffedd5", color: "#9a3412", emoji: "⚡" },
  done:       { label: "เสร็จสิ้น",       bg: "#d1fae5", color: "#065f46", emoji: "✅" },
};
const LOG_OPEN: StatusCfg = { label: "ค้าง", bg: "#fef3c7", color: "#92400e", emoji: "🕒" };

// รวมงาน Kanban + บันทึกรายวัน เป็นแถวเดียวกัน (log ที่ผูก task = รวมชั่วโมงเข้า task ไม่แสดงซ้ำ)
interface Row {
  id: string;
  kind: "task" | "log";
  projectId?: string;
  title: string;
  description: string;
  status: StatusCfg;
  hours: number;   // เวลาที่ใช้ (ชม.)
  created: string; // YYYY-MM-DD
  updated: string; // ISO (task) หรือ YYYY-MM-DD (log)
}

// createdAt = "YYYY-MM-DD", updatedAt(task) = ISO → format เป็นเวลาท้องถิ่น
function fmtDate(s?: string) {
  if (!s) return "-";
  return new Date(s.length <= 10 ? s + "T00:00:00" : s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function fmtDateTime(s?: string) {
  if (!s) return "-";
  return new Date(s.length <= 10 ? s + "T00:00:00" : s).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ProjectTasksPage() {
  const { tasks, logEntries, projects } = useData();
  const [selected, setSelected] = useState<Set<string>>(new Set()); // ว่าง = ทุกโปรเจกต์
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const projById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const projKey = (projectId?: string) => (projectId && projById.has(projectId) ? projectId : NONE);

  // สร้างแถวรวม: task (พร้อมชั่วโมงรวมจาก log ที่ผูก) + บันทึกรายวันที่ "ไม่ผูก" task
  const allRows = useMemo<Row[]>(() => {
    const taskIds = new Set(tasks.map(t => t.id));
    const hoursByTask = new Map<string, number>();
    for (const e of logEntries) {
      if (e.taskId && taskIds.has(e.taskId)) hoursByTask.set(e.taskId, (hoursByTask.get(e.taskId) ?? 0) + e.hours);
    }
    const taskRows: Row[] = tasks.map(t => ({
      id: t.id, kind: "task", projectId: t.projectId, title: t.title, description: t.description ?? "",
      status: TASK_STATUS[t.status], hours: hoursByTask.get(t.id) ?? 0,
      created: t.createdAt, updated: t.updatedAt ?? t.createdAt,
    }));
    // log ที่ไม่ผูก task (หรือ task ถูกลบไปแล้ว) → แถวของตัวเอง
    const logRows: Row[] = logEntries
      .filter(e => !(e.taskId && taskIds.has(e.taskId)))
      .map(e => ({
        id: e.id, kind: "log", projectId: e.projectId, title: e.title, description: e.note ?? "",
        status: e.done ? TASK_STATUS.done : LOG_OPEN, hours: e.hours,
        created: e.date, updated: e.date,
      }));
    return [...taskRows, ...logRows];
  }, [tasks, logEntries]);

  const hasUnassigned = allRows.some(r => projKey(r.projectId) === NONE);
  const filterChips = [
    ...[...projects].sort((a, b) => a.name.localeCompare(b.name)).map(p => ({ key: p.id, name: p.name, color: p.color })),
    ...(hasUnassigned ? [{ key: NONE, name: "ไม่ระบุโปรเจกต์", color: "#94a3b8" }] : []),
  ];

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    return allRows
      .filter(r => (selected.size === 0 || selected.has(projKey(r.projectId)))
        && (!q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)))
      .sort((a, b) => b.updated.localeCompare(a.updated));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, selected, q]);

  const selKey = [...selected].sort().join(",");
  useEffect(() => { setPage(1); }, [selKey, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const totalHours = filtered.reduce((s, r) => s + r.hours, 0);

  const toggle = (key: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>
            <Layers size={15} style={{ color: "white" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--wt-text)" }}>งานตามโปรเจกต์</p>
            <p style={{ fontSize: "0.75rem", color: "var(--wt-muted)" }}>งาน Kanban + บันทึกรายวัน แยกตามโปรเจกต์ · {filtered.length} รายการ · รวม {totalHours} ชม.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--wt-muted)" }}>โปรเจกต์:</span>
            {filterChips.length === 0 && <span style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>ยังไม่มีโปรเจกต์</span>}
            {filterChips.map(c => {
              const active = selected.has(c.key);
              return (
                <button key={c.key} onClick={() => toggle(c.key)} aria-pressed={active}
                  className="flex items-center gap-1.5 rounded-full transition-all"
                  style={{ padding: "0.28rem 0.7rem", fontSize: "0.76rem", fontWeight: 700,
                    background: active ? c.color + "22" : "var(--wt-card)",
                    color: active ? "var(--wt-text)" : "var(--wt-muted)",
                    border: `1px solid ${active ? c.color : "var(--wt-border)"}` }}>
                  <span className="inline-block rounded-full" style={{ width: 9, height: 9, background: c.color }} />
                  {c.name}
                </button>
              );
            })}
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())}
                className="rounded-full" style={{ padding: "0.28rem 0.7rem", fontSize: "0.74rem", fontWeight: 700, color: "#7c3aed", background: "var(--wt-soft2)" }}>
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className="relative" style={{ maxWidth: 360 }}>
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 left-3" style={{ color: "var(--wt-muted)" }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาหัวข้อ / รายละเอียดงาน..."
              aria-label="ค้นหางาน" className="w-full rounded-xl outline-none transition-colors"
              style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.85rem", padding: "0.55rem 2.2rem" }}
              onFocus={e => (e.target.style.borderColor = "#a78bfa")} onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />
            {query && (
              <button onClick={() => setQuery("")} aria-label="ล้างคำค้นหา"
                className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-lg" style={{ color: "var(--wt-muted)" }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl p-5" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.08)" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14" style={{ color: "var(--wt-muted)" }}>
            <span style={{ fontSize: "2.2rem" }}>🗂️</span>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--wt-text)", marginTop: 8 }}>ไม่พบงาน</p>
            <p style={{ fontSize: "0.8rem", marginTop: 2 }}>ลองปรับตัวกรองหรือคำค้นหา</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 900 }}>
                <thead>
                  <tr>
                    {["โปรเจกต์", "หัวข้องาน", "รายละเอียดงาน", "สถานะงาน", "ชั่วโมง", "วันที่สร้าง", "อัปเดตล่าสุด"].map(h => (
                      <th key={h} className="text-left pb-3 pr-3" style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "2px solid var(--wt-border)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const proj = r.projectId ? projById.get(r.projectId) : undefined;
                    return (
                      <tr key={r.kind + r.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--wt-stripe)" }}>
                        <td className="py-3 pr-3" style={{ borderBottom: "1px solid var(--wt-soft2)", whiteSpace: "nowrap" }}>
                          <span className="inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--wt-text)" }}>
                            <span className="inline-block rounded-full shrink-0" style={{ width: 9, height: 9, background: proj?.color ?? "#94a3b8" }} />
                            {proj?.name ?? <span style={{ color: "var(--wt-muted)", fontWeight: 600 }}>ไม่ระบุ</span>}
                          </span>
                        </td>
                        <td className="py-3 pr-3" style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--wt-text)", borderBottom: "1px solid var(--wt-soft2)", minWidth: 160 }}>
                          <span className="inline-flex items-center gap-1.5">
                            <Tooltip label={r.kind === "task" ? "งาน Kanban" : "บันทึกรายวัน"}>
                              <span style={{ fontSize: "0.8rem", cursor: "default" }}>{r.kind === "task" ? "📋" : "✍️"}</span>
                            </Tooltip>
                            {r.title}
                          </span>
                        </td>
                        <td className="py-3 pr-3" style={{ fontSize: "0.8rem", color: "var(--wt-muted)", borderBottom: "1px solid var(--wt-soft2)", maxWidth: 320 }}>
                          {r.description
                            ? <Tooltip label={r.description} wrapperStyle={{ display: "block" }}><span className="line-clamp-2" style={{ cursor: "default" }}>{r.description}</span></Tooltip>
                            : <span>-</span>}
                        </td>
                        <td className="py-3 pr-3" style={{ borderBottom: "1px solid var(--wt-soft2)", whiteSpace: "nowrap" }}>
                          <span className="inline-block px-2.5 py-1 rounded-full" style={{ background: r.status.bg, color: r.status.color, fontSize: "0.72rem", fontWeight: 800 }}>
                            {r.status.emoji} {r.status.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3" style={{ fontSize: "0.8rem", fontWeight: 800, color: r.hours > 0 ? "#7c3aed" : "var(--wt-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>{r.hours > 0 ? `${r.hours} ชม.` : "-"}</td>
                        <td className="py-3 pr-3" style={{ fontSize: "0.78rem", color: "var(--wt-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>{fmtDate(r.created)}</td>
                        <td className="py-3" style={{ fontSize: "0.78rem", color: "var(--wt-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--wt-soft2)" }}>{fmtDateTime(r.updated)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
              <span style={{ fontSize: "0.76rem", color: "var(--wt-muted)" }}>
                แสดง {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={current === 1} aria-label="หน้าก่อนหน้า"
                  className="p-2 rounded-xl transition-colors" style={{ border: "1px solid var(--wt-border)", color: "var(--wt-text)", opacity: current === 1 ? 0.4 : 1, cursor: current === 1 ? "not-allowed" : "pointer" }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--wt-text)", padding: "0 0.5rem" }}>{current} / {pageCount}</span>
                <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={current === pageCount} aria-label="หน้าถัดไป"
                  className="p-2 rounded-xl transition-colors" style={{ border: "1px solid var(--wt-border)", color: "var(--wt-text)", opacity: current === pageCount ? 0.4 : 1, cursor: current === pageCount ? "not-allowed" : "pointer" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
