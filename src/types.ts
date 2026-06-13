// มุมมอง/หน้าหลักของแอป ใช้ร่วมกันระหว่าง App shell กับแต่ละ page
export type View = "dashboard" | "kanban" | "log" | "reports";

/** หมวดหมู่งาน (master data) — จัดการได้ที่ ตั้งค่า → หมวดหมู่ */
export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex ใช้เป็นสี accent (dot/กราฟ) และ tint พื้นชิป
}

/** ค่าตั้งค่าทั่วไปของแอป (ตั้งค่า → ทั่วไป) */
export interface AppSettings {
  displayName: string;
  defaultView: View;
}
