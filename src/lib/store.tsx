"use client";

import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Task } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { Category, AppSettings } from "@/types";
import { makeId } from "@/lib/id";
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
  /** ลบงานพร้อม toast ให้กดเลิกทำได้ */
  removeTask: (id: string) => void;
  /** ลบรายการบันทึกพร้อม toast ให้กดเลิกทำได้ */
  removeEntry: (id: string) => void;
  categories: Category[];
  addCategory: (data: Omit<Category, "id">) => void;
  updateCategory: (id: string, data: Omit<Category, "id">) => void;
  removeCategory: (id: string) => void;
  /** เปลี่ยนชื่อแท็กในทุกงาน */
  renameTag: (oldTag: string, newTag: string) => void;
  /** ลบแท็กออกจากทุกงาน */
  removeTag: (tag: string) => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportData: () => BackupData;
  importData: (data: BackupData) => void;
  resetData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * แหล่งข้อมูลกลาง (tasks + logs) เก็บใน localStorage และแชร์ทุกหน้า.
 * รอจน mount ก่อนค่อย render เนื้อหา เพื่อกัน hydration mismatch.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>("worktrack.tasks", INITIAL_TASKS);
  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>("worktrack.logs", INITIAL_LOGS);
  const [categories, setCategories] = useLocalStorage<Category[]>("worktrack.categories", INITIAL_CATEGORIES);
  const [settingsRaw, setSettings] = useLocalStorage<AppSettings>("worktrack.settings", INITIAL_SETTINGS);
  const settings = { ...INITIAL_SETTINGS, ...settingsRaw }; // backfill fields added later
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);
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

  function addCategory(data: Omit<Category, "id">) {
    setCategories(prev => [...prev, { ...data, id: makeId("cat") }]);
  }
  function updateCategory(id: string, data: Omit<Category, "id">) {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }
  function removeCategory(id: string) {
    const removed = categories.find(c => c.id === id);
    if (!removed) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    notify("ลบหมวดหมู่แล้ว", () => { setToast(null); setCategories(prev => prev.some(c => c.id === id) ? prev : [...prev, removed]); });
  }

  function renameTag(oldTag: string, newTag: string) {
    const next = newTag.trim();
    if (!next || next === oldTag) return;
    setTasks(prev => prev.map(t => t.tags.includes(oldTag)
      ? { ...t, tags: Array.from(new Set(t.tags.map(tag => tag === oldTag ? next : tag))) }
      : t));
  }
  function removeTag(tag: string) {
    setTasks(prev => prev.map(t => t.tags.includes(tag) ? { ...t, tags: t.tags.filter(x => x !== tag) } : t));
    notify("ลบแท็กแล้ว", () => setToast(null));
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => ({ ...INITIAL_SETTINGS, ...prev, ...patch }));
  }

  function exportData(): BackupData {
    return { tasks, logEntries, categories, settings };
  }
  function importData(data: BackupData) {
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.logEntries)) setLogEntries(data.logEntries);
    if (Array.isArray(data.categories)) setCategories(data.categories);
    if (data.settings) setSettings(data.settings);
  }
  function resetData() {
    setTasks(INITIAL_TASKS);
    setLogEntries(INITIAL_LOGS);
    setCategories(INITIAL_CATEGORIES);
    setSettings(INITIAL_SETTINGS);
  }

  if (!mounted) {
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
