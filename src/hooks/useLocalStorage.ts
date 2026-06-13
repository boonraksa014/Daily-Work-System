import { useState, useEffect } from "react";

/**
 * useState ที่ sync ค่าเก็บลง localStorage อัตโนมัติ
 * - อ่านค่าเริ่มต้นจาก localStorage ถ้ามี ไม่งั้นใช้ initialValue
 * - เขียนกลับทุกครั้งที่ค่าเปลี่ยน
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      // ข้อมูลเสียหาย/parse ไม่ได้ → ใช้ค่าเริ่มต้น
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage เต็มหรือถูกปิด → เงียบไว้ ไม่ให้แอปพัง
    }
  }, [key, value]);

  return [value, setValue] as const;
}
