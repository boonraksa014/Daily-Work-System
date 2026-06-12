import { useState } from "react";
import { Plus, MoreHorizontal, Clock, Trash2, X, GripVertical, Sparkles } from "lucide-react";
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

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string; bar: string }> = {
  low:    { label: "ต่ำ",  bg: "#d1fae5", text: "#065f46", bar: "#34d399" },
  medium: { label: "กลาง", bg: "#fef3c7", text: "#92400e", bar: "#fbbf24" },
  high:   { label: "สูง",  bg: "#ffe4e6", text: "#9f1239", bar: "#fb7185" },
};

const COLUMN_CONFIG: Record<Status, {
  label: string; emoji: string;
  bg: string; border: string; headerBg: string; headerText: string; badgeBg: string; badgeText: string;
  btnBg: string; btnText: string; dotColor: string;
}> = {
  todo: {
    label: "รอดำเนินการ", emoji: "📋",
    bg: "#f0f9ff", border: "#bae6fd", headerBg: "#e0f2fe", headerText: "#075985",
    badgeBg: "#bae6fd", badgeText: "#075985", btnBg: "#e0f2fe", btnText: "#0369a1",
    dotColor: "#38bdf8",
  },
  inprogress: {
    label: "กำลังดำเนินการ", emoji: "⚡",
    bg: "#fff7ed", border: "#fed7aa", headerBg: "#ffedd5", headerText: "#9a3412",
    badgeBg: "#fed7aa", badgeText: "#9a3412", btnBg: "#ffedd5", btnText: "#c2410c",
    dotColor: "#fb923c",
  },
  done: {
    label: "เสร็จสิ้น", emoji: "✅",
    bg: "#f0fdf4", border: "#bbf7d0", headerBg: "#dcfce7", headerText: "#166534",
    badgeBg: "#bbf7d0", badgeText: "#166534", btnBg: "#dcfce7", btnText: "#15803d",
    dotColor: "#34d399",
  },
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,31,110,0.3)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ background: col.headerBg }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "1.2rem" }}>{col.emoji}</span>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: col.headerText }}>เพิ่มงานใหม่</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl transition hover:bg-black/10" style={{ color: col.headerText }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: col.headerText, opacity: 0.7, marginTop: 2 }}>เพิ่มลงใน "{col.label}"</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em" }}>ชื่องาน *</label>
            <input
              className="w-full mt-1 px-4 py-3 rounded-xl outline-none transition"
              style={{ border: "2px solid #ede9fe", background: "#faf8ff", fontSize: "0.92rem", color: "#2d1f6e", fontFamily: "inherit" }}
              onFocus={e => (e.target.style.borderColor = "#a78bfa")}
              onBlur={e => (e.target.style.borderColor = "#ede9fe")}
              placeholder="เช่น ทำรายงานประจำเดือน..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em" }}>รายละเอียด</label>
            <textarea
              className="w-full mt-1 px-4 py-3 rounded-xl outline-none transition resize-none"
              style={{ border: "2px solid #ede9fe", background: "#faf8ff", fontSize: "0.87rem", color: "#2d1f6e", fontFamily: "inherit" }}
              onFocus={e => (e.target.style.borderColor = "#a78bfa")}
              onBlur={e => (e.target.style.borderColor = "#ede9fe")}
              placeholder="รายละเอียดเพิ่มเติม..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em" }}>ความสำคัญ</label>
              <div className="flex flex-col gap-1.5 mt-2">
                {(["low", "medium", "high"] as Priority[]).map(p => {
                  const cfg = PRIORITY_CONFIG[p];
                  const active = priority === p;
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition"
                      style={{
                        background: active ? cfg.bg : "transparent",
                        border: `2px solid ${active ? cfg.bar : "#ede9fe"}`,
                        color: active ? cfg.text : "#7c6a9e",
                        fontSize: "0.82rem", fontWeight: active ? 700 : 500,
                      }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.bar }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em" }}>กำหนดส่ง</label>
              <input
                type="date"
                className="w-full mt-1 px-3 py-2.5 rounded-xl outline-none transition"
                style={{ border: "2px solid #ede9fe", background: "#faf8ff", fontSize: "0.85rem", color: "#2d1f6e", fontFamily: "inherit" }}
                onFocus={e => (e.target.style.borderColor = "#a78bfa")}
                onBlur={e => (e.target.style.borderColor = "#ede9fe")}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em" }}>แท็ก</label>
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 px-3 py-2.5 rounded-xl outline-none transition"
                style={{ border: "2px solid #ede9fe", background: "#faf8ff", fontSize: "0.85rem", color: "#2d1f6e", fontFamily: "inherit" }}
                onFocus={e => (e.target.style.borderColor = "#a78bfa")}
                onBlur={e => (e.target.style.borderColor = "#ede9fe")}
                placeholder="พิมพ์แท็ก Enter เพื่อเพิ่ม..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => {
                  const pal = tagPalette(t);
                  return (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: pal.bg, color: pal.text, fontSize: "0.75rem", fontWeight: 700 }}>
                      {t}
                      <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:opacity-60"><X size={10} /></button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl transition"
              style={{ border: "2px solid #ede9fe", color: "#7c6a9e", fontSize: "0.9rem", fontWeight: 700, background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ff")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              ยกเลิก
            </button>
            <button type="submit"
              className="flex-1 py-3 rounded-xl transition"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.9rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
              ✨ เพิ่มงาน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onMove: (id: string, status: Status) => void;
  onDragStart: (id: string) => void;
}

function TaskCard({ task, onDelete, onMove, onDragStart }: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pri = PRIORITY_CONFIG[task.priority];
  const STATUSES: Status[] = ["todo", "inprogress", "done"];
  const others = STATUSES.filter(s => s !== task.status);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="group relative bg-white rounded-2xl transition-all cursor-grab active:cursor-grabbing"
      style={{
        border: "2px solid transparent",
        boxShadow: "0 2px 8px rgba(124,58,237,0.08)",
        borderLeft: `4px solid ${pri.bar}`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.15)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(124,58,237,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-2">
          <GripVertical size={14} className="opacity-0 group-hover:opacity-30 mt-0.5 shrink-0 transition" style={{ color: "#7c6a9e" }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="leading-snug" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#2d1f6e" }}>{task.title}</p>
              <div className="relative shrink-0">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition"
                  style={{ color: "#7c6a9e" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <MoreHorizontal size={14} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 z-20 bg-white rounded-2xl shadow-xl overflow-hidden py-2 w-40"
                    style={{ border: "2px solid #ede9fe" }} onMouseLeave={() => setMenuOpen(false)}>
                    {others.map(s => {
                      const col = COLUMN_CONFIG[s];
                      return (
                        <button key={s} onClick={() => { onMove(task.id, s); setMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-left transition"
                          style={{ fontSize: "0.8rem", fontWeight: 600, color: "#2d1f6e" }}
                          onMouseEnter={e => (e.currentTarget.style.background = col.headerBg)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <span>{col.emoji}</span> {col.label}
                        </button>
                      );
                    })}
                    <div style={{ borderTop: "1px solid #ede9fe", margin: "4px 0" }} />
                    <button onClick={() => { onDelete(task.id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-left transition"
                      style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f43f5e" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fff1f2")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <Trash2 size={12} /> ลบงาน
                    </button>
                  </div>
                )}
              </div>
            </div>

            {task.description && (
              <p className="mt-1 line-clamp-2" style={{ fontSize: "0.78rem", color: "#7c6a9e" }}>{task.description}</p>
            )}

            {task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map(t => {
                  const pal = tagPalette(t);
                  return (
                    <span key={t} className="px-2 py-0.5 rounded-full" style={{ background: pal.bg, color: pal.text, fontSize: "0.7rem", fontWeight: 700 }}>{t}</span>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <span className="px-2.5 py-1 rounded-full" style={{ background: pri.bg, color: pri.text, fontSize: "0.72rem", fontWeight: 700 }}>
                {pri.label}
              </span>
              {task.dueDate && (
                <span className="flex items-center gap-1" style={{ fontSize: "0.72rem", color: "#7c6a9e" }}>
                  <Clock size={10} /> {task.dueDate}
                </span>
              )}
            </div>
          </div>
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

  const STATUSES: Status[] = ["todo", "inprogress", "done"];

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2">
      {STATUSES.map(colId => {
        const col = COLUMN_CONFIG[colId];
        const colTasks = tasks.filter(t => t.status === colId);
        const isOver = dragOverCol === colId;

        return (
          <div key={colId} className="flex-1 min-w-[280px] flex flex-col"
            onDragOver={e => { e.preventDefault(); setDragOverCol(colId); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(colId)}>
            <div
              className="flex flex-col h-full rounded-2xl overflow-hidden transition-all"
              style={{
                background: col.bg,
                border: `2px solid ${isOver ? col.dotColor : col.border}`,
                boxShadow: isOver ? `0 0 0 4px ${col.border}` : "none",
              }}>

              {/* Column header */}
              <div className="px-4 py-3.5 flex items-center justify-between" style={{ background: col.headerBg }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "1rem" }}>{col.emoji}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: col.headerText }}>{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: col.badgeBg, color: col.badgeText, fontSize: "0.7rem", fontWeight: 800 }}>
                    {colTasks.length}
                  </span>
                </div>
                <button onClick={() => setAddingTo(colId)}
                  className="p-1.5 rounded-xl transition"
                  style={{ color: col.headerText }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.08)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <Plus size={15} />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ scrollbarWidth: "none" }}>
                {colTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10" style={{ color: col.headerText, opacity: 0.4 }}>
                    <Sparkles size={28} className="mb-2" />
                    <p style={{ fontSize: "0.8rem", fontWeight: 700 }}>ยังไม่มีงาน</p>
                    <p style={{ fontSize: "0.72rem" }}>กดปุ่ม + เพื่อเพิ่มงาน</p>
                  </div>
                )}
                {colTasks.map(task => (
                  <TaskCard key={task.id} task={task} onDelete={deleteTask} onMove={moveTask} onDragStart={setDraggingId} />
                ))}
              </div>

              {/* Add button */}
              <div className="p-3 pt-0">
                <button onClick={() => setAddingTo(colId)}
                  className="w-full py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                  style={{ background: col.btnBg, color: col.btnText, fontSize: "0.82rem", fontWeight: 700, border: `2px dashed ${col.border}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = col.dotColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = col.border)}>
                  <Plus size={14} /> เพิ่มงาน
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {addingTo && <AddTaskModal status={addingTo} onAdd={addTask} onClose={() => setAddingTo(null)} />}
    </div>
  );
}
