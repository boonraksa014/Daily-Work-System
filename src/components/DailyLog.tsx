"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, ChevronLeft, ChevronRight, CheckCircle2, Circle, Pencil, Search, X } from "lucide-react";
import { makeId } from "../lib/id";
import type { Category } from "../types";

export interface LogEntry {
  id: string;
  date: string;
  title: string;
  note?: string;
  hours: number;
  category: string;
  done: boolean;
}

/** หา category ตามชื่อ; ถ้าถูกลบไปแล้วคืนค่า fallback กลางๆ */
function findCat(categories: Category[], name: string): Category {
  return categories.find(c => c.name === name) ?? { id: "", name, emoji: "📌", color: "#94a3b8" };
}

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

interface EntryFormProps {
  date: string;
  initial?: LogEntry;
  categories: Category[];
  onSubmit: (entry: Omit<LogEntry, "id">) => void;
  onCancel: () => void;
}

function EntryForm({ date, initial, categories, onSubmit, onCancel }: EntryFormProps) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [hours, setHours] = useState(initial?.hours ?? 1);
  const [category, setCategory] = useState(initial?.category ?? categories[0]?.name ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ date, title: title.trim(), note: note.trim() || undefined, hours, category, done: initial?.done ?? false });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #a78bfa", boxShadow: "0 8px 24px rgba(124,58,237,0.15)" }}>
      <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
        <p style={{ fontSize: "0.82rem", fontWeight: 800, color: "white" }}>{isEdit ? "✏️ แก้ไขรายการ" : "✍️ บันทึกงานใหม่"}</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white p-4 space-y-3">
        <input
          className="w-full px-4 py-3 rounded-xl outline-none transition"
          style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)", fontSize: "0.92rem", color: "var(--wt-text)", fontFamily: "inherit", fontWeight: 600 }}
          onFocus={e => (e.target.style.borderColor = "#a78bfa")}
          onBlur={e => (e.target.style.borderColor = "var(--wt-border)")}
          placeholder="ทำอะไรวันนี้..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <textarea
          className="w-full px-4 py-3 rounded-xl outline-none transition resize-none"
          style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)", fontSize: "0.85rem", color: "var(--wt-text)", fontFamily: "inherit" }}
          onFocus={e => (e.target.style.borderColor = "#a78bfa")}
          onBlur={e => (e.target.style.borderColor = "var(--wt-border)")}
          placeholder="บันทึกเพิ่มเติม (ไม่จำเป็น)..."
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
        />

        {/* Category grid */}
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--wt-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>หมวดหมู่</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => {
              const active = category === c.name;
              return (
                <button key={c.id} type="button" onClick={() => setCategory(c.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition"
                  style={{
                    background: active ? c.color + "22" : "var(--wt-soft2)",
                    color: active ? "var(--wt-text)" : "var(--wt-muted)",
                    border: `2px solid ${active ? c.color : "transparent"}`,
                    fontSize: "0.78rem", fontWeight: 700,
                  }}>
                  <span>{c.emoji}</span>{c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hours */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: "#7c3aed" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--wt-muted)" }}>ชั่วโมงที่ใช้</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHours(h => Math.max(0.5, h - 0.5))}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition"
              style={{ background: "var(--wt-border)", color: "#7c3aed", fontWeight: 800, fontSize: "1rem" }}>−</button>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--wt-text)", minWidth: 40, textAlign: "center" }}>{hours}</span>
            <button type="button" onClick={() => setHours(h => Math.min(12, h + 0.5))}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition"
              style={{ background: "var(--wt-border)", color: "#7c3aed", fontWeight: 800, fontSize: "1rem" }}>+</button>
            <span style={{ fontSize: "0.8rem", color: "var(--wt-muted)" }}>ชม.</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 rounded-xl transition"
            style={{ border: "2px solid var(--wt-border)", color: "var(--wt-muted)", fontSize: "0.88rem", fontWeight: 700, background: "transparent" }}>
            ยกเลิก
          </button>
          <button type="submit" disabled={!title.trim()}
            className="flex-1 py-3 rounded-xl transition-opacity"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.88rem", fontWeight: 800, border: "none", boxShadow: "0 4px 14px rgba(124,58,237,0.3)", opacity: title.trim() ? 1 : 0.5, cursor: title.trim() ? "pointer" : "not-allowed" }}>
            {isEdit ? "บันทึก" : "บันทึกงาน"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface EntryCardProps {
  entry: LogEntry;
  categories: Category[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

function EntryCard({ entry, categories, onToggle, onDelete, onEdit }: EntryCardProps) {
  const cat = findCat(categories, entry.category);

  return (
    <div
      className="group flex gap-3 rounded-2xl p-4 transition-all bg-white"
      style={{
        border: `2px solid ${entry.done ? "#bbf7d0" : "var(--wt-border)"}`,
        opacity: entry.done ? 0.8 : 1,
        boxShadow: "0 2px 8px rgba(124,58,237,0.06)",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(124,58,237,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.06)")}
    >
      {/* Toggle */}
      <button onClick={() => onToggle(entry.id)} aria-label={entry.done ? "ทำเครื่องหมายยังไม่เสร็จ" : "ทำเครื่องหมายเสร็จ"} className="shrink-0 mt-0.5 transition hover:scale-110">
        {entry.done
          ? <CheckCircle2 size={22} style={{ color: "#34d399" }} />
          : <Circle size={22} style={{ color: "#c4b5fd" }} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={entry.done ? "line-through" : ""} style={{ fontSize: "0.9rem", fontWeight: 700, color: entry.done ? "var(--wt-muted)" : "var(--wt-text)" }}>
          {entry.title}
        </p>
        {entry.note && (
          <p className="mt-0.5" style={{ fontSize: "0.78rem", color: "var(--wt-muted)" }}>{entry.note}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: cat.color + "22", color: "var(--wt-text)", fontSize: "0.72rem", fontWeight: 700 }}>
            {cat.emoji} {entry.category}
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "var(--wt-border)", color: "#7c3aed", fontSize: "0.72rem", fontWeight: 700 }}>
            <Clock size={10} /> {entry.hours} ชม.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-start gap-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button onClick={() => onEdit(entry.id)} aria-label="แก้ไขรายการ"
          className="p-2 rounded-xl transition-colors" style={{ color: "var(--wt-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(entry.id)} aria-label="ลบรายการ"
          className="p-2 rounded-xl transition-colors" style={{ color: "#f43f5e" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

interface DailyLogProps {
  entries: LogEntry[];
  categories: Category[];
  onEntriesChange: (entries: LogEntry[]) => void;
  /** ถ้าส่งมา จะใช้แทนการลบตรงๆ (เพื่อให้มี undo) */
  onDeleteEntry?: (id: string) => void;
}

export function DailyLog({ entries, categories, onEntriesChange, onDeleteEntry }: DailyLogProps) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const dayEntries = entries.filter(e => e.date === selectedDate);
  const totalHours = dayEntries.reduce((s, e) => s + e.hours, 0);
  const doneCount = dayEntries.filter(e => e.done).length;
  const completionPct = dayEntries.length > 0 ? Math.round((doneCount / dayEntries.length) * 100) : 0;

  const q = query.trim().toLowerCase();
  const visibleEntries = dayEntries.filter(e => !q || e.title.toLowerCase().includes(q) || (e.note?.toLowerCase().includes(q) ?? false) || e.category.toLowerCase().includes(q));

  const isToday = selectedDate === todayStr();
  const isPast = selectedDate < todayStr();

  function addEntry(data: Omit<LogEntry, "id">) {
    onEntriesChange([...entries, { ...data, id: makeId("log") }]);
    setShowAdd(false);
  }

  function updateEntry(id: string, data: Omit<LogEntry, "id">) {
    onEntriesChange(entries.map(e => e.id === id ? { ...e, ...data } : e));
    setEditingId(null);
  }

  function toggleEntry(id: string) { onEntriesChange(entries.map(e => e.id === id ? { ...e, done: !e.done } : e)); }
  function deleteEntry(id: string) {
    if (onDeleteEntry) onDeleteEntry(id);
    else onEntriesChange(entries.filter(e => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Date nav */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 4px 16px rgba(124,58,237,0.1)" }}>
        {/* Header gradient */}
        <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedDate(offsetDate(selectedDate, -1))} aria-label="วันก่อนหน้า"
                className="p-2 rounded-xl transition hover:bg-white/20" style={{ color: "white" }}>
                <ChevronLeft size={18} />
              </button>
              <div>
                <p style={{ fontSize: "1rem", fontWeight: 800, color: "white" }}>
                  {isToday ? "📅 วันนี้" : (isPast ? "📂 " : "📅 ") + weekdayThai(selectedDate)}
                </p>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)" }}>{formatDateThai(selectedDate)}</p>
              </div>
              <button onClick={() => setSelectedDate(offsetDate(selectedDate, 1))} aria-label="วันถัดไป"
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
                aria-label="เลือกวันที่"
                className="px-3 py-1.5 rounded-xl outline-none"
                style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: "0.78rem", border: "1px solid rgba(255,255,255,0.3)", colorScheme: "dark" }}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x" style={{ borderTop: "1px solid var(--wt-border)" }}>
          {[
            { label: "รายการทั้งหมด", value: dayEntries.length, emoji: "📋", color: "#7c3aed" },
            { label: "เสร็จแล้ว",    value: doneCount,          emoji: "✅", color: "#34d399" },
            { label: "ชั่วโมงงาน",   value: totalHours,         emoji: "⏱️", color: "#fb923c" },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4 px-3">
              <span style={{ fontSize: "1.3rem" }}>{s.emoji}</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--wt-muted)", fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {dayEntries.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--wt-muted)" }}>ความคืบหน้า</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#7c3aed" }}>{completionPct}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--wt-border)" }}>
              <div className="h-full w-full rounded-full transition-transform duration-500"
                style={{ transform: `scaleX(${completionPct / 100})`, transformOrigin: "left", background: "linear-gradient(90deg, #7c3aed, #34d399)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Search (only when the day has entries) */}
      {dayEntries.length > 0 && (
        <div className="relative shrink-0">
          <Search size={15} className="absolute top-1/2 -translate-y-1/2 left-3" style={{ color: "var(--wt-muted)" }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหารายการในวันนี้..."
            aria-label="ค้นหารายการ"
            className="w-full rounded-xl outline-none transition-colors"
            style={{ border: "2px solid var(--wt-border)", background: "var(--wt-soft)", color: "var(--wt-text)", fontFamily: "inherit", fontSize: "0.85rem", padding: "0.6rem 2.2rem" }}
            onFocus={e => (e.target.style.borderColor = "#a78bfa")}
            onBlur={e => (e.target.style.borderColor = "var(--wt-border)")} />
          {query && (
            <button onClick={() => setQuery("")} aria-label="ล้างคำค้นหา"
              className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-lg transition-colors" style={{ color: "var(--wt-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--wt-soft2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Entries */}
      <div className="flex-1 overflow-y-auto space-y-2.5" style={{ scrollbarWidth: "none" }}>
        {dayEntries.length === 0 && !showAdd && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--wt-muted)" }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--wt-border)" }}>
              <Pencil size={32} style={{ color: "#a78bfa" }} />
            </div>
            <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--wt-text)" }}>ยังไม่มีรายการงาน</p>
            <p style={{ fontSize: "0.82rem", color: "var(--wt-muted)", marginTop: 4 }}>เริ่มบันทึกงานที่ทำวันนี้กันเลย!</p>
          </div>
        )}
        {dayEntries.length > 0 && visibleEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--wt-muted)" }}>
            <Search size={28} style={{ opacity: 0.5 }} />
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--wt-text)", marginTop: 8 }}>ไม่พบรายการที่ค้นหา</p>
            <p style={{ fontSize: "0.78rem", marginTop: 2 }}>ลองคำอื่นดู</p>
          </div>
        )}
        {visibleEntries.map(entry => (
          editingId === entry.id ? (
            <EntryForm key={entry.id} date={entry.date} initial={entry} categories={categories}
              onSubmit={data => updateEntry(entry.id, data)} onCancel={() => setEditingId(null)} />
          ) : (
            <EntryCard key={entry.id} entry={entry} categories={categories} onToggle={toggleEntry} onDelete={deleteEntry} onEdit={setEditingId} />
          )
        ))}
        {showAdd && (
          <EntryForm onSubmit={addEntry} onCancel={() => setShowAdd(false)} date={selectedDate} categories={categories} />
        )}
      </div>

      {/* Add button */}
      {!showAdd && (
        <button onClick={() => { setShowAdd(true); setEditingId(null); }}
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
