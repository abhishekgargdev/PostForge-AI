"use client";

import { ThemeProvider } from "next-themes";

import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <InstallAppPrompt />
      <Toaster />
    </ThemeProvider>
  );
}
