"use client";

import { Reports } from "@/components/Reports";
import { useData } from "@/lib/store";

export default function ReportsPage() {
  const { tasks, logEntries, categories } = useData();
  return <Reports tasks={tasks} logEntries={logEntries} categories={categories} />;
}
