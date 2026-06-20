"use client";

import { DailyLog } from "@/components/DailyLog";
import { useData } from "@/lib/store";

export default function LogPage() {
  const { logEntries, setLogEntries, removeEntry, categories, tasks } = useData();
  return <DailyLog entries={logEntries} categories={categories} tasks={tasks} onEntriesChange={setLogEntries} onDeleteEntry={removeEntry} />;
}
