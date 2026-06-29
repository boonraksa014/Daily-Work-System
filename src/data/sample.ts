// ชุดข้อมูลตัวอย่างสำหรับทดสอบระบบ — สร้างวันที่แบบสัมพัทธ์กับ "วันนี้"
// เพื่อให้กราฟ/streak/รายงานมีข้อมูลให้ดูทันที (ลบออกได้ด้วยปุ่มรีเซ็ต)
import type { Task } from "@/components/KanbanBoard";
import type { LogEntry } from "@/components/DailyLog";
import type { Tag } from "@/types";
import { makeId } from "@/lib/id";
import { toDateStr } from "@/lib/date";

function dStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toDateStr(d);
}

export function makeSampleData(): { tasks: Task[]; logEntries: LogEntry[]; tags: Tag[] } {
  const tags: Tag[] = ["Backend", "Frontend", "API", "UI/UX", "Testing", "Review"].map(name => ({ id: makeId(), name, isActive: true }));

  const tasks: Task[] = [
    { id: makeId(), title: "ออกแบบหน้า Dashboard", description: "วาง layout + การ์ดสรุป", priority: "high", status: "done", tags: ["UI/UX", "Frontend"], createdAt: dStr(10), dueDate: dStr(7) },
    { id: makeId(), title: "ทำ REST API หน้ารายงาน", priority: "high", status: "inprogress", tags: ["Backend", "API"], createdAt: dStr(6) },
    { id: makeId(), title: "เขียน Unit Test ระบบล็อกอิน", priority: "medium", status: "inprogress", tags: ["Testing"], createdAt: dStr(5), dueDate: dStr(-1) },
    { id: makeId(), title: "อัปเดตเอกสาร API", priority: "low", status: "todo", tags: ["เอกสาร"], createdAt: dStr(3) },
    { id: makeId(), title: "Code review PR #128", priority: "medium", status: "todo", tags: ["Review"], createdAt: dStr(2), dueDate: dStr(0) },
    { id: makeId(), title: "Refactor data layer", priority: "low", status: "done", tags: ["Backend"], createdAt: dStr(9) },
  ];
  const tDash = tasks[0].id, tApi = tasks[1].id, tTest = tasks[2].id;

  const logEntries: LogEntry[] = [];
  const add = (daysAgo: number, title: string, hours: number, category: string, done: boolean, taskId?: string) =>
    logEntries.push({ id: makeId(), date: dStr(daysAgo), title, hours, category, done, taskId });

  add(0, "ทำ API endpoint รายงาน", 3, "พัฒนาระบบ", false, tApi);
  add(0, "ประชุม standup", 0.5, "ประชุม", true);
  add(1, "เขียน test cases", 2, "ทดสอบ", true, tTest);
  add(1, "แก้บั๊กฟอร์มล็อกอิน", 1.5, "พัฒนาระบบ", true);
  add(2, "ออกแบบ UI Dashboard", 3.5, "พัฒนาระบบ", true, tDash);
  add(2, "รีวิวโค้ดทีม", 1, "พัฒนาระบบ", true);
  add(3, "เขียนเอกสารระบบ", 2, "เอกสาร", true);
  add(4, "ประชุม Sprint Planning", 1.5, "ประชุม", true);
  add(4, "วางแผนงานสัปดาห์", 1, "วางแผน", true);
  add(5, "พัฒนาโมดูล Auth", 4, "พัฒนาระบบ", true);
  add(6, "ทดสอบ Performance", 2, "ทดสอบ", true);
  add(7, "ประชุมกับลูกค้า", 1.5, "ประชุม", true);
  add(8, "Refactor store", 3, "พัฒนาระบบ", true);
  add(9, "เขียน API docs", 2, "เอกสาร", false);
  add(10, "ตั้งค่า CI/CD", 2.5, "สนับสนุน", true);

  return { tasks, logEntries, tags };
}
