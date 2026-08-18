"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";

import {
  appNavItems,
  isNavItemActive,
} from "@/components/app-shell/nav-items";
import { GradientText } from "@/components/ui/gradient-text";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navIconProps = {
  className: "size-5 shrink-0",
  strokeWidth: 2,
  "aria-hidden": true as const,
};

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <GradientText className="truncate px-1 text-sm font-heading font-semibold">
            PostForge AI
          </GradientText>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-5" strokeWidth={2} />
          ) : (
            <PanelLeftCloseIcon className="size-5" strokeWidth={2} />
          )}
        </Button>
      </div>

      <TooltipProvider delay={0}>
        <nav aria-label="Sidebar navigation" className="flex-1 p-2">
          <ul className="flex flex-col gap-1">
            {appNavItems.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);

              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-gradient-forge text-white shadow-sm"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <Icon {...navIconProps} />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger render={link} />
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
