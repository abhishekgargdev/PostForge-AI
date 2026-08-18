"use client";

import { useState } from "react";

import { AppBottomNav } from "@/components/app-shell/app-bottom-nav";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppTopBar } from "@/components/app-shell/app-top-bar";
import { PageTransition } from "@/components/ui/page-transition";
import type { PublicUser } from "@/lib/auth";

type AppShellProps = {
  user: PublicUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar user={user} />

        <div className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </div>

        <AppBottomNav />
      </div>
    </div>
  );
}
