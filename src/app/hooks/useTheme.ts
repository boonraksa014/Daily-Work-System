import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type Theme = "light" | "dark";

/**
 * จัดการธีม light/dark — จำค่าไว้ใน localStorage และ toggle คลาส .dark
 * ที่ <html> เพื่อให้ CSS variables (--wt-*) สลับค่าทั้งแอป
 */
export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>("worktrack.theme", "light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
