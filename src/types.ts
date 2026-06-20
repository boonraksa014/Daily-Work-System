// types.ts — นิยาม "รูปร่างข้อมูล" ที่ใช้ทั้งแอป
// อยากเพิ่มฟิลด์ใหม่ในหมวดหมู่/แท็ก/ตั้งค่า: เพิ่มที่ interface ด้านล่าง
// (อย่าลืมแก้ให้ตรงกันที่ฐานข้อมูล + backend + store.tsx ด้วย — ดู DEVELOPER_GUIDE.md)

// มุมมอง/หน้าหลักของแอป ใช้ร่วมกันระหว่าง App shell กับแต่ละ page
export type View = "dashboard" | "kanban" | "log" | "reports";

/** หมวดหมู่งาน (master data) — จัดการได้ที่ ตั้งค่า → หมวดหมู่ */
export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex ใช้เป็นสี accent (dot/กราฟ) และ tint พื้นชิป
  isActive: boolean;
}

/** แท็ก (master) — จัดการได้ที่ ตั้งค่า → แท็ก */
export interface Tag {
  id: string;
  name: string;
  isActive: boolean;
}

/** ค่าตั้งค่าทั่วไป + โปรไฟล์ผู้ใช้ */
export interface AppSettings {
  displayName: string;
  role: string;
  avatarColor: string;
  defaultView: View;
}
