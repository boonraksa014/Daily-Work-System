"use client";

import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Task, Priority, Status } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { Category, AppSettings } from "@/types";
import { makeId } from "@/lib/id";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { INITIAL_CATEGORIES, INITIAL_SETTINGS } from "@/data/seed";

export interface BackupData {
  tasks: Task[];
  logEntries: LogEntry[];
  categories: Category[];
  settings: AppSettings;
}

interface DataContextValue {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  logEntries: LogEntry[];
  setLogEntries: Dispatch<SetStateAction<LogEntry[]>>;
  removeTask: (id: string) => void;
  removeEntry: (id: string) => void;
  categories: Category[];
  addCategory: (data: Omit<Category, "id">) => void;
  updateCategory: (id: string, data: Omit<Category, "id">) => void;
  removeCategory: (id: string) => void;
  renameTag: (oldTag: string, newTag: string) => void;
  removeTag: (tag: string) => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportData: () => BackupData;
  importData: (data: BackupData) => void;
  resetData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── row ↔ app mappers ───────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToTask(r: any): Task {
  return {
    id: r.id, title: r.title, description: r.description ?? undefined,
    priority: r.priority as Priority, status: r.status as Status,
    tags: r.tags ?? [], createdAt: (r.created_at ?? "").slice(0, 10),
    dueDate: r.due_date ?? undefined,
  };
}
function taskToRow(t: Task, userId: string) {
  return { id: t.id, user_id: userId, title: t.title, description: t.description ?? null, priority: t.priority, status: t.status, tags: t.tags, due_date: t.dueDate ?? null };
}
function rowToCategory(r: any): Category {
  return { id: r.id, name: r.name, emoji: r.emoji, color: r.color };
}
function categoryToRow(c: Category, userId: string, sort: number) {
  return { id: c.id, user_id: userId, name: c.name, emoji: c.emoji, color: c.color, sort_order: sort };
}
function rowToEntry(r: any, catNameById: Map<string, string>): LogEntry {
  return {
    id: r.id, date: r.entry_date, title: r.title, note: r.note ?? undefined,
    hours: Number(r.hours), done: r.done,
    category: r.category_id ? (catNameById.get(r.category_id) ?? "") : "",
  };
}
function entryToRow(e: LogEntry, userId: string, catIdByName: Map<string, string>) {
  return { id: e.id, user_id: userId, entry_date: e.date, title: e.title, note: e.note ?? null, hours: e.hours, category_id: catIdByName.get(e.category) ?? null, done: e.done };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** sync collection ปัจจุบันกับ snapshot ล่าสุด: upsert ที่เปลี่ยน + soft-delete ที่หายไป */
async function syncCollection<T extends { id: string }>(
  table: string, current: T[], snapshot: Map<string, string>, toRow: (item: T) => Record<string, unknown>, userId: string,
) {
  if (!supabase) return;
  const curIds = new Set(current.map(i => i.id));
  const upserts = current.map(toRow).filter((row, idx) => {
    const key = JSON.stringify(row);
    return snapshot.get(current[idx].id) !== key;
  });
  const deletedIds = [...snapshot.keys()].filter(id => !curIds.has(id));
  if (upserts.length) await supabase.from(table).upsert(upserts);
  if (deletedIds.length) await supabase.from(table).update({ deleted_at: new Date().toISOString(), deleted_by_id: userId }).in("id", deletedIds);
  // refresh snapshot
  snapshot.clear();
  for (const item of current) snapshot.set(item.id, JSON.stringify(toRow(item)));
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // snapshots ของสิ่งที่ sync ขึ้น server ล่าสุด (ไว้ทำ diff)
  const taskSnap = useRef(new Map<string, string>());
  const entrySnap = useRef(new Map<string, string>());
  const catSnap = useRef(new Map<string, string>());

  // ── load ของ user นี้ ──
  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const uid = user.id;
      const [profileRes, catRes, taskRes, entryRes] = await Promise.all([
        supabase!.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase!.from("categories").select("*").is("deleted_at", null).eq("user_id", uid).order("sort_order"),
        supabase!.from("tasks").select("*").is("deleted_at", null).eq("user_id", uid).order("sort_order"),
        supabase!.from("log_entries").select("*").is("deleted_at", null).eq("user_id", uid).order("entry_date", { ascending: false }),
      ]);
      if (cancelled) return;

      // settings (profile)
      const p = profileRes.data;
      setSettings({
        displayName: p?.display_name ?? INITIAL_SETTINGS.displayName,
        role: p?.job_title ?? "",
        avatarColor: p?.avatar_color ?? INITIAL_SETTINGS.avatarColor,
        defaultView: (p?.default_view ?? INITIAL_SETTINGS.defaultView) as AppSettings["defaultView"],
      });

      // categories (seed ครั้งแรกถ้ายังไม่มี)
      let cats: Category[] = (catRes.data ?? []).map(rowToCategory);
      if (cats.length === 0) cats = INITIAL_CATEGORIES.map(c => ({ ...c, id: makeId("cat") }));
      const catNameById = new Map(cats.map(c => [c.id, c.name]));
      const tks = (taskRes.data ?? []).map(rowToTask);
      const ents = (entryRes.data ?? []).map((r: unknown) => rowToEntry(r, catNameById));

      setCategories(cats);
      setTasks(tks);
      setLogEntries(ents);

      // ตั้ง snapshot = สิ่งที่อยู่บน server แล้ว (cats ที่ seed ใหม่ถือว่ายังไม่ขึ้น → ให้ effect บันทึก)
      taskSnap.current = new Map(tks.map(t => [t.id, JSON.stringify(taskToRow(t, uid))]));
      entrySnap.current = new Map(ents.map(e => [e.id, JSON.stringify(entryToRow(e, uid, new Map(cats.map(c => [c.name, c.id]))))]));
      catSnap.current = new Map((catRes.data ?? []).map((r: { id: string }, i: number) => [r.id, JSON.stringify(categoryToRow(rowToCategory(r), uid, i))]));

      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── sync (debounced) ──
  useEffect(() => {
    if (!supabase || !user || !loaded) return;
    const uid = user.id;
    const t = setTimeout(() => {
      void syncCollection("categories", categories, catSnap.current, (c) => categoryToRow(c, uid, categories.indexOf(c)), uid);
      void syncCollection("tasks", tasks, taskSnap.current, (t) => taskToRow(t, uid), uid);
      const catIdByName = new Map(categories.map(c => [c.name, c.id]));
      void syncCollection("log_entries", logEntries, entrySnap.current, (e) => entryToRow(e, uid, catIdByName), uid);
    }, 600);
    return () => clearTimeout(t);
  }, [tasks, logEntries, categories, loaded, user]);

  // ── sync profile/settings (debounced) ──
  useEffect(() => {
    if (!supabase || !user || !loaded) return;
    const t = setTimeout(() => {
      void supabase!.from("profiles").upsert({ id: user.id, display_name: settings.displayName, job_title: settings.role, avatar_color: settings.avatarColor, default_view: settings.defaultView });
    }, 600);
    return () => clearTimeout(t);
  }, [settings, loaded, user]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function notify(message: string, onUndo: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, onUndo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  function removeTask(id: string) {
    const removed = tasks.find(t => t.id === id);
    if (!removed) return;
    setTasks(prev => prev.filter(t => t.id !== id));
    notify("ลบงานแล้ว", () => { setToast(null); setTasks(prev => prev.some(t => t.id === id) ? prev : [...prev, removed]); });
  }
  function removeEntry(id: string) {
    const removed = logEntries.find(e => e.id === id);
    if (!removed) return;
    setLogEntries(prev => prev.filter(e => e.id !== id));
    notify("ลบรายการแล้ว", () => { setToast(null); setLogEntries(prev => prev.some(e => e.id === id) ? prev : [...prev, removed]); });
  }

  function addCategory(data: Omit<Category, "id">) { setCategories(prev => [...prev, { ...data, id: makeId("cat") }]); }
  function updateCategory(id: string, data: Omit<Category, "id">) { setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c)); }
  function removeCategory(id: string) {
    const removed = categories.find(c => c.id === id);
    if (!removed) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    notify("ลบหมวดหมู่แล้ว", () => { setToast(null); setCategories(prev => prev.some(c => c.id === id) ? prev : [...prev, removed]); });
  }

  function renameTag(oldTag: string, newTag: string) {
    const next = newTag.trim();
    if (!next || next === oldTag) return;
    setTasks(prev => prev.map(t => t.tags.includes(oldTag) ? { ...t, tags: Array.from(new Set(t.tags.map(tag => tag === oldTag ? next : tag))) } : t));
  }
  function removeTag(tag: string) {
    setTasks(prev => prev.map(t => t.tags.includes(tag) ? { ...t, tags: t.tags.filter(x => x !== tag) } : t));
    notify("ลบแท็กแล้ว", () => setToast(null));
  }

  function updateSettings(patch: Partial<AppSettings>) { setSettings(prev => ({ ...INITIAL_SETTINGS, ...prev, ...patch })); }

  function exportData(): BackupData { return { tasks, logEntries, categories, settings }; }
  function importData(data: BackupData) {
    if (Array.isArray(data.categories)) setCategories(data.categories);
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.logEntries)) setLogEntries(data.logEntries);
    if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
  }
  function resetData() {
    setTasks([]);
    setLogEntries([]);
    setCategories(INITIAL_CATEGORIES.map(c => ({ ...c, id: makeId("cat") })));
    setSettings(INITIAL_SETTINGS);
  }

  if (!loaded) {
    return <div style={{ height: "100vh", background: "var(--wt-page)" }} aria-hidden />;
  }

  return (
    <DataContext.Provider value={{ tasks, setTasks, logEntries, setLogEntries, removeTask, removeEntry, categories, addCategory, updateCategory, removeCategory, renameTag, removeTag, settings, updateSettings, exportData, importData, resetData }}>
      {children}
      {toast && (
        <div role="status" aria-live="polite"
          className="fixed left-1/2 bottom-6 flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ zIndex: 80, transform: "translateX(-50%)", background: "var(--wt-text)", boxShadow: "0 10px 30px rgba(0,0,0,0.28)" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--wt-card)" }}>{toast.message}</span>
          <button onClick={toast.onUndo}
            className="px-2.5 py-1 rounded-lg transition-opacity hover:opacity-90"
            style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff", background: "#7c3aed" }}>
            เลิกทำ
          </button>
        </div>
      )}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData ต้องใช้ภายใน <DataProvider>");
  return ctx;
}
