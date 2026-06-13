"use client";

import { DailyLog } from "@/components/DailyLog";
import { useData } from "@/lib/store";

export default function LogPage() {
  const { logEntries, setLogEntries, removeEntry, categories } = useData();
  return <DailyLog entries={logEntries} categories={categories} onEntriesChange={setLogEntries} onDeleteEntry={removeEntry} />;
}
