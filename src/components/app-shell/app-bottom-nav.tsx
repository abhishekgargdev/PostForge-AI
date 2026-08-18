"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  appNavItems,
  isNavItemActive,
} from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

const navIconProps = {
  className: "size-5 shrink-0",
  strokeWidth: 2,
  "aria-hidden": true as const,
};

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item.href);
          const label = item.mobileLabel ?? item.label;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-forge" : "text-neutral-500 hover:text-neutral-800",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-x-2 top-1 h-1 rounded-full bg-gradient-forge"
                    aria-hidden
                  />
                ) : null}
                <Icon {...navIconProps} />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
