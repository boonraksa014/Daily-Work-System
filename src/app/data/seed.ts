import type { Task } from "../components/KanbanBoard";
import type { LogEntry } from "../components/DailyLog";

// ข้อมูลตัวอย่างเริ่มต้น — ใช้ครั้งแรกที่เปิดแอป (ก่อนมีข้อมูลใน localStorage)
export const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "ออกแบบ UI หน้าหลัก", description: "วาง Wireframe และ Mockup สำหรับหน้า Dashboard", priority: "high", status: "done", tags: ["UI/UX", "Design"], createdAt: "2026-06-10", dueDate: "2026-06-11" },
  { id: "t2", title: "พัฒนา API สำหรับระบบรายงาน", description: "สร้าง REST API endpoint สำหรับดึงข้อมูลรายงาน", priority: "high", status: "inprogress", tags: ["Backend", "API"], createdAt: "2026-06-11" },
  { id: "t3", title: "เขียน Unit Test สำหรับ Authentication", priority: "medium", status: "inprogress", tags: ["Testing"], createdAt: "2026-06-11", dueDate: "2026-06-13" },
  { id: "t4", title: "อัปเดตเอกสาร API", priority: "low", status: "todo", tags: ["เอกสาร"], createdAt: "2026-06-12" },
  { id: "t5", title: "Code Review PR #42", priority: "medium", status: "todo", tags: ["Review"], createdAt: "2026-06-12", dueDate: "2026-06-12" },
  { id: "t6", title: "ประชุมทีมรายสัปดาห์", priority: "medium", status: "todo", tags: ["ประชุม"], createdAt: "2026-06-12" },
];

export const INITIAL_LOGS: LogEntry[] = [
  { id: "l1", date: "2026-06-12", title: "ออกแบบ UI Dashboard หน้าหลัก", hours: 3, category: "พัฒนาระบบ", done: true, note: "เสร็จตามแผน ส่ง Figma ให้ทีมแล้ว" },
  { id: "l2", date: "2026-06-12", title: "ประชุม Sprint Planning", hours: 1.5, category: "ประชุม", done: true },
  { id: "l3", date: "2026-06-12", title: "พัฒนา API endpoints", hours: 2, category: "พัฒนาระบบ", done: false },
  { id: "l4", date: "2026-06-11", title: "เขียนเอกสารระบบ", hours: 2, category: "เอกสาร", done: true },
  { id: "l5", date: "2026-06-11", title: "Fix Bug: Login form validation", hours: 1.5, category: "พัฒนาระบบ", done: true },
  { id: "l6", date: "2026-06-11", title: "Code Review", hours: 1, category: "พัฒนาระบบ", done: true },
  { id: "l7", date: "2026-06-10", title: "ประชุม Design Review", hours: 2, category: "ประชุม", done: true },
  { id: "l8", date: "2026-06-10", title: "พัฒนา Dashboard component", hours: 4, category: "พัฒนาระบบ", done: true },
  { id: "l9", date: "2026-06-09", title: "Sprint Retrospective", hours: 1, category: "ประชุม", done: true },
  { id: "l10", date: "2026-06-09", title: "เขียน Unit Tests", hours: 3, category: "ทดสอบ", done: true },
  { id: "l11", date: "2026-06-08", title: "วางแผน Sprint ใหม่", hours: 2, category: "วางแผน", done: true },
  { id: "l12", date: "2026-06-08", title: "พัฒนา Authentication module", hours: 3.5, category: "พัฒนาระบบ", done: true },
  { id: "l13", date: "2026-06-07", title: "ตรวจสอบ Performance", hours: 2, category: "ทดสอบ", done: true },
  { id: "l14", date: "2026-06-07", title: "ประชุมกับ Client", hours: 1.5, category: "ประชุม", done: true },
];
