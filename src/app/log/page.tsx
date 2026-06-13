"use client";

import { DailyLog } from "@/components/DailyLog";
import { useData } from "@/lib/store";

export default function LogPage() {
  const { logEntries, setLogEntries } = useData();
  return <DailyLog entries={logEntries} onEntriesChange={setLogEntries} />;
}
