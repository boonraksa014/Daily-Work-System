import { DailyLog, LogEntry } from "../components/DailyLog";

interface LogPageProps {
  entries: LogEntry[];
  onEntriesChange: (entries: LogEntry[]) => void;
}

export function LogPage({ entries, onEntriesChange }: LogPageProps) {
  return <DailyLog entries={entries} onEntriesChange={onEntriesChange} />;
}
