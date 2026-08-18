import { SectionSkeleton } from "@/components/ui/loaders";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <SectionSkeleton rows={1} className="max-w-xs" />
      <SectionSkeleton rows={3} />
    </div>
  );
}
