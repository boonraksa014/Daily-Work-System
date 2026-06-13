"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Clock, Trash2, X, Sparkles } from "lucide-react";
import { makeId } from "../lib/id";

export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "inprogress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  tags: string[];
  createdAt: string;
  dueDate?: string;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string; dot: string }> = {
  low:    { label: "ต่ำ",  bg: "#d1fae5", text: "#065f46", dot: "#34d399" },
  medium: { label: "กลาง", bg: "#fef3c7", text: "#92400e", dot: "#fbbf24" },
  high:   { label: "สูง",  bg: "#ffe4e6", text: "#9f1239", dot: "#fb7185" },
};

const COLUMN_CONFIG: Record<Status, { label: string; emoji: string; tint: string; ink: string; dot: string; line: string }> = {
  todo:       { label: "รอดำเนินการ",    emoji: "📋", tint: "var(--wt-tint-blue)",   ink: "var(--wt-c-todo-ink)", dot: "#38bdf8", line: "var(--wt-c-todo-line)" },
  inprogress: { label: "กำลังดำเนินการ", emoji: "⚡", tint: "var(--wt-tint-orange)", ink: "var(--wt-c-prog-ink)", dot: "#fb923c", line: "var(--wt-c-prog-line)" },
  done:       { label: "เสร็จสิ้น",      emoji: "✅", tint: "var(--wt-tint-green)",  ink: "var(--wt-c-done-ink)", dot: "#34d399", line: "var(--wt-c-done-line)" },
};

const STATUSES: Status[] = ["todo", "inprogress", "done"];

const TAG_PALETTES = [
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#e0f2fe", text: "#075985" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#ffe4e6", text: "#9f1239" },
];

function tagPalette(tag: string) {
  let sum = 0;
  for (let i = 0; i < tag.length; i++) sum += tag.charCodeAt(i);
  return TAG_PALETTES[sum % TAG_PALETTES.length];
}

const inputStyle: React.CSSProperties = {
  border: "2px solid var(--wt-border)", background: "var(--wt-soft)",
  color: "var(--wt-text)", fontFamily: "inherit",
};
const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "#a78bfa");
const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "var(--wt-border)");
const labelStyle: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em" };

interface AddTaskModalProps {
  status: Status;
  onAdd: (task: Omit<Task, "id" | "createdAt">) => void;
  onClose: () => void;
}

function AddTaskModal({ status, onAdd, onClose }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim() || undefined, priority, status, tags, dueDate: dueDate || undefined });
    onClose();
  }

  const col = COLUMN_CONFIG[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,31,110,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ border: "1px solid var(--wt-border)" }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="เพิ่มงานใหม่">
        <div className="px-6 pt-5 pb-4 flex items-center justify-between" style={{ background: col.tint, borderBottom: `1px solid ${col.line}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "1.1rem" }}>{col.emoji}</span>
            <div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--wt-text)" }}>เพิ่มงานใหม่</h3>
              <p style={{ fontSize: "0.74rem", fontWeight: 600, color: col.ink }}>ลงใน “{col.label}”</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="p-1.5 rounded-xl transition-colors" style={{ color: "var(--wt-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="task-title" style={labelStyle}>ชื่องาน *</label>
            <input id="task-title" className="w-full mt-1 px-4 py-3 rounded-xl outline-none transition-colors"
              style={{ ...inputStyle, fontSize: "0.92rem" }} onFocus={focusBorder} onBlur={blurBorder}
              placeholder="เช่น ทำรายงานประจำเดือน..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>

          <div>
            <label htmlFor="task-desc" style={labelStyle}>รายละเอียด</label>
            <textarea id="task-desc" className="w-full mt-1 px-4 py-3 rounded-xl outline-none transition-colors resize-none"
              style={{ ...inputStyle, fontSize: "0.87rem" }} onFocus={focusBorder} onBlur={blurBorder}
              placeholder="รายละเอียดเพิ่มเติม..." value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>ความสำคัญ</label>
              <div className="flex flex-col gap-1.5 mt-2">
                {(["low", "medium", "high"] as Priority[]).map(p => {
                  const cfg = PRIORITY_CONFIG[p];
                  const active = priority === p;
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)} aria-pressed={active}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors"
                      style={{
                        background: active ? cfg.bg : "transparent",
                        border: `2px solid ${active ? cfg.dot : "var(--wt-border)"}`,
                        color: active ? cfg.text : "var(--wt-muted)",
                        fontSize: "0.82rem", fontWeight: active ? 700 : 500,
                      }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="task-due" style={labelStyle}>กำหนดส่ง</label>
              <input id="task-due" type="date" className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none transition-colors"
                style={{ ...inputStyle, fontSize: "0.85rem" }} onFocus={focusBorder} onBlur={blurBorder}
                value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label htmlFor="task-tag" style={labelStyle}>แท็ก</label>
            <input id="task-tag" className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none transition-colors"
              style={{ ...inputStyle, fontSize: "0.85rem" }} onFocus={focusBorder} onBlur={blurBorder}
              placeholder="พิมพ์แท็กแล้วกด Enter เพื่อเพิ่ม..." value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => {
                  const pal = tagPalette(t);
                  return (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: pal.bg, color: pal.text, fontSize: "0.75rem", fontWeight: 700 }}>
                      {t}
                      <button type="button" aria-label={`ลบแท็ก ${t}`} onClick={() => setTags(tags.filter(x => x !== t))} className="hover:opacity-60"><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl transition-colors"
              style={{ border: "2px solid var(--wt-border)", color: "var(--wt-muted)", fontSize: "0.9rem", fontWeight: 700, background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              ยกเลิก
            </button>
            <button type="submit" disabled={!title.trim()} className="flex-1 py-3 rounded-xl transition-opacity"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.9rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.35)", opacity: title.trim() ? 1 : 0.5, cursor: title.trim() ? "pointer" : "not-allowed" }}>
              เพิ่มงาน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onOpenMenu: (task: Task, anchor: DOMRect) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function TaskCard({ task, onOpenMenu, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const pri = PRIORITY_CONFIG[task.priority];

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={onDragEnd}
      className="group relative rounded-2xl cursor-grab active:cursor-grabbing"
      style={{
        background: "var(--wt-card)",
        border: "1px solid var(--wt-border)",
        boxShadow: "0 1px 3px rgba(76,29,149,0.07)",
        opacity: isDragging ? 0.4 : 1,
        transition: "transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(76,29,149,0.16)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(76,29,149,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: pri.dot }} title={`ความสำคัญ: ${pri.label}`} />
          <p className="flex-1 leading-snug" style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--wt-text)" }}>{task.title}</p>
          <button
            onClick={e => { e.stopPropagation(); onOpenMenu(task, e.currentTarget.getBoundingClientRect()); }}
            aria-label="ตัวเลือกงาน" aria-haspopup="menu"
            className="shrink-0 p-2 -m-1 rounded-lg transition-colors opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
            style={{ color: "var(--wt-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <MoreHorizontal size={16} />
          </button>
        </div>

        {task.description && (
          <p className="mt-1.5 ml-5 line-clamp-2" style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>{task.description}</p>
        )}

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-5">
            {task.tags.map(t => {
              const pal = tagPalette(t);
              return (
                <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: pal.bg, color: pal.text, fontSize: "0.7rem", fontWeight: 700 }}>{t}</span>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 ml-5">
          <span className="px-2.5 py-1 rounded-full" style={{ background: pri.bg, color: pri.text, fontSize: "0.72rem", fontWeight: 700 }}>
            {pri.label}
          </span>
          {task.dueDate && (
            <span className="flex items-center gap-1" style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>
              <Clock size={11} /> {task.dueDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

export function KanbanBoard({ tasks, onTasksChange }: KanbanBoardProps) {
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);
  const [menu, setMenu] = useState<{ task: Task; x: number; y: number } | null>(null);

  // Close the task menu on outside click, scroll, resize, or Escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function addTask(data: Omit<Task, "id" | "createdAt">) {
    onTasksChange([...tasks, { ...data, id: makeId("task"), createdAt: new Date().toISOString().split("T")[0] }]);
  }

  function deleteTask(id: string) { onTasksChange(tasks.filter(t => t.id !== id)); }
  function moveTask(id: string, status: Status) { onTasksChange(tasks.map(t => t.id === id ? { ...t, status } : t)); }

  function handleDrop(status: Status) {
    if (draggingId) moveTask(draggingId, status);
    setDraggingId(null);
    setDragOverCol(null);
  }

  const MENU_WIDTH = 176;
  const menuLeft = menu ? Math.max(8, Math.min(menu.x - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)) : 0;

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2">
      {STATUSES.map(colId => {
        const col = COLUMN_CONFIG[colId];
        const colTasks = tasks.filter(t => t.status === colId);
        const isOver = dragOverCol === colId;

        return (
          <div key={colId} className="flex-1 min-w-[280px] flex flex-col"
            onDragOver={e => { e.preventDefault(); if (dragOverCol !== colId) setDragOverCol(colId); }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
            onDrop={() => handleDrop(colId)}>
            <div
              className="flex flex-col h-full rounded-2xl overflow-hidden transition-shadow"
              style={{
                background: col.tint,
                border: `1px solid ${isOver ? col.dot : col.line}`,
                boxShadow: isOver ? `0 0 0 3px ${col.line}` : "none",
              }}>

              {/* Column header */}
              <div className="px-4 py-3 flex items-center gap-2">
                <span style={{ fontSize: "0.95rem" }}>{col.emoji}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: col.ink }}>{col.label}</span>
                <span className="ml-auto inline-flex items-center justify-center rounded-full"
                  style={{ minWidth: 22, height: 22, padding: "0 7px", background: "var(--wt-card)", color: col.ink, fontSize: "0.72rem", fontWeight: 800 }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-3 space-y-2" style={{ scrollbarWidth: "none" }}>
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: "var(--wt-muted)" }}>
                    <Sparkles size={26} className="mb-2" style={{ opacity: 0.5 }} />
                    <p style={{ fontSize: "0.8rem", fontWeight: 700 }}>ยังไม่มีงาน</p>
                    <p style={{ fontSize: "0.72rem", opacity: 0.75, marginTop: 2 }}>กดปุ่มด้านล่างเพื่อเพิ่ม</p>
                  </div>
                )}
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task}
                    onOpenMenu={(t, anchor) => setMenu({ task: t, x: anchor.right, y: anchor.bottom })}
                    onDragStart={setDraggingId} onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    isDragging={draggingId === task.id} />
                ))}
              </div>

              {/* Add task */}
              <div className="p-3">
                <button onClick={() => setAddingTo(colId)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl transition-colors"
                  style={{ padding: "0.7rem", background: "var(--wt-card)", color: col.ink, fontSize: "0.82rem", fontWeight: 700, border: `1px dashed ${col.line}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = col.dot; e.currentTarget.style.borderStyle = "solid"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = col.line; e.currentTarget.style.borderStyle = "dashed"; }}>
                  <Plus size={15} /> เพิ่มงาน
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Task actions menu — rendered at board root with fixed position so it
          escapes the column's overflow clipping and any card hover-transform. */}
      {menu && (
        <div role="menu" className="rounded-2xl py-1.5"
          style={{
            position: "fixed", top: menu.y + 6, left: menuLeft, width: MENU_WIDTH, zIndex: 60,
            background: "var(--wt-card)", border: "1px solid var(--wt-border)", boxShadow: "0 12px 32px rgba(76,29,149,0.22)",
          }}>
          {STATUSES.filter(s => s !== menu.task.status).map(s => {
            const c = COLUMN_CONFIG[s];
            return (
              <button key={s} role="menuitem" onClick={() => { moveTask(menu.task.id, s); setMenu(null); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors"
                style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--wt-text)" }}
                onMouseEnter={e => (e.currentTarget.style.background = c.tint)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span>{c.emoji}</span> ย้ายไป {c.label}
              </button>
            );
          })}
          <div style={{ borderTop: "1px solid var(--wt-border)", margin: "4px 0" }} />
          <button role="menuitem" onClick={() => { deleteTask(menu.task.id); setMenu(null); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors"
            style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f43f5e" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Trash2 size={13} /> ลบงาน
          </button>
        </div>
      )}

      {/* Backdrop to catch outside clicks while the menu is open. */}
      {menu && <div className="fixed inset-0" style={{ zIndex: 55 }} onClick={() => setMenu(null)} />}

      {addingTo && <AddTaskModal status={addingTo} onAdd={addTask} onClose={() => setAddingTo(null)} />}
    </div>
  );
}
