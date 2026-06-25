"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, Clock, Trash2, X, Sparkles, Pencil, Search, ChevronDown, Check } from "lucide-react";
import { makeId } from "../lib/id";
import { DatePicker } from "./DatePicker";
import type { LogEntry } from "./DailyLog";
import type { Project, Category } from "../types";

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
  projectId?: string; // โปรเจกต์ที่งานนี้สังกัด (ถ้ามี)
  categoryId?: string; // หมวดหมู่ของงานนี้ (ถ้ามี)
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

function todayStr() { return new Date().toISOString().split("T")[0]; }
function isOverdue(task: Task) { return !!task.dueDate && task.dueDate < todayStr() && task.status !== "done"; }

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
}

const inputStyle: React.CSSProperties = {
  border: "2px solid var(--wt-border)", background: "var(--wt-soft)",
  color: "var(--wt-text)", fontFamily: "inherit",
};
const focusBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "#a78bfa");
const blurBorder = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "var(--wt-border)");
const labelStyle: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em" };

type TaskDraft = Omit<Task, "id" | "createdAt">;

/** เลือกแท็กได้หลายตัวจาก master (dropdown + checkbox) */
function TagMultiSelect({ options, value, onChange }: { options: string[]; value: string[]; onChange: (next: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // รวม options ของ master กับที่เลือกไว้ (เผื่อแท็กที่เลือกถูกปิด/ลบจาก master แล้ว)
  const all = Array.from(new Set([...options, ...value]));
  const f = filter.trim().toLowerCase();
  const shown = all.filter(t => !f || t.toLowerCase().includes(f)).sort();

  return (
    <div className="relative mt-1" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="w-full px-3 py-2.5 rounded-xl outline-none flex items-center justify-between gap-2 transition-colors"
        style={{ ...inputStyle, fontSize: "0.85rem", borderColor: open ? "#a78bfa" : "var(--wt-border)" }}>
        <span style={{ color: value.length ? "var(--wt-text)" : "var(--wt-muted)", fontWeight: value.length ? 600 : 400 }}>
          {value.length ? `เลือกแล้ว ${value.length} แท็ก` : "เลือกแท็ก..."}
        </span>
        <ChevronDown size={16} style={{ color: "var(--wt-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div role="listbox" className="mt-1 rounded-xl overflow-hidden"
          style={{ background: "var(--wt-soft)", border: "2px solid var(--wt-border)" }}>
          {all.length > 6 && (
            <div className="p-2" style={{ borderBottom: "1px solid var(--wt-border)" }}>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="ค้นหาแท็ก..." autoFocus
                className="w-full px-2.5 py-1.5 rounded-lg outline-none" style={{ ...inputStyle, fontSize: "0.82rem" }} />
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {shown.length === 0 && (
              <p className="px-3 py-3 text-center" style={{ fontSize: "0.8rem", color: "var(--wt-muted)" }}>
                {all.length === 0 ? "ยังไม่มีแท็ก — เพิ่มที่ ตั้งค่า → แท็ก" : "ไม่พบแท็ก"}
              </p>
            )}
            {shown.map(t => {
              const checked = value.includes(t);
              return (
                <button key={t} type="button" role="option" aria-selected={checked} onClick={() => onChange(toggle(value, t))}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                  style={{ background: checked ? "var(--wt-soft2)" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = checked ? "var(--wt-soft2)" : "transparent")}>
                  <span className="inline-flex items-center justify-center rounded shrink-0"
                    style={{ width: 16, height: 16, border: `2px solid ${checked ? "#7c3aed" : "var(--wt-border)"}`, background: checked ? "#7c3aed" : "transparent" }}>
                    {checked && <Check size={11} color="#fff" />}
                  </span>
                  <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--wt-text)" }}>{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode; // emoji หรือจุดสี (ถ้ามี)
  dim?: boolean; // จาง (เช่น รายการที่ปิดใช้งาน)
}

/** dropdown เลือกค่าเดียว สไตล์เข้าธีมแอป (แทน <select> ของระบบที่ปรับหน้าตาไม่ได้) */
function SingleSelect({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: SelectOption[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const selected = options.find(o => o.value === value) ?? options[0];
  const isPlaceholder = !value;

  return (
    <div className="relative mt-1" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        className="w-full px-3 py-2.5 rounded-xl outline-none flex items-center justify-between gap-2 transition-colors"
        style={{ ...inputStyle, fontSize: "0.85rem", borderColor: open ? "#a78bfa" : "var(--wt-border)" }}>
        <span className="flex items-center gap-2 min-w-0" style={{ color: isPlaceholder ? "var(--wt-muted)" : "var(--wt-text)", fontWeight: isPlaceholder ? 400 : 600 }}>
          {!isPlaceholder && selected?.icon && <span className="flex items-center justify-center shrink-0" style={{ width: 18 }}>{selected.icon}</span>}
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDown size={16} style={{ color: "var(--wt-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
      </button>

      {open && (
        <div role="listbox" className="mt-1.5 rounded-xl overflow-hidden"
          style={{ background: "var(--wt-card)", border: "1px solid var(--wt-border)", boxShadow: "0 14px 36px rgba(76,29,149,0.22)", animation: "wt-pop-in 0.14s ease-out" }}>
          <div style={{ maxHeight: 248, overflowY: "auto" }}>
            {options.map(o => {
              const sel = o.value === value;
              return (
                <button key={o.value || "__empty"} type="button" role="option" aria-selected={sel}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                  style={{ background: sel ? "var(--wt-soft2)" : "transparent", opacity: o.dim ? 0.55 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = sel ? "var(--wt-soft2)" : "transparent")}>
                  <span className="flex items-center justify-center shrink-0" style={{ width: 18 }}>{o.icon}</span>
                  <span className="flex-1 truncate" style={{ fontSize: "0.85rem", fontWeight: sel ? 700 : 500, color: o.value ? "var(--wt-text)" : "var(--wt-muted)" }}>{o.label}</span>
                  {sel && <Check size={15} color="#7c3aed" className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** ตัวปรับชั่วโมงแบบ pill (− ค่า ชม. +) ใช้ร่วมกันในหลายที่ของ modal */
function HoursStepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const hover = (on: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = on ? "var(--wt-soft2)" : "transparent");
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl p-1 shrink-0" style={{ background: "var(--wt-card)", border: "1px solid var(--wt-border)" }}>
      <button type="button" aria-label="ลดชั่วโมง" onClick={() => onChange(Math.max(0.5, value - 0.5))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: "#7c3aed", fontWeight: 800, fontSize: "1.2rem", lineHeight: 1 }}
        onMouseEnter={hover(true)} onMouseLeave={hover(false)}>−</button>
      <span className="flex items-baseline justify-center gap-1" style={{ minWidth: 58 }}>
        <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--wt-text)" }}>{value}</span>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wt-muted)" }}>ชม.</span>
      </span>
      <button type="button" aria-label="เพิ่มชั่วโมง" onClick={() => onChange(Math.min(12, value + 0.5))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: "#7c3aed", fontWeight: 800, fontSize: "1.2rem", lineHeight: 1 }}
        onMouseEnter={hover(true)} onMouseLeave={hover(false)}>+</button>
    </div>
  );
}

interface TaskModalProps {
  status: Status;
  initial?: Task;
  availableTags: string[];
  availableProjects: Project[];
  availableCategories: Category[];
  /** บันทึกรายวันที่ผูกกับงานนี้ (สำหรับแก้ชั่วโมงที่ลงไปแล้ว — เฉพาะตอนแก้งาน) */
  taskLogs?: LogEntry[];
  /** แก้ชั่วโมงของรายการบันทึกรายวันที่ผูกกับงานนี้ */
  onUpdateLogHours?: (logId: string, hours: number) => void;
  /** สร้างบันทึกรายวันของวันนี้ผูกกับงาน (ใช้ตอนแก้งานแล้วติ๊กลงเวลาวันนี้) */
  onLogTime?: (info: { taskId: string; title: string; hours: number; projectId?: string; categoryId?: string }) => void;
  onSubmit: (data: TaskDraft, log?: { hours: number }) => void;
  onClose: () => void;
}

function TaskModal({ status, initial, availableTags, availableProjects, availableCategories, taskLogs = [], onUpdateLogHours, onLogTime, onSubmit, onClose }: TaskModalProps) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [alsoLog, setAlsoLog] = useState(false); // ลงเวลาที่ทำวันนี้ด้วย (เฉพาะตอนเพิ่มงานใหม่)
  const [logHours, setLogHours] = useState(1);
  // ค่าชั่วโมงที่กำลังแก้ของแต่ละบันทึก (ยังไม่ apply จนกว่าจะกดบันทึก) — key = log id
  const [logEdits, setLogEdits] = useState<Record<string, number>>({});

  // แสดงเฉพาะโปรเจกต์ที่เปิดใช้งาน — แต่คงโปรเจกต์ที่เลือกไว้แม้ถูกปิด (กรณีแก้งานเก่า)
  const pickableProjects = availableProjects.filter(p => p.isActive || p.id === projectId);
  // แสดงเฉพาะหมวดที่เปิดใช้งาน — แต่คงหมวดที่เลือกไว้แม้ถูกปิด (กรณีแก้งานเก่า)
  const pickableCategories = availableCategories.filter(c => c.isActive || c.id === categoryId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    // ตอนเพิ่มงานใหม่: ส่ง log ไปให้ addTask สร้างบันทึกพร้อม id ของงานที่เพิ่งสร้าง
    const log = !isEdit && alsoLog ? { hours: logHours } : undefined;
    onSubmit({ title: title.trim(), description: description.trim() || undefined, priority, status, tags, dueDate: dueDate || undefined, projectId: projectId || undefined, categoryId: categoryId || undefined }, log);
    if (isEdit && initial) {
      // ติ๊กลงเวลาวันนี้ตอนแก้งาน → สร้างบันทึกใหม่ผูกกับงานนี้
      if (alsoLog && onLogTime) {
        onLogTime({ taskId: initial.id, title: title.trim(), hours: logHours, projectId: projectId || undefined, categoryId: categoryId || undefined });
      }
      // apply การแก้ชั่วโมงของบันทึกเดิมที่ผูกกับงานนี้ (เฉพาะที่เปลี่ยนจริง)
      if (onUpdateLogHours) {
        for (const l of taskLogs) {
          const next = logEdits[l.id];
          if (next !== undefined && next !== l.hours) onUpdateLogHours(l.id, next);
        }
      }
    }
    onClose();
  }

  const col = COLUMN_CONFIG[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,31,110,0.4)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" style={{ border: "1px solid var(--wt-border)", maxHeight: "90vh" }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isEdit ? "แก้ไขงาน" : "เพิ่มงานใหม่"}>
        <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0" style={{ background: col.tint, borderBottom: `1px solid ${col.line}` }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "1.1rem" }}>{col.emoji}</span>
            <div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--wt-text)" }}>{isEdit ? "แก้ไขงาน" : "เพิ่มงานใหม่"}</h3>
              <p style={{ fontSize: "0.74rem", fontWeight: 600, color: col.ink }}>{isEdit ? "ใน" : "ลงใน"} “{col.label}”</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="p-1.5 rounded-xl transition-colors" style={{ color: "var(--wt-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
              <label style={labelStyle}>กำหนดส่ง</label>
              <div className="mt-1">
                <DatePicker value={dueDate} onChange={setDueDate} clearable placeholder="ไม่กำหนด" ariaLabel="กำหนดส่ง" />
              </div>
            </div>
          </div>

          {availableCategories.length > 0 && (
            <div>
              <label style={labelStyle}>หมวดหมู่</label>
              <SingleSelect ariaLabel="หมวดหมู่" value={categoryId} onChange={setCategoryId}
                options={[
                  { value: "", label: "— ไม่ระบุหมวดหมู่ —" },
                  ...pickableCategories.map(c => ({
                    value: c.id,
                    label: c.name + (!c.isActive ? " (ปิดใช้งาน)" : ""),
                    icon: <span style={{ fontSize: "1rem", lineHeight: 1 }}>{c.emoji}</span>,
                    dim: !c.isActive,
                  })),
                ]} />
            </div>
          )}

          {availableProjects.length > 0 && (
            <div>
              <label style={labelStyle}>โปรเจกต์</label>
              <SingleSelect ariaLabel="โปรเจกต์" value={projectId} onChange={setProjectId}
                options={[
                  { value: "", label: "— ไม่ระบุโปรเจกต์ —" },
                  ...pickableProjects.map(p => ({
                    value: p.id,
                    label: p.name + (!p.isActive ? " (ปิดใช้งาน)" : ""),
                    icon: <span className="inline-block rounded-full" style={{ width: 11, height: 11, background: p.color }} />,
                    dim: !p.isActive,
                  })),
                ]} />
            </div>
          )}

          <div>
            <label style={labelStyle}>แท็ก</label>
            <TagMultiSelect options={availableTags} value={tags} onChange={setTags} />
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

          {/* ลงเวลาที่ทำวันนี้ — มีทั้งตอนเพิ่มงานใหม่และตอนแก้งาน */}
          <div className="rounded-2xl p-3.5 transition-colors"
            style={{ border: `2px solid ${alsoLog ? "#c4b5fd" : "var(--wt-border)"}`, background: alsoLog ? "rgba(124,58,237,0.05)" : "var(--wt-soft)" }}>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={alsoLog} onChange={e => setAlsoLog(e.target.checked)} className="sr-only" />
              <span className="inline-flex items-center justify-center rounded-lg shrink-0 transition-all"
                style={{ width: 22, height: 22, border: `2px solid ${alsoLog ? "#7c3aed" : "var(--wt-border)"}`, background: alsoLog ? "#7c3aed" : "var(--wt-card)" }}>
                {alsoLog && <Check size={14} color="#fff" strokeWidth={3} />}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--wt-text)" }}>
                <span style={{ fontSize: "1rem" }}>⏱️</span> ลงเวลาที่ทำงานนี้วันนี้
              </span>
            </label>
            {alsoLog && (
              <div className="flex items-center gap-3 mt-3.5 flex-wrap" style={{ marginLeft: 34 }}>
                <HoursStepper value={logHours} onChange={setLogHours} />
                <span style={{ fontSize: "0.74rem", color: "var(--wt-muted)" }}>จะไปอยู่ในบันทึกรายวันของวันนี้</span>
              </div>
            )}
          </div>

          {/* แก้ชั่วโมงที่ลงให้งานนี้ก่อนหน้า — เฉพาะตอนแก้งาน และมีบันทึกที่ผูกไว้ */}
          {isEdit && taskLogs.length > 0 && (
            <div className="rounded-xl p-3" style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--wt-text)" }}>⏱️ เวลาที่ลงให้งานนี้</p>
              <div className="mt-2 space-y-2">
                {[...taskLogs].sort((a, b) => b.date.localeCompare(a.date)).map(l => {
                  const val = logEdits[l.id] ?? l.hours;
                  return (
                    <div key={l.id} className="flex items-center gap-3">
                      <span style={{ fontSize: "0.78rem", color: "var(--wt-muted)", minWidth: 92 }}>{l.date}</span>
                      <HoursStepper value={val} onChange={(next) => setLogEdits(prev => ({ ...prev, [l.id]: next }))} />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2" style={{ fontSize: "0.72rem", color: "var(--wt-muted)" }}>แก้แล้วกด “บันทึก” เพื่อยืนยัน</p>
            </div>
          )}

          </div>
          <div className="flex gap-3 p-4 shrink-0" style={{ borderTop: "1px solid var(--wt-border)", background: "var(--wt-card)" }}>
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl transition-colors"
              style={{ border: "2px solid var(--wt-border)", color: "var(--wt-muted)", fontSize: "0.9rem", fontWeight: 700, background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              ยกเลิก
            </button>
            <button type="submit" disabled={!title.trim()} className="flex-1 py-3 rounded-xl transition-opacity"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.9rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.35)", opacity: title.trim() ? 1 : 0.5, cursor: title.trim() ? "pointer" : "not-allowed" }}>
              {isEdit ? "บันทึก" : "เพิ่มงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  loggedHours: number; // ชั่วโมงรวมที่ลงในบันทึกรายวันให้งานนี้
  project?: Project; // โปรเจกต์ที่งานนี้สังกัด (ถ้ามี)
  category?: Category; // หมวดหมู่ของงานนี้ (ถ้ามี)
  onOpenMenu: (task: Task, anchor: DOMRect) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function TaskCard({ task, loggedHours, project, category, onOpenMenu, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const pri = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task);

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

        {(category || project) && (
          <div className="flex flex-wrap gap-1 mt-2 ml-5">
            {category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: category.color + "22", color: "var(--wt-text)", fontSize: "0.7rem", fontWeight: 700 }}>
                {category.emoji} {category.name}
              </span>
            )}
            {project && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: project.color + "22", color: "var(--wt-text)", fontSize: "0.7rem", fontWeight: 700 }}>
                <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: project.color }} />
                {project.name}
              </span>
            )}
          </div>
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
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full" style={{ background: pri.bg, color: pri.text, fontSize: "0.72rem", fontWeight: 700 }}>
              {pri.label}
            </span>
            {loggedHours > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "var(--wt-soft2)", color: "#7c3aed", fontSize: "0.7rem", fontWeight: 800 }} title="ชั่วโมงที่ลงให้งานนี้">
                <Clock size={10} /> {loggedHours} ชม.
              </span>
            )}
          </div>
          {task.dueDate && (
            <span className="flex items-center gap-1" style={{ fontSize: "0.72rem", fontWeight: overdue ? 800 : 400, color: overdue ? "#e11d48" : "var(--wt-muted)" }}
              title={overdue ? "เลยกำหนดแล้ว" : undefined}>
              <Clock size={11} /> {task.dueDate}{overdue ? " · เลยกำหนด" : ""}
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
  /** ถ้าส่งมา จะใช้แทนการลบตรงๆ (เพื่อให้มี undo) */
  onDeleteTask?: (id: string) => void;
  /** รายชื่อแท็กจาก master (เฉพาะที่เปิดใช้งาน) สำหรับ dropdown เลือกแท็ก */
  availableTags?: string[];
  /** โปรเจกต์จาก master สำหรับ dropdown เลือกโปรเจกต์ของงาน */
  availableProjects?: Project[];
  /** หมวดหมู่จาก master สำหรับ dropdown เลือกหมวดหมู่ของงาน */
  availableCategories?: Category[];
  /** บันทึกรายวัน — ใช้คำนวณชั่วโมงที่ลงให้แต่ละงาน */
  logEntries?: LogEntry[];
  /** ถ้าส่งมา: ตอนเพิ่มงานแล้วติ๊ก "ลงเวลาด้วย" จะเรียกเพื่อสร้างบันทึกรายวันให้งานนั้น */
  onLogTime?: (info: { taskId: string; title: string; hours: number; projectId?: string; categoryId?: string }) => void;
  /** แก้ชั่วโมงของบันทึกรายวันที่ผูกกับงาน (ใช้ในหน้าแก้งาน) */
  onUpdateLogHours?: (logId: string, hours: number) => void;
}

export function KanbanBoard({ tasks, onTasksChange, onDeleteTask, availableTags = [], availableProjects = [], availableCategories = [], logEntries = [], onLogTime, onUpdateLogHours }: KanbanBoardProps) {
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [priFilter, setPriFilter] = useState<Priority[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
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

  function addTask(data: TaskDraft, log?: { hours: number }) {
    const id = makeId("task");
    onTasksChange([...tasks, { ...data, id, createdAt: new Date().toISOString().split("T")[0] }]);
    // ติ๊ก "ลงเวลาด้วย" → สร้างบันทึกรายวันของวันนี้ที่ผูกกับงานนี้
    if (log && onLogTime) onLogTime({ taskId: id, title: data.title, hours: log.hours, projectId: data.projectId, categoryId: data.categoryId });
  }

  function updateTask(id: string, data: TaskDraft) {
    onTasksChange(tasks.map(t => t.id === id ? { ...t, ...data } : t));
  }

  function deleteTask(id: string) {
    if (onDeleteTask) onDeleteTask(id);
    else onTasksChange(tasks.filter(t => t.id !== id));
  }
  function moveTask(id: string, status: Status) { onTasksChange(tasks.map(t => t.id === id ? { ...t, status } : t)); }

  function handleDrop(status: Status) {
    if (draggingId) moveTask(draggingId, status);
    setDraggingId(null);
    setDragOverCol(null);
  }

  const q = query.trim().toLowerCase();
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags))).sort();
  // ชั่วโมงรวมที่ลงให้แต่ละงาน (จากบันทึกรายวัน)
  const hoursByTask = new Map<string, number>();
  for (const e of logEntries) if (e.taskId) hoursByTask.set(e.taskId, (hoursByTask.get(e.taskId) ?? 0) + e.hours);
  const projectById = new Map(availableProjects.map(p => [p.id, p]));
  const categoryById = new Map(availableCategories.map(c => [c.id, c]));
  const filterActive = !!q || priFilter.length > 0 || tagFilter.length > 0;
  const matches = (t: Task) =>
    (!q || t.title.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false) || t.tags.some(tag => tag.toLowerCase().includes(q)))
    && (priFilter.length === 0 || priFilter.includes(t.priority))
    && (tagFilter.length === 0 || t.tags.some(tag => tagFilter.includes(tag)));

  const MENU_WIDTH = 176;
  const menuLeft = menu ? Math.max(8, Math.min(menu.x - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)) : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar: search + filters */}
      <div className="shrink-0 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" style={{ flex: "1 1 220px", maxWidth: 420 }}>
            <Search size={15} className="absolute top-1/2 -translate-y-1/2 left-3" style={{ color: "var(--wt-muted)" }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหางาน, รายละเอียด หรือแท็ก..."
              aria-label="ค้นหางาน"
              className="w-full rounded-xl outline-none transition-colors"
              style={{ ...inputStyle, fontSize: "0.85rem", padding: "0.6rem 2.2rem 0.6rem 2.2rem" }}
              onFocus={focusBorder} onBlur={blurBorder} />
            {query && (
              <button onClick={() => setQuery("")} aria-label="ล้างคำค้นหา"
                className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-lg transition-colors" style={{ color: "var(--wt-muted)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(["high", "medium", "low"] as Priority[]).map(p => {
              const cfg = PRIORITY_CONFIG[p];
              const active = priFilter.includes(p);
              return (
                <button key={p} onClick={() => setPriFilter(f => toggle(f, p))} aria-pressed={active}
                  className="flex items-center gap-1.5 rounded-xl transition-colors"
                  style={{ padding: "0.4rem 0.6rem", background: active ? cfg.bg : "var(--wt-card)", color: active ? cfg.text : "var(--wt-muted)", border: `1px solid ${active ? cfg.dot : "var(--wt-border)"}`, fontSize: "0.76rem", fontWeight: 700 }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} /> {cfg.label}
                </button>
              );
            })}
          </div>
          {filterActive && (
            <button onClick={() => { setQuery(""); setPriFilter([]); setTagFilter([]); }}
              className="rounded-xl transition-colors" style={{ padding: "0.4rem 0.7rem", fontSize: "0.76rem", fontWeight: 700, color: "#7c3aed", background: "var(--wt-soft2)" }}>
              ล้างตัวกรอง
            </button>
          )}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {allTags.map(tag => {
              const active = tagFilter.includes(tag);
              const pal = tagPalette(tag);
              return (
                <button key={tag} onClick={() => setTagFilter(f => toggle(f, tag))} aria-pressed={active}
                  className="rounded-full transition-all"
                  style={{ padding: "0.2rem 0.7rem", background: active ? pal.bg : "var(--wt-card)", color: active ? pal.text : "var(--wt-muted)", border: `1px solid ${active ? pal.text + "55" : "var(--wt-border)"}`, fontSize: "0.72rem", fontWeight: 700 }}>
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-2">
        {STATUSES.map(colId => {
          const col = COLUMN_CONFIG[colId];
          const colTasks = tasks.filter(t => t.status === colId && matches(t));
          const totalInCol = tasks.filter(t => t.status === colId).length;
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
                    {filterActive ? `${colTasks.length}/${totalInCol}` : totalInCol}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 space-y-2" style={{ scrollbarWidth: "none" }}>
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: "var(--wt-muted)" }}>
                      <Sparkles size={26} className="mb-2" style={{ opacity: 0.5 }} />
                      <p style={{ fontSize: "0.8rem", fontWeight: 700 }}>{filterActive ? "ไม่พบงานที่ตรงกับตัวกรอง" : "ยังไม่มีงาน"}</p>
                      <p style={{ fontSize: "0.72rem", opacity: 0.75, marginTop: 2 }}>{filterActive ? "ลองปรับตัวกรอง" : "กดปุ่มด้านล่างเพื่อเพิ่ม"}</p>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task} loggedHours={hoursByTask.get(task.id) ?? 0}
                      project={task.projectId ? projectById.get(task.projectId) : undefined}
                      category={task.categoryId ? categoryById.get(task.categoryId) : undefined}
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
      </div>

      {/* Task actions menu — rendered at root with fixed position so it
          escapes the column's overflow clipping and any card hover-transform. */}
      {menu && (
        <div role="menu" className="rounded-2xl py-1.5"
          style={{
            position: "fixed", top: menu.y + 6, left: menuLeft, width: MENU_WIDTH, zIndex: 60,
            background: "var(--wt-card)", border: "1px solid var(--wt-border)", boxShadow: "0 12px 32px rgba(76,29,149,0.22)",
          }}>
          <button role="menuitem" onClick={() => { setEditing(menu.task); setMenu(null); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors"
            style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--wt-text)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Pencil size={13} /> แก้ไข
          </button>
          <div style={{ borderTop: "1px solid var(--wt-border)", margin: "4px 0" }} />
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

      {addingTo && <TaskModal status={addingTo} availableTags={availableTags} availableProjects={availableProjects} availableCategories={availableCategories} onSubmit={addTask} onClose={() => setAddingTo(null)} />}
      {editing && <TaskModal status={editing.status} initial={editing} availableTags={availableTags} availableProjects={availableProjects} availableCategories={availableCategories} taskLogs={logEntries.filter(e => e.taskId === editing.id)} onUpdateLogHours={onUpdateLogHours} onLogTime={onLogTime} onSubmit={data => updateTask(editing.id, data)} onClose={() => setEditing(null)} />}
    </div>
  );
}
