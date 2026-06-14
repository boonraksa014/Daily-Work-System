"use client";

import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Task, Priority, Status } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { Category, AppSettings, Tag } from "@/types";
import { makeId } from "@/lib/id";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { INITIAL_CATEGORIES, INITIAL_SETTINGS } from "@/data/seed";

export interface BackupData {
  tasks: Task[];
  logEntries: LogEntry[];
  categories: Category[];
  tags: Tag[];
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
  tags: Tag[];
  addTag: (name: string) => void;
  setTagActive: (name: string, active: boolean) => void;
  renameTag: (oldTag: string, newTag: string) => void;
  removeTag: (tag: string) => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportData: () => BackupData;
  importData: (data: BackupData) => void;
  resetData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── รูปแบบที่ backend ส่งกลับ ───────────────────────────────────
interface ApiTask { id: string; title: string; description: string | null; priority: Priority; status: Status; tags: string[] | null; dueDate: string | null; createdAt: string }
interface ApiCategory { id: string; name: string; emoji: string; color: string; isActive: boolean }
interface ApiTag { id: string; name: string; isActive: boolean }
interface ApiLog { id: string; date: string; title: string; note: string | null; hours: number; categoryId: string | null; category: string; done: boolean }
interface ApiProfile { displayName: string; role: string; avatarColor: string; defaultView: string }

// ── mappers: api → app ───────────────────────────────────────────
function taskFromApi(r: ApiTask): Task {
  return { id: r.id, title: r.title, description: r.description ?? undefined, priority: r.priority, status: r.status, tags: r.tags ?? [], createdAt: r.createdAt, dueDate: r.dueDate ?? undefined };
}
function categoryFromApi(r: ApiCategory): Category {
  return { id: r.id, name: r.name, emoji: r.emoji, color: r.color, isActive: r.isActive };
}
function tagFromApi(r: ApiTag): Tag {
  return { id: r.id, name: r.name, isActive: r.isActive };
}
function entryFromApi(r: ApiLog): LogEntry {
  return { id: r.id, date: r.date, title: r.title, note: r.note ?? undefined, hours: r.hours, category: r.category, done: r.done };
}

// ── bodies: app → api (ใช้สร้าง snapshot สำหรับ diff ด้วย) ───────
function taskBody(t: Task): Record<string, unknown> {
  return { id: t.id, title: t.title, description: t.description ?? null, priority: t.priority, status: t.status, tags: t.tags, dueDate: t.dueDate ?? null };
}
function categoryBody(c: Category): Record<string, unknown> {
  return { id: c.id, name: c.name, emoji: c.emoji, color: c.color, isActive: c.isActive };
}
function tagBody(t: Tag): Record<string, unknown> {
  return { id: t.id, name: t.name, isActive: t.isActive };
}
function entryBody(e: LogEntry, catIdByName: Map<string, string>): Record<string, unknown> {
  return { id: e.id, date: e.date, title: e.title, note: e.note ?? null, hours: e.hours, categoryId: catIdByName.get(e.category) ?? null, done: e.done };
}
function profileBody(s: AppSettings): Record<string, unknown> {
  return { displayName: s.displayName, role: s.role, avatarColor: s.avatarColor, defaultView: s.defaultView };
}

/** sync collection ปัจจุบันกับ snapshot ล่าสุด: POST ที่ใหม่ + PATCH ที่เปลี่ยน + DELETE ที่หายไป */
async function syncCollection<T extends { id: string }>(
  token: string | null,
  path: string,
  current: T[],
  snapshot: Map<string, string>,
  toBody: (item: T) => Record<string, unknown>,
) {
  const curIds = new Set(current.map(i => i.id));
  for (const item of current) {
    const body = toBody(item);
    const key = JSON.stringify(body);
    const prev = snapshot.get(item.id);
    if (prev === key) continue;
    try {
      if (prev === undefined) {
        await apiFetch(token, path, { method: "POST", body: key });
      } else {
        await apiFetch(token, `${path}/${item.id}`, { method: "PATCH", body: key });
      }
      snapshot.set(item.id, key);
    } catch (e) {
      console.error("sync error", path, item.id, e);
    }
  }
  for (const id of [...snapshot.keys()]) {
    if (!curIds.has(id)) {
      try {
        await apiFetch(token, `${path}/${id}`, { method: "DELETE" });
        snapshot.delete(id);
      } catch (e) {
        console.error("delete error", path, id, e);
      }
    }
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTagDefs] = useState<Tag[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // snapshots ของสิ่งที่อยู่บน backend ล่าสุด (ไว้ทำ diff)
  const taskSnap = useRef(new Map<string, string>());
  const entrySnap = useRef(new Map<string, string>());
  const catSnap = useRef(new Map<string, string>());
  const tagSnap = useRef(new Map<string, string>());
  const settingsSnap = useRef<string>("");

  // ── load ของ user นี้ ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        const token = await getToken();
        const [profile, tasksRes, logsRes, catsRes, tagsRes] = await Promise.all([
          apiFetch<ApiProfile>(token, "/profile"),
          apiFetch<{ tasks: ApiTask[] }>(token, "/tasks"),
          apiFetch<{ logs: ApiLog[] }>(token, "/logs"),
          apiFetch<{ categories: ApiCategory[] }>(token, "/categories"),
          apiFetch<{ tags: ApiTag[] }>(token, "/tags"),
        ]);
        if (cancelled) return;

        // settings (profile)
        const s: AppSettings = {
          displayName: profile?.displayName || INITIAL_SETTINGS.displayName,
          role: profile?.role ?? "",
          avatarColor: profile?.avatarColor || INITIAL_SETTINGS.avatarColor,
          defaultView: (profile?.defaultView || INITIAL_SETTINGS.defaultView) as AppSettings["defaultView"],
        };
        setSettings(s);
        settingsSnap.current = JSON.stringify(profileBody(s));

        // categories (seed ครั้งแรกถ้ายังไม่มี)
        const serverCats = (catsRes?.categories ?? []).map(categoryFromApi);
        let cats = serverCats;
        if (cats.length === 0) cats = INITIAL_CATEGORIES.map(c => ({ ...c, id: makeId() }));

        const tks = (tasksRes?.tasks ?? []).map(taskFromApi);
        const ents = (logsRes?.logs ?? []).map(entryFromApi);

        // tags master + auto-import แท็กที่ใช้ในงานแต่ยังไม่อยู่ใน master
        const tagDefs: Tag[] = (tagsRes?.tags ?? []).map(tagFromApi);
        const known = new Set(tagDefs.map(t => t.name));
        for (const name of new Set(tks.flatMap(t => t.tags))) {
          if (name && !known.has(name)) {
            tagDefs.push({ id: makeId(), name, isActive: true });
            known.add(name);
          }
        }

        setCategories(cats);
        setTagDefs(tagDefs);
        setTasks(tks);
        setLogEntries(ents);

        // snapshot = สิ่งที่อยู่บน backend แล้วเท่านั้น (cats ที่ seed / tags ที่ import ใหม่ ไม่อยู่ใน snapshot → effect จะ POST ให้)
        const catIdByName = new Map(cats.map(c => [c.name, c.id]));
        catSnap.current = new Map(serverCats.map(c => [c.id, JSON.stringify(categoryBody(c))]));
        tagSnap.current = new Map((tagsRes?.tags ?? []).map(r => [r.id, JSON.stringify(tagBody(tagFromApi(r)))]));
        taskSnap.current = new Map(tks.map(t => [t.id, JSON.stringify(taskBody(t))]));
        entrySnap.current = new Map(ents.map(e => [e.id, JSON.stringify(entryBody(e, catIdByName))]));

        setLoaded(true);
      } catch (e) {
        console.error("load failed", e);
        if (!cancelled) setLoaded(true); // ไม่ให้ค้างหน้าโหลด
      }
    })();
    return () => { cancelled = true; };
  }, [user, getToken]);

  // ── sync ข้อมูลหลัก (debounced) ──
  useEffect(() => {
    if (!user || !loaded) return;
    const t = setTimeout(async () => {
      const token = await getToken();
      // categories ก่อน เพื่อให้ category มีอยู่ก่อน log อ้างถึง (FK)
      await syncCollection(token, "/categories", categories, catSnap.current, categoryBody);
      await syncCollection(token, "/tags", tags, tagSnap.current, tagBody);
      await syncCollection(token, "/tasks", tasks, taskSnap.current, taskBody);
      const catIdByName = new Map(categories.map(c => [c.name, c.id]));
      await syncCollection(token, "/logs", logEntries, entrySnap.current, (e) => entryBody(e, catIdByName));
    }, 600);
    return () => clearTimeout(t);
  }, [tasks, logEntries, categories, tags, loaded, user, getToken]);

  // ── sync profile/settings (debounced) ──
  useEffect(() => {
    if (!user || !loaded) return;
    const body = JSON.stringify(profileBody(settings));
    if (settingsSnap.current === body) return;
    const t = setTimeout(async () => {
      try {
        const token = await getToken();
        await apiFetch(token, "/profile", { method: "PUT", body });
        settingsSnap.current = body;
      } catch (e) {
        console.error("profile sync error", e);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [settings, loaded, user, getToken]);

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

  function addCategory(data: Omit<Category, "id">) { setCategories(prev => [...prev, { ...data, id: makeId() }]); }
  function updateCategory(id: string, data: Omit<Category, "id">) { setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c)); }
  function removeCategory(id: string) {
    const removed = categories.find(c => c.id === id);
    if (!removed) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    notify("ลบหมวดหมู่แล้ว", () => { setToast(null); setCategories(prev => prev.some(c => c.id === id) ? prev : [...prev, removed]); });
  }

  function addTag(name: string) {
    const n = name.trim();
    if (!n) return;
    setTagDefs(prev => prev.some(t => t.name === n) ? prev : [...prev, { id: makeId(), name: n, isActive: true }]);
  }
  function setTagActive(name: string, active: boolean) {
    setTagDefs(prev => prev.map(t => t.name === name ? { ...t, isActive: active } : t));
  }
  function renameTag(oldTag: string, newTag: string) {
    const next = newTag.trim();
    if (!next || next === oldTag) return;
    setTagDefs(prev => prev
      .map(t => t.name === oldTag ? { ...t, name: next } : t)
      .filter((t, i, arr) => arr.findIndex(x => x.name === t.name) === i)); // merge ถ้าชื่อซ้ำ
    setTasks(prev => prev.map(t => t.tags.includes(oldTag) ? { ...t, tags: Array.from(new Set(t.tags.map(tag => tag === oldTag ? next : tag))) } : t));
  }
  function removeTag(tag: string) {
    const def = tags.find(t => t.name === tag);
    const affectedIds = tasks.filter(t => t.tags.includes(tag)).map(t => t.id);
    setTagDefs(prev => prev.filter(t => t.name !== tag));
    setTasks(prev => prev.map(t => t.tags.includes(tag) ? { ...t, tags: t.tags.filter(x => x !== tag) } : t));
    notify("ลบแท็กแล้ว", () => {
      setToast(null);
      if (def) setTagDefs(prev => prev.some(t => t.name === tag) ? prev : [...prev, def]);
      setTasks(prev => prev.map(t => affectedIds.includes(t.id) && !t.tags.includes(tag) ? { ...t, tags: [...t.tags, tag] } : t));
    });
  }

  function updateSettings(patch: Partial<AppSettings>) { setSettings(prev => ({ ...INITIAL_SETTINGS, ...prev, ...patch })); }

  function exportData(): BackupData { return { tasks, logEntries, categories, tags, settings }; }
  function importData(data: BackupData) {
    // gen id ใหม่ทั้งหมด (= import แทนที่ของเดิม) — diff-sync จะลบของเก่าบน server แล้ว POST ของใหม่
    if (Array.isArray(data.categories)) setCategories(data.categories.map(c => ({ ...c, id: makeId() })));
    if (Array.isArray(data.tags)) setTagDefs(data.tags.map(t => ({ ...t, id: makeId() })));
    if (Array.isArray(data.tasks)) setTasks(data.tasks.map(t => ({ ...t, id: makeId() })));
    if (Array.isArray(data.logEntries)) setLogEntries(data.logEntries.map(e => ({ ...e, id: makeId() })));
    if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
  }
  function resetData() {
    setTasks([]);
    setLogEntries([]);
    setCategories(INITIAL_CATEGORIES.map(c => ({ ...c, id: makeId() })));
    setTagDefs([]);
    setSettings(INITIAL_SETTINGS);
  }

  if (!loaded) {
    return <div style={{ height: "100vh", background: "var(--wt-page)" }} aria-hidden />;
  }

  return (
    <DataContext.Provider value={{ tasks, setTasks, logEntries, setLogEntries, removeTask, removeEntry, categories, addCategory, updateCategory, removeCategory, tags, addTag, setTagActive, renameTag, removeTag, settings, updateSettings, exportData, importData, resetData }}>
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
