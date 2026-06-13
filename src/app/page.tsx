"use client";

import { useRouter } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";
import { useData } from "@/lib/store";
import type { View } from "@/types";

const PATHS: Record<View, string> = {
  dashboard: "/",
  kanban: "/kanban",
  log: "/log",
  reports: "/reports",
};

export default function DashboardPage() {
  const router = useRouter();
  const { tasks, logEntries } = useData();
  return <DashboardView tasks={tasks} logEntries={logEntries} onNavigate={v => router.push(PATHS[v])} />;
}
