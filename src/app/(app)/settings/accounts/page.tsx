import { Suspense } from "react";

import { SectionSkeleton } from "@/components/ui/loaders";

import { AccountsSettingsPage } from "./accounts-settings";

function AccountsSettingsFallback() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <SectionSkeleton rows={3} rowClassName="h-28 rounded-xl" />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsSettingsFallback />}>
      <AccountsSettingsPage />
    </Suspense>
  );
}
