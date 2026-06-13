import type { View } from "@/types";

// แมป view -> URL จริง (dashboard ย้ายมา /dashboard เพื่อให้ "/" ทำ default-view redirect ได้)
export const VIEW_PATH: Record<View, string> = {
  dashboard: "/dashboard",
  kanban: "/kanban",
  log: "/log",
  reports: "/reports",
};
