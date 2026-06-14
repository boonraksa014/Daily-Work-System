"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { useData } from "@/lib/store";

export default function KanbanPage() {
  const { tasks, setTasks, removeTask, tags } = useData();
  const activeTags = tags.filter(t => t.isActive).map(t => t.name);
  // คอลัมน์ต้องสูงเต็มพื้นที่เพื่อให้ scroll ภายในการ์ดทำงาน (หัก header + padding)
  return (
    <div style={{ height: "calc(100vh - 114px)" }}>
      <KanbanBoard tasks={tasks} onTasksChange={setTasks} onDeleteTask={removeTask} availableTags={activeTags} />
    </div>
  );
}
