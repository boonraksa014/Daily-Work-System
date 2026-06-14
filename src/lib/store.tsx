"use client";

import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Task } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { Category, AppSettings } from "@/types";
import { makeId } from "@/lib/id";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { INITIAL_TASKS, INITIAL_LOGS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from "@/data/seed";

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

/** อ่านข้อมูลเดิมจาก localStorage (ของเวอร์ชัน single-user) เพื่อย้ายขึ้น cloud ครั้งแรก */
function readLegacyLocal(): Partial<BackupData> {
  if (typeof window === "undefined") return {};
  const get = <T,>(key: string): T | undefined => {
    try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : undefined; } catch { return undefined; }
  };
  return {
    tasks: get<Task[]>("worktrack.tasks"),
    logEntries: get<LogEntry[]>("worktrack.logs"),
    categories: get<Category[]>("worktrack.categories"),
    settings: get<AppSettings>("worktrack.settings"),
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(INITIAL_LOGS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load this user's blob from Supabase (or migrate legacy localStorage on first login)
  useEffect(() => {
    if (!supabase || !user) return;
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const { data } = await supabase!.from("user_data").select("data").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      const blob = data?.data as Partial<BackupData> | undefined;
      if (blob) {
        setTasks(blob.tasks ?? []);
        setLogEntries(blob.logEntries ?? []);
        setCategories(blob.categories ?? INITIAL_CATEGORIES);
        setSettings({ ...INITIAL_SETTINGS, ...(blob.settings ?? {}) });
      } else {
        const legacy = readLegacyLocal();
        setTasks(legacy.tasks ?? []);
        setLogEntries(legacy.logEntries ?? []);
        setCategories(legacy.categories ?? INITIAL_CATEGORIES);
        setSettings({ ...INITIAL_SETTINGS, ...(legacy.settings ?? {}) });
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Persist (debounced) whenever data changes after load
  useEffect(() => {
    if (!supabase || !user || !loaded) return;
    const t = setTimeout(() => {
      void supabase!.from("user_data").upsert(
        { user_id: user.id, data: { tasks, logEntries, categories, settings }, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    }, 600);
    return () => clearTimeout(t);
  }, [tasks, logEntries, categories, settings, loaded, user]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function notify(message: string, onUndo: () => void) {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, onUndo });
    timer.current = setTimeout(() => setToast(null), 5000);
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
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.logEntries)) setLogEntries(data.logEntries);
    if (Array.isArray(data.categories)) setCategories(data.categories);
    if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
  }
  function resetData() {
    setTasks([]);
    setLogEntries([]);
    setCategories(INITIAL_CATEGORIES);
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
