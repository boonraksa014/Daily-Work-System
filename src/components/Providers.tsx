"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/AuthGate";
import { DataProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="worktrack.theme">
      <AuthProvider>
        <AuthGate>
          <DataProvider>
            <ConfirmProvider>
              <AppShell>{children}</AppShell>
            </ConfirmProvider>
          </DataProvider>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
