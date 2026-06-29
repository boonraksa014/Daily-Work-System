// date.ts — วันที่แบบ local (ตามโซนเวลาเครื่องผู้ใช้) รูปแบบ YYYY-MM-DD
// ใช้แทน new Date().toISOString().split("T")[0] ที่เป็น UTC — ซึ่งทำให้ "วัน" คลาด
// สำหรับโซนเวลา +7 (ไทย) ช่วงเที่ยงคืน–7 โมงเช้า จะถูกนับเป็นเมื่อวาน

/** แปลง Date เป็นสตริงวันที่ตามเวลาท้องถิ่น (YYYY-MM-DD) */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** วันนี้ตามเวลาท้องถิ่น (YYYY-MM-DD) */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** เลื่อนวันจากสตริง YYYY-MM-DD ไป +/- กี่วัน (คำนวณแบบ local ไม่เพี้ยนข้ามโซนเวลา) */
export function offsetDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00"); // parse เป็นเที่ยงคืนเวลาท้องถิ่น
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}
