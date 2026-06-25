"use client";

// ─────────────────────────────────────────────────────────────────────────
// store.tsx — "ตัวกลางข้อมูล" ของทั้งแอป (ฝั่ง frontend)
//
// ทำหน้าที่: โหลดข้อมูลของผู้ใช้จาก backend ตอนล็อกอิน, เก็บไว้ใน memory,
//           แล้วซิงก์กลับขึ้น backend อัตโนมัติเมื่อมีการแก้ (เพิ่ม/แก้/ลบ)
//
// ทุกหน้าจอเรียกใช้ผ่าน `useData()` เพื่อดึงข้อมูล + ฟังก์ชันแก้ข้อมูล
//
// อยากแก้ตรงไหน:
//  • แปลงข้อมูล backend↔แอป (เพิ่มฟิลด์) → ดูฟังก์ชัน xxxFromApi / xxxBody ด้านล่าง
//  • ตัวบอกสถานะ "กำลังบันทึก/บันทึกแล้ว/ไม่สำเร็จ" → ดู SyncIndicator
//  • หน้าโหลด / หน้า error ตอนต่อ backend ไม่ได้ → ดูส่วนท้ายของ DataProvider
// ─────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { Task, Priority, Status } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { Category, AppSettings, Tag, Project } from "@/types";
import { makeId } from "@/lib/id";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { INITIAL_CATEGORIES, INITIAL_SETTINGS } from "@/data/seed";
import { makeSampleData } from "@/data/sample";

export interface BackupData {
  tasks: Task[];
  logEntries: LogEntry[];
  categories: Category[];
  tags: Tag[];
  projects: Project[];
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
  projects: Project[];
  addProject: (data: Omit<Project, "id">) => void;
  updateProject: (id: string, data: Omit<Project, "id">) => void;
  removeProject: (id: string) => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportData: () => BackupData;
  importData: (data: BackupData) => void;
  resetData: () => void;
  addSampleData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── รูปแบบที่ backend ส่งกลับ ───────────────────────────────────
interface ApiTask { id: string; title: string; description: string | null; priority: Priority; status: Status; tags: string[] | null; dueDate: string | null; projectId: string | null; categoryId: string | null; createdAt: string }
interface ApiCategory { id: string; name: string; emoji: string; color: string; isActive: boolean }
interface ApiTag { id: string; name: string; isActive: boolean }
interface ApiProject { id: string; name: string; color: string; isActive: boolean }
interface ApiLog { id: string; date: string; title: string; note: string | null; hours: number; categoryId: string | null; category: string; taskId: string | null; projectId: string | null; done: boolean }
interface ApiProfile { displayName: string; role: string; avatarColor: string; defaultView: string }

// ── mappers: api → app ───────────────────────────────────────────
function taskFromApi(r: ApiTask): Task {
  return { id: r.id, title: r.title, description: r.description ?? undefined, priority: r.priority, status: r.status, tags: r.tags ?? [], createdAt: r.createdAt, dueDate: r.dueDate ?? undefined, projectId: r.projectId ?? undefined, categoryId: r.categoryId ?? undefined };
}
function categoryFromApi(r: ApiCategory): Category {
  return { id: r.id, name: r.name, emoji: r.emoji, color: r.color, isActive: r.isActive };
}
function tagFromApi(r: ApiTag): Tag {
  return { id: r.id, name: r.name, isActive: r.isActive };
}
function projectFromApi(r: ApiProject): Project {
  return { id: r.id, name: r.name, color: r.color, isActive: r.isActive };
}
function entryFromApi(r: ApiLog): LogEntry {
  return { id: r.id, date: r.date, title: r.title, note: r.note ?? undefined, hours: r.hours, category: r.category, taskId: r.taskId ?? undefined, projectId: r.projectId ?? undefined, done: r.done };
}

// ── bodies: app → api (ใช้สร้าง snapshot สำหรับ diff ด้วย) ───────
function taskBody(t: Task): Record<string, unknown> {
  return { id: t.id, title: t.title, description: t.description ?? null, priority: t.priority, status: t.status, tags: t.tags, dueDate: t.dueDate ?? null, projectId: t.projectId ?? null, categoryId: t.categoryId ?? null };
}
function categoryBody(c: Category): Record<string, unknown> {
  return { id: c.id, name: c.name, emoji: c.emoji, color: c.color, isActive: c.isActive };
}
function tagBody(t: Tag): Record<string, unknown> {
  return { id: t.id, name: t.name, isActive: t.isActive };
}
function projectBody(p: Project): Record<string, unknown> {
  return { id: p.id, name: p.name, color: p.color, isActive: p.isActive };
}
function entryBody(e: LogEntry, catIdByName: Map<string, string>): Record<string, unknown> {
  return { id: e.id, date: e.date, title: e.title, note: e.note ?? null, hours: e.hours, categoryId: catIdByName.get(e.category) ?? null, taskId: e.taskId ?? null, projectId: e.projectId ?? null, done: e.done };
}
function profileBody(s: AppSettings): Record<string, unknown> {
  return { displayName: s.displayName, role: s.role, avatarColor: s.avatarColor, defaultView: s.defaultView };
}

/** sync collection ปัจจุบันกับ snapshot ล่าสุด: POST ที่ใหม่ + PATCH ที่เปลี่ยน + DELETE ที่หายไป
 *  คืน true ถ้าสำเร็จทั้งหมด, false ถ้ามีบางรายการล้มเหลว (item ที่ล้มเหลวจะไม่อัปเดต snapshot → ลองใหม่รอบหน้า) */
async function syncCollection<T extends { id: string }>(
  token: string | null,
  path: string,
  current: T[],
  snapshot: Map<string, string>,
  toBody: (item: T) => Record<string, unknown>,
): Promise<boolean> {
  let ok = true;
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
      ok = false;
    }
  }
  for (const id of [...snapshot.keys()]) {
    if (!curIds.has(id)) {
      try {
        await apiFetch(token, `${path}/${id}`, { method: "DELETE" });
        snapshot.delete(id);
      } catch (e) {
        console.error("delete error", path, id, e);
        ok = false;
      }
    }
  }
  return ok;
}

/** หน้าโหลด — ถ้าโหลดนานเกิน 8 วิ (เช่น backend กำลังตื่นจาก cold start) จะขึ้นข้อความอธิบายให้รอ */
function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 text-center" role="status" aria-label="กำลังโหลด"
      style={{ height: "100vh", background: "var(--wt-page)", fontFamily: "Nunito, 'Nunito Sans', system-ui, sans-serif" }}>
      <Logo iconSize={44} />
      <div className="flex items-center gap-2.5">
        <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid var(--wt-border)", borderTopColor: "#7c3aed", display: "inline-block", animation: "wt-spin 0.7s linear infinite" }} />
        <span style={{ fontSize: "0.85rem", color: "var(--wt-muted)", fontWeight: 600 }}>กำลังโหลดข้อมูล…</span>
      </div>
      {slow && (
        <p style={{ fontSize: "0.8rem", color: "var(--wt-muted)", maxWidth: 320, lineHeight: 1.6 }}>
          ⏳ เซิร์ฟเวอร์กำลังตื่นจากโหมดประหยัดพลังงาน อาจใช้เวลาสักครู่ (~1 นาที) ในการเปิดครั้งแรก — รออีกนิดนะครับ
        </p>
      )}
    </div>
  );
}

// ── buffer ใน localStorage: กันข้อมูลที่ยังไม่ซิงก์หายเมื่อรีเฟรช/ปิดแท็บ ──
const BUFFER_PREFIX = "taskflow:buffer:";

interface LocalBuffer {
  userId: string;
  dirty: boolean; // ยังมีอะไรที่ยังไม่ขึ้น backend ไหม
  tasks: Task[];
  logEntries: LogEntry[];
  categories: Category[];
  tags: Tag[];
  projects: Project[];
  settings: AppSettings;
}

function readBuffer(userId: string): LocalBuffer | null {
  try {
    const raw = localStorage.getItem(BUFFER_PREFIX + userId);
    if (!raw) return null;
    const b = JSON.parse(raw) as LocalBuffer;
    return b && b.userId === userId ? b : null;
  } catch {
    return null;
  }
}

function writeBuffer(b: LocalBuffer) {
  try {
    localStorage.setItem(BUFFER_PREFIX + b.userId, JSON.stringify(b));
  } catch {
    /* quota เต็มหรือ localStorage ถูกปิด — ข้ามไป (ยังมี retry บน backend อยู่แล้ว) */
  }
}

/** collection ปัจจุบันต่างจาก snapshot บน backend ไหม (= ยังไม่ซิงก์) */
function isCollectionDirty<T extends { id: string }>(items: T[], snap: Map<string, string>, toBody: (i: T) => Record<string, unknown>): boolean {
  if (items.length !== snap.size) return true;
  for (const it of items) {
    if (snap.get(it.id) !== JSON.stringify(toBody(it))) return true;
  }
  return false;
}

type SyncState = "idle" | "saving" | "saved" | "error";

/** แถบสถานะการบันทึกขึ้น backend (มุมขวาล่าง) */
function SyncIndicator({ state }: { state: SyncState }) {
  if (state === "idle") return null;
  const cfg = {
    saving: { text: "กำลังบันทึก…", bg: "var(--wt-text)", color: "var(--wt-card)", dot: "#a855f7" },
    saved: { text: "บันทึกแล้ว", bg: "var(--wt-text)", color: "var(--wt-card)", dot: "#34d399" },
    error: { text: "บันทึกไม่สำเร็จ — กำลังลองใหม่", bg: "#9f1239", color: "#fff", dot: "#fda4af" },
  }[state];
  return (
    <div role="status" aria-live="polite"
      className="fixed right-4 bottom-4 flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ zIndex: 70, background: cfg.bg, boxShadow: "0 8px 24px rgba(0,0,0,0.22)" }}>
      <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: cfg.dot, animation: state === "saving" ? "wt-pulse 1s ease-in-out infinite" : "none" }} />
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: cfg.color }}>{cfg.text}</span>
    </div>
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTagDefs] = useState<Tag[]>([]);
  const [projects, setProjectDefs] = useState<Project[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [retryNonce, setRetryNonce] = useState(0);
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // snapshots ของสิ่งที่อยู่บน backend ล่าสุด (ไว้ทำ diff)
  const taskSnap = useRef(new Map<string, string>());
  const entrySnap = useRef(new Map<string, string>());
  const catSnap = useRef(new Map<string, string>());
  const tagSnap = useRef(new Map<string, string>());
  const projectSnap = useRef(new Map<string, string>());
  const settingsSnap = useRef<string>("");
  const dirtyRef = useRef(false); // ยังมีข้อมูลที่ยังไม่ซิงก์ไหม (ใช้กับ beforeunload)

  // อัปเดตสถานะการบันทึก + ตั้งลองใหม่อัตโนมัติเมื่อล้มเหลว
  function finishSync(ok: boolean) {
    setSyncState(ok ? "saved" : "error");
    if (savedTimer.current) clearTimeout(savedTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (ok) {
      savedTimer.current = setTimeout(() => setSyncState("idle"), 1500);
    } else {
      retryTimer.current = setTimeout(() => setRetryNonce(n => n + 1), 4000); // ลองใหม่ใน 4 วิ
    }
  }

  // ── load ของ user นี้ ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoaded(false);
    setLoadError(false);
    (async () => {
      try {
        const token = await getToken();
        const [profile, tasksRes, logsRes, catsRes, tagsRes, projsRes] = await Promise.all([
          apiFetch<ApiProfile>(token, "/profile"),
          apiFetch<{ tasks: ApiTask[] }>(token, "/tasks"),
          apiFetch<{ logs: ApiLog[] }>(token, "/logs"),
          apiFetch<{ categories: ApiCategory[] }>(token, "/categories"),
          apiFetch<{ tags: ApiTag[] }>(token, "/tags"),
          apiFetch<{ projects: ApiProject[] }>(token, "/projects"),
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

        const projDefs: Project[] = (projsRes?.projects ?? []).map(projectFromApi);

        // snapshot = สิ่งที่อยู่บน backend แล้วเท่านั้น (cats ที่ seed / tags ที่ import ใหม่ ไม่อยู่ใน snapshot → effect จะ POST ให้)
        const catIdByName = new Map(cats.map(c => [c.name, c.id]));
        catSnap.current = new Map(serverCats.map(c => [c.id, JSON.stringify(categoryBody(c))]));
        tagSnap.current = new Map((tagsRes?.tags ?? []).map(r => [r.id, JSON.stringify(tagBody(tagFromApi(r)))]));
        projectSnap.current = new Map(projDefs.map(p => [p.id, JSON.stringify(projectBody(p))]));
        taskSnap.current = new Map(tks.map(t => [t.id, JSON.stringify(taskBody(t))]));
        entrySnap.current = new Map(ents.map(e => [e.id, JSON.stringify(entryBody(e, catIdByName))]));

        // B: ถ้ามี buffer ใน localStorage ที่ยังไม่ซิงก์ → กู้คืนมาใช้แทน server
        // (snapshot ยังเป็น server เพื่อให้ sync effect ดันส่วนต่างที่ค้างขึ้นไปต่อ)
        const buf = readBuffer(user.id);
        if (buf && buf.dirty) {
          setCategories(buf.categories);
          setTagDefs(buf.tags);
          setProjectDefs(buf.projects);
          setTasks(buf.tasks);
          setLogEntries(buf.logEntries);
          setSettings(buf.settings);
        } else {
          setCategories(cats);
          setTagDefs(tagDefs);
          setProjectDefs(projDefs);
          setTasks(tks);
          setLogEntries(ents);
          // settings ตั้งไว้แล้วด้านบน
        }

        setLoaded(true);
      } catch (e) {
        console.error("load failed", e);
        if (!cancelled) { setLoadError(true); setLoaded(true); } // แสดงหน้า error + ปุ่มลองใหม่
      }
    })();
    return () => { cancelled = true; };
  }, [user, getToken, loadNonce]);

  // ── sync ข้อมูลหลัก (debounced) ──
  useEffect(() => {
    if (!user || !loaded || loadError) return;
    const t = setTimeout(async () => {
      const token = await getToken();
      setSyncState("saving");
      // categories ก่อน เพื่อให้ category มีอยู่ก่อน log อ้างถึง (FK)
      let ok = await syncCollection(token, "/categories", categories, catSnap.current, categoryBody);
      ok = (await syncCollection(token, "/tags", tags, tagSnap.current, tagBody)) && ok;
      ok = (await syncCollection(token, "/projects", projects, projectSnap.current, projectBody)) && ok;
      ok = (await syncCollection(token, "/tasks", tasks, taskSnap.current, taskBody)) && ok;
      const catIdByName = new Map(categories.map(c => [c.name, c.id]));
      ok = (await syncCollection(token, "/logs", logEntries, entrySnap.current, (e) => entryBody(e, catIdByName))) && ok;
      finishSync(ok);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, logEntries, categories, tags, projects, loaded, user, getToken, retryNonce]);

  // ── sync profile/settings (debounced) ──
  useEffect(() => {
    if (!user || !loaded || loadError) return;
    const body = JSON.stringify(profileBody(settings));
    if (settingsSnap.current === body) return;
    const t = setTimeout(async () => {
      try {
        setSyncState("saving");
        const token = await getToken();
        await apiFetch(token, "/profile", { method: "PUT", body });
        settingsSnap.current = body;
        finishSync(true);
      } catch (e) {
        console.error("profile sync error", e);
        finishSync(false);
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, loaded, user, getToken]);

  // ── B: เก็บ buffer ลง localStorage (กันข้อมูลที่ยังไม่ซิงก์หายเมื่อรีเฟรช/ปิดแท็บ) ──
  useEffect(() => {
    if (!user || !loaded || loadError) return;
    const catIdByName = new Map(categories.map(c => [c.name, c.id]));
    const dirty =
      isCollectionDirty(tasks, taskSnap.current, taskBody) ||
      isCollectionDirty(logEntries, entrySnap.current, e => entryBody(e, catIdByName)) ||
      isCollectionDirty(categories, catSnap.current, categoryBody) ||
      isCollectionDirty(tags, tagSnap.current, tagBody) ||
      isCollectionDirty(projects, projectSnap.current, projectBody) ||
      JSON.stringify(profileBody(settings)) !== settingsSnap.current;
    dirtyRef.current = dirty; // อัปเดตทันที เพื่อให้ beforeunload แม่นยำ
    const t = setTimeout(() => {
      writeBuffer({ userId: user.id, dirty, tasks, logEntries, categories, tags, projects, settings });
    }, 300);
    return () => clearTimeout(t);
  }, [tasks, logEntries, categories, tags, projects, settings, syncState, loaded, user, loadError]);

  // ── A: เตือนก่อนปิด/รีเฟรชถ้ายังบันทึกขึ้น backend ไม่เสร็จ ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = ""; // เบราว์เซอร์จะขึ้นกล่องยืนยันมาตรฐาน
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

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

  function addProject(data: Omit<Project, "id">) { setProjectDefs(prev => [...prev, { ...data, id: makeId() }]); }
  function updateProject(id: string, data: Omit<Project, "id">) { setProjectDefs(prev => prev.map(p => p.id === id ? { ...p, ...data } : p)); }
  function removeProject(id: string) {
    const removed = projects.find(p => p.id === id);
    if (!removed) return;
    setProjectDefs(prev => prev.filter(p => p.id !== id));
    notify("ลบโปรเจกต์แล้ว", () => { setToast(null); setProjectDefs(prev => prev.some(p => p.id === id) ? prev : [...prev, removed]); });
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

  function exportData(): BackupData { return { tasks, logEntries, categories, tags, projects, settings }; }
  function importData(data: BackupData) {
    // gen id ใหม่ทั้งหมด (= import แทนที่ของเดิม) — diff-sync จะลบของเก่าบน server แล้ว POST ของใหม่
    if (Array.isArray(data.categories)) setCategories(data.categories.map(c => ({ ...c, id: makeId() })));
    if (Array.isArray(data.tags)) setTagDefs(data.tags.map(t => ({ ...t, id: makeId() })));
    if (Array.isArray(data.projects)) setProjectDefs(data.projects.map(p => ({ ...p, id: makeId() })));
    if (Array.isArray(data.tasks)) setTasks(data.tasks.map(t => ({ ...t, id: makeId() })));
    if (Array.isArray(data.logEntries)) setLogEntries(data.logEntries.map(e => ({ ...e, id: makeId() })));
    if (data.settings) setSettings({ ...INITIAL_SETTINGS, ...data.settings });
  }
  function resetData() {
    setTasks([]);
    setLogEntries([]);
    setCategories(INITIAL_CATEGORIES.map(c => ({ ...c, id: makeId() })));
    setTagDefs([]);
    setProjectDefs([]);
    setSettings(INITIAL_SETTINGS);
  }
  // เติมข้อมูลตัวอย่างสำหรับทดสอบ (เพิ่มเข้าไปในของเดิม) — ลบได้ด้วยปุ่มรีเซ็ต
  function addSampleData() {
    const s = makeSampleData();
    setTasks(prev => [...prev, ...s.tasks]);
    setLogEntries(prev => [...prev, ...s.logEntries]);
    setTagDefs(prev => {
      const have = new Set(prev.map(t => t.name));
      return [...prev, ...s.tags.filter(t => !have.has(t.name))];
    });
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--wt-page)", fontFamily: "Nunito, 'Nunito Sans', system-ui, sans-serif" }}>
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 text-center" style={{ border: "2px solid var(--wt-border)", boxShadow: "0 12px 40px rgba(124,58,237,0.12)" }}>
          <p style={{ fontSize: "1.6rem" }}>⚠️</p>
          <p className="mt-2" style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--wt-text)" }}>โหลดข้อมูลไม่สำเร็จ</p>
          <p className="mt-1" style={{ fontSize: "0.82rem", color: "var(--wt-muted)" }}>
            เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่าเปิด backend อยู่และอินเทอร์เน็ตปกติ แล้วลองใหม่
          </p>
          <button onClick={() => { setLoadError(false); setLoadNonce(n => n + 1); }}
            className="mt-4 px-5 py-2.5 rounded-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff", fontSize: "0.88rem", fontWeight: 800, border: "none" }}>
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return <LoadingScreen />;
  }

  return (
    <DataContext.Provider value={{ tasks, setTasks, logEntries, setLogEntries, removeTask, removeEntry, categories, addCategory, updateCategory, removeCategory, tags, addTag, setTagActive, renameTag, removeTag, projects, addProject, updateProject, removeProject, settings, updateSettings, exportData, importData, resetData, addSampleData }}>
      {children}
      <SyncIndicator state={syncState} />
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
