"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/store";
import { VIEW_PATH } from "@/lib/paths";

// หน้าแรก: เด้งไปยัง "หน้าเริ่มต้น" ที่ตั้งไว้ (ค่าเริ่มต้น = ภาพรวม)
export default function Home() {
  const router = useRouter();
  const { settings } = useData();

  useEffect(() => {
    router.replace(VIEW_PATH[settings.defaultView] ?? "/dashboard");
  }, [router, settings.defaultView]);

  return <div style={{ height: "60vh" }} aria-hidden />;
}
