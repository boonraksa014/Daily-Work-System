"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { DataProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="worktrack.theme">
      <DataProvider>
        <AppShell>{children}</AppShell>
      </DataProvider>
    </ThemeProvider>
  );
}
