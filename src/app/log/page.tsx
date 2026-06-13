"use client";

import { DailyLog } from "@/components/DailyLog";
import { useData } from "@/lib/store";

export default function LogPage() {
  const { logEntries, setLogEntries, removeEntry } = useData();
  return <DailyLog entries={logEntries} onEntriesChange={setLogEntries} onDeleteEntry={removeEntry} />;
}
