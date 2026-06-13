"use client";

import { useRouter } from "next/navigation";
import { DashboardView } from "@/components/DashboardView";
import { useData } from "@/lib/store";
import { VIEW_PATH } from "@/lib/paths";

export default function DashboardPage() {
  const router = useRouter();
  const { tasks, logEntries } = useData();
  return <DashboardView tasks={tasks} logEntries={logEntries} onNavigate={v => router.push(VIEW_PATH[v])} />;
}
