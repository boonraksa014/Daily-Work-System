/** สร้าง id แบบ UUID (รองรับคอลัมน์ uuid ของ Postgres) — prefix ไม่ใช้แล้วแต่คงไว้เพื่อ compatibility */
export function makeId(_prefix?: string): string {
  void _prefix;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback: RFC4122-ish v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
