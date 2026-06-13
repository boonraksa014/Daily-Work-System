"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { useData } from "@/lib/store";

export default function KanbanPage() {
  const { tasks, setTasks, removeTask } = useData();
  // คอลัมน์ต้องสูงเต็มพื้นที่เพื่อให้ scroll ภายในการ์ดทำงาน (หัก header + padding)
  return (
    <div style={{ height: "calc(100vh - 114px)" }}>
      <KanbanBoard tasks={tasks} onTasksChange={setTasks} onDeleteTask={removeTask} />
    </div>
  );
}
