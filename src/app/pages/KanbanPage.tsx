import { KanbanBoard, Task } from "../components/KanbanBoard";

interface KanbanPageProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
}

export function KanbanPage({ tasks, onTasksChange }: KanbanPageProps) {
  // คอลัมน์ต้องสูงเต็มพื้นที่เพื่อให้ scroll ภายในการ์ดทำงาน (หัก header + ระยะ padding)
  return (
    <div style={{ height: "calc(100vh - 114px)" }}>
      <KanbanBoard tasks={tasks} onTasksChange={onTasksChange} />
    </div>
  );
}
