/** สร้าง id ที่ไม่ซ้ำ ใช้ crypto.randomUUID ถ้ามี ไม่งั้น fallback */
export function makeId(prefix: string) {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}-${uuid}`;
}
