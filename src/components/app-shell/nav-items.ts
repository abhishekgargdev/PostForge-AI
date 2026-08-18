import {
  FileText,
  ImageIcon,
  LayoutDashboard,
  MoreHorizontal,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  mobileLabel?: string;
};

export const appNavItems: AppNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Posts",
    href: "/posts",
    icon: FileText,
  },
  {
    label: "Create",
    href: "/posts/new",
    icon: PlusCircle,
    mobileLabel: "Create",
  },
  {
    label: "Media",
    href: "/media",
    icon: ImageIcon,
  },
  {
    label: "More",
    href: "/settings",
    icon: MoreHorizontal,
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/posts/new") {
    return pathname === "/posts/new";
  }

  if (href === "/posts") {
    return (
      pathname === "/posts" ||
      (pathname.startsWith("/posts/") && pathname !== "/posts/new")
    );
  }

  if (href === "/settings") {
    return (
      pathname === "/settings" ||
      pathname.startsWith("/settings/") ||
      pathname === "/analytics" ||
      pathname.startsWith("/analytics/")
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getUserInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
