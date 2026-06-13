"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Task } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import { INITIAL_TASKS, INITIAL_LOGS } from "@/data/seed";

interface DataContextValue {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  logEntries: LogEntry[];
  setLogEntries: (entries: LogEntry[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * แหล่งข้อมูลกลาง (tasks + logs) เก็บใน localStorage และแชร์ทุกหน้า
 * ผ่าน React context. รอจน mount ก่อนค่อย render เนื้อหา เพื่อกัน
 * hydration mismatch (server ไม่มี localStorage) — แอปนี้เป็น client ล้วน
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>("worktrack.tasks", INITIAL_TASKS);
  const [logEntries, setLogEntries] = useLocalStorage<LogEntry[]>("worktrack.logs", INITIAL_LOGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ height: "100vh", background: "var(--wt-page)" }} aria-hidden />;
  }

  return (
    <DataContext.Provider value={{ tasks, setTasks, logEntries, setLogEntries }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData ต้องใช้ภายใน <DataProvider>");
  return ctx;
}
