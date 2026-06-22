"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { useData } from "@/lib/store";
import { makeId } from "@/lib/id";

export default function KanbanPage() {
  const { tasks, setTasks, removeTask, tags, logEntries, setLogEntries, categories, projects } = useData();
  const activeTags = tags.filter(t => t.isActive).map(t => t.name);

  // ติ๊ก "ลงเวลาด้วย" ตอนเพิ่มงาน → สร้างบันทึกรายวันของวันนี้ที่ผูกกับงานนั้น (สืบทอดโปรเจกต์ของงาน)
  function handleLogTime({ taskId, title, hours, projectId }: { taskId: string; title: string; hours: number; projectId?: string }) {
    const today = new Date().toISOString().split("T")[0];
    const category = categories.find(c => c.isActive)?.name ?? categories[0]?.name ?? "";
    setLogEntries(prev => [...prev, { id: makeId("log"), date: today, title, hours, category, taskId, projectId, done: false }]);
  }

  // คอลัมน์ต้องสูงเต็มพื้นที่เพื่อให้ scroll ภายในการ์ดทำงาน (หัก header + padding)
  return (
    <div style={{ height: "calc(100vh - 114px)" }}>
      <KanbanBoard tasks={tasks} onTasksChange={setTasks} onDeleteTask={removeTask}
        availableTags={activeTags} availableProjects={projects} logEntries={logEntries} onLogTime={handleLogTime} />
    </div>
  );
}
