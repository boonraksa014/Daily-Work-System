import { useState } from "react";
import { Plus, Trash2, Clock, Calendar, ChevronLeft, ChevronRight, CheckCircle2, Circle, Pencil } from "lucide-react";
import { makeId } from "../lib/id";

export interface LogEntry {
  id: string;
  date: string;
  title: string;
  note?: string;
  hours: number;
  category: string;
  done: boolean;
}

const CATEGORIES = ["พัฒนาระบบ", "ประชุม", "วางแผน", "ทดสอบ", "เอกสาร", "สนับสนุน", "อื่นๆ"];

const CAT_CONFIG: Record<string, { bg: string; text: string; emoji: string }> = {
  "พัฒนาระบบ": { bg: "#ede9fe", text: "#5b21b6", emoji: "💻" },
  "ประชุม":    { bg: "#e0f2fe", text: "#075985", emoji: "🤝" },
  "วางแผน":   { bg: "#fce7f3", text: "#9d174d", emoji: "📐" },
  "ทดสอบ":    { bg: "#fef3c7", text: "#92400e", emoji: "🧪" },
  "เอกสาร":   { bg: "#d1fae5", text: "#065f46", emoji: "📄" },
  "สนับสนุน":  { bg: "#e0f2fe", text: "#0369a1", emoji: "🛠️" },
  "อื่นๆ":    { bg: "#f3f4f6", text: "#374151", emoji: "📌" },
};

function todayStr() { return new Date().toISOString().split("T")[0]; }

function offsetDate(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDateThai(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function weekdayThai(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("th-TH", { weekday: "long" });
}

interface InlineAddFormProps {
  onAdd: (entry: Omit<LogEntry, "id">) => void;
  onCancel: () => void;
  date: string;
}

function InlineAddForm({ onAdd, onCancel, date }: InlineAddFormProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(1);
  const [category, setCategory] = useState(CATEGORIES[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ date, title: title.trim(), note: note.trim() || undefined, hours, category, done: false });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #a78bfa", boxShadow: "0 8px 24px rgba(124,58,237,0.15)" }}>
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 800, color: "white" }}>✍️ บันทึกงานใหม่</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white p-4 space-y-3">
        <input
          className="w-full px-4 py-3 rounded-xl outline-none transition"
          style={{ border: "2px solid #ede9fe", background: "#faf8ff", fontSize: "0.92rem", color: "#2d1f6e", fontFamily: "inherit", fontWeight: 600 }}
          onFocus={e => (e.target.style.borderColor = "#a78bfa")}
          onBlur={e => (e.target.style.borderColor = "#ede9fe")}
          placeholder="ทำอะไรวันนี้..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <textarea
          className="w-full px-4 py-3 rounded-xl outline-none transition resize-none"
          style={{ border: "2px solid #ede9fe", background: "#faf8ff", fontSize: "0.85rem", color: "#2d1f6e", fontFamily: "inherit" }}
          onFocus={e => (e.target.style.borderColor = "#a78bfa")}
          onBlur={e => (e.target.style.borderColor = "#ede9fe")}
          placeholder="บันทึกเพิ่มเติม (ไม่จำเป็น)..."
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
        />

        {/* Category grid */}
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c6a9e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>หมวดหมู่</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => {
              const cfg = CAT_CONFIG[c];
              const active = category === c;
              return (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition"
                  style={{
                    background: active ? cfg.bg : "#f5f3ff",
                    color: active ? cfg.text : "#7c6a9e",
                    border: `2px solid ${active ? cfg.text + "40" : "transparent"}`,
                    fontSize: "0.78rem", fontWeight: 700,
                  }}>
                  <span>{cfg.emoji}</span>{c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hours */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: "#7c3aed" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#7c6a9e" }}>ชั่วโมงที่ใช้</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHours(h => Math.max(0.5, h - 0.5))}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition"
              style={{ background: "#ede9fe", color: "#7c3aed", fontWeight: 800, fontSize: "1rem" }}>−</button>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#2d1f6e", minWidth: 40, textAlign: "center" }}>{hours}</span>
            <button type="button" onClick={() => setHours(h => Math.min(12, h + 0.5))}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition"
              style={{ background: "#ede9fe", color: "#7c3aed", fontWeight: 800, fontSize: "1rem" }}>+</button>
            <span style={{ fontSize: "0.8rem", color: "#7c6a9e" }}>ชม.</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 rounded-xl transition"
            style={{ border: "2px solid #ede9fe", color: "#7c6a9e", fontSize: "0.88rem", fontWeight: 700, background: "transparent" }}>
            ยกเลิก
          </button>
          <button type="submit"
            className="flex-1 py-3 rounded-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.88rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
            ✨ บันทึกงาน
          </button>
        </div>
      </form>
    </div>
  );
}

interface EntryCardProps {
  entry: LogEntry;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function EntryCard({ entry, onToggle, onDelete }: EntryCardProps) {
  const cat = CAT_CONFIG[entry.category] ?? CAT_CONFIG["อื่นๆ"];

  return (
    <div
      className="group flex gap-3 rounded-2xl p-4 transition-all bg-white"
      style={{
        border: `2px solid ${entry.done ? "#bbf7d0" : "#ede9fe"}`,
        opacity: entry.done ? 0.8 : 1,
        boxShadow: "0 2px 8px rgba(124,58,237,0.06)",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(124,58,237,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.06)")}
    >
      {/* Toggle */}
      <button onClick={() => onToggle(entry.id)} className="shrink-0 mt-0.5 transition hover:scale-110">
        {entry.done
          ? <CheckCircle2 size={22} style={{ color: "#34d399" }} />
          : <Circle size={22} style={{ color: "#c4b5fd" }} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={entry.done ? "line-through" : ""} style={{ fontSize: "0.9rem", fontWeight: 700, color: entry.done ? "#7c6a9e" : "#2d1f6e" }}>
          {entry.title}
        </p>
        {entry.note && (
          <p className="mt-0.5" style={{ fontSize: "0.78rem", color: "#7c6a9e" }}>{entry.note}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: cat.bg, color: cat.text, fontSize: "0.72rem", fontWeight: 700 }}>
            {cat.emoji} {entry.category}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "#ede9fe", color: "#7c3aed", fontSize: "0.72rem", fontWeight: 700 }}>
            <Clock size={10} /> {entry.hours} ชม.
          </span>
        </div>
      </div>

      {/* Delete */}
      <button onClick={() => onDelete(entry.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 p-2 rounded-xl transition"
        style={{ color: "#f43f5e" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#fff1f2")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

interface DailyLogProps {
  entries: LogEntry[];
  onEntriesChange: (entries: LogEntry[]) => void;
}

export function DailyLog({ entries, onEntriesChange }: DailyLogProps) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showAdd, setShowAdd] = useState(false);

  const dayEntries = entries.filter(e => e.date === selectedDate);
  const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0);
  const doneCount = dayEntries.filter(e => e.done).length;
  const completionPct = dayEntries.length > 0 ? Math.round((doneCount / dayEntries.length) * 100) : 0;

  const isToday = selectedDate === todayStr();
  const isPast = selectedDate < todayStr();

  function addEntry(data: Omit<LogEntry, "id">) {
    onEntriesChange([...entries, { ...data, id: makeId("log") }]);
    setShowAdd(false);
  }

  function toggleEntry(id: string) { onEntriesChange(entries.map(e => e.id === id ? { ...e, done: !e.done } : e)); }
  function deleteEntry(id: string) { onEntriesChange(entries.filter(e => e.id !== id)); }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Date nav */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "2px solid #ede9fe", boxShadow: "0 4px 16px rgba(124,58,237,0.1)" }}>
        {/* Header gradient */}
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedDate(offsetDate(selectedDate, -1))}
                className="p-2 rounded-xl transition hover:bg-white/20" style={{ color: "white" }}>
                <ChevronLeft size={18} />
              </button>
              <div>
                <p style={{ fontSize: "1rem", fontWeight: 800, color: "white" }}>
                  {isToday ? "📅 วันนี้" : (isPast ? "📂 " : "📅 ") + weekdayThai(selectedDate)}
                </p>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)" }}>{formatDateThai(selectedDate)}</p>
              </div>
              <button onClick={() => setSelectedDate(offsetDate(selectedDate, 1))}
                className="p-2 rounded-xl transition hover:bg-white/20" style={{ color: "white" }}>
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {!isToday && (
                <button onClick={() => setSelectedDate(todayStr())}
                  className="px-3 py-1.5 rounded-xl transition"
                  style={{ background: "rgba(255,255,255,0.25)", color: "white", fontSize: "0.78rem", fontWeight: 700, border: "1px solid rgba(255,255,255,0.3)" }}>
                  วันนี้
                </button>
              )}
              <input
                type="date"
                className="px-3 py-1.5 rounded-xl outline-none"
                style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.3)", colorScheme: "dark" }}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x" style={{ borderTop: "1px solid #ede9fe" }}>
          {[
            { label: "รายการทั้งหมด", value: dayEntries.length, emoji: "📋", color: "#7c3aed" },
            { label: "เสร็จแล้ว",    value: doneCount,          emoji: "✅", color: "#34d399" },
            { label: "ชั่วโมงงาน",   value: totalHours,         emoji: "⏱️", color: "#fb923c" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 px-3">
              <span style={{ fontSize: "1.3rem" }}>{s.emoji}</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: "0.7rem", color: "#7c6a9e", fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {dayEntries.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c6a9e" }}>ความคืบหน้า</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#7c3aed" }}>{completionPct}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#ede9fe" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%`, background: "linear-gradient(90deg, #7c3aed, #34d399)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto space-y-2.5" style={{ scrollbarWidth: "none" }}>
        {dayEntries.length === 0 && !showAdd && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "#7c6a9e" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#ede9fe" }}>
              <Pencil size={32} style={{ color: "#a78bfa" }} />
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 800, color: "#2d1f6e" }}>ยังไม่มีรายการงาน</p>
            <p style={{ fontSize: "0.82rem", color: "#7c6a9e", marginTop: 4 }}>เริ่มบันทึกงานที่ทำวันนี้กันเลย!</p>
          </div>
        )}
        {dayEntries.map(entry => (
          <EntryCard key={entry.id} entry={entry} onToggle={toggleEntry} onDelete={deleteEntry} />
        ))}
        {showAdd && (
          <InlineAddForm onAdd={addEntry} onCancel={() => setShowAdd(false)} date={selectedDate} />
        )}
      </div>

      {/* Add button */}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl transition-all"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            color: "white", fontSize: "0.92rem", fontWeight: 800, border: "none",
            boxShadow: "0 6px 20px rgba(124,58,237,0.35)",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 10px 28px rgba(124,58,237,0.45)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(124,58,237,0.35)")}>
          <Plus size={18} /> เพิ่มรายการงาน
        </button>
      )}
    </div>
  );
}
