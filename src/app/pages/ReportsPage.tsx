import { Reports } from "../components/Reports";
import type { Task } from "../components/KanbanBoard";
import type { LogEntry } from "../components/DailyLog";

interface ReportsPageProps {
  tasks: Task[];
  logEntries: LogEntry[];
}

export function ReportsPage({ tasks, logEntries }: ReportsPageProps) {
  return <Reports logEntries={logEntries} tasks={tasks} />;
}
