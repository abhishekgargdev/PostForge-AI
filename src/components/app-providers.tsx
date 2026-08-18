"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (process.env.NODE_ENV !== "production") {
            console.log("Service Worker registered with scope:", registration.scope);
          }
        })
        .catch((error) => {
          if (process.env.NODE_ENV !== "production") {
            console.error("Service Worker registration failed:", error);
          }
        });
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <InstallAppPrompt />
      <Toaster />
    </ThemeProvider>
  );
}
