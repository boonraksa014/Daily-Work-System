"use client";

import { KanbanBoard } from "@/components/KanbanBoard";
import { useData } from "@/lib/store";
import { makeId } from "@/lib/id";
import { todayStr } from "@/lib/date";

export default function KanbanPage() {
  const { tasks, setTasks, removeTask, tags, logEntries, setLogEntries, categories, projects } = useData();
  const activeTags = tags.filter(t => t.isActive).map(t => t.name);

  // ติ๊ก "ลงเวลาด้วย" ตอนเพิ่มงาน → สร้างบันทึกรายวันของวันนี้ที่ผูกกับงานนั้น (สืบทอดหมวดหมู่/โปรเจกต์ของงาน)
  function handleLogTime({ taskId, title, hours, projectId, categoryId }: { taskId: string; title: string; hours: number; projectId?: string; categoryId?: string }) {
    const today = todayStr();
    // ใช้หมวดของงานถ้ามี ไม่งั้น fallback หมวดที่เปิดใช้งานตัวแรก
    const category = (categoryId ? categories.find(c => c.id === categoryId)?.name : undefined)
      ?? categories.find(c => c.isActive)?.name ?? categories[0]?.name ?? "";
    setLogEntries(prev => [...prev, { id: makeId("log"), date: today, title, hours, category, taskId, projectId, done: false }]);
  }

  // แก้ชั่วโมงของบันทึกรายวันที่ผูกกับงาน (จากหน้าแก้งานใน Kanban)
  function handleUpdateLogHours(logId: string, hours: number) {
    setLogEntries(prev => prev.map(e => e.id === logId ? { ...e, hours } : e));
  }

  // ย้ายงานเข้า/ออก "เสร็จสิ้น" → ตั้งสถานะ "เสร็จ" ของบันทึกรายวันที่ผูกกับงานนั้นตามไปด้วย
  function handleSetTaskLogsDone(taskId: string, done: boolean) {
    setLogEntries(prev => prev.map(e => e.taskId === taskId && e.done !== done ? { ...e, done } : e));
  }

  // คอลัมน์ต้องสูงเต็มพื้นที่เพื่อให้ scroll ภายในการ์ดทำงาน (หัก header + padding)
  return (
    <div style={{ height: "calc(100vh - 114px)" }}>
      <KanbanBoard tasks={tasks} onTasksChange={setTasks} onDeleteTask={removeTask}
        availableTags={activeTags} availableProjects={projects} availableCategories={categories} logEntries={logEntries} onLogTime={handleLogTime} onUpdateLogHours={handleUpdateLogHours} onSetTaskLogsDone={handleSetTaskLogsDone} />
    </div>
  );
}
