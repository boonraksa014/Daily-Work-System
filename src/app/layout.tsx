import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/index.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "WorkTrack — Daily Work Log",
  description: "ระบบบันทึกและติดตามงานรายวันส่วนตัว: Kanban, บันทึกรายวัน และรายงานสรุป",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
