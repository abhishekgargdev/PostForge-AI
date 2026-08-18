import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { getSessionUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
