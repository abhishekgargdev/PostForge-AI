import { Skeleton } from "@/components/ui/skeleton";
import { SectionSkeleton } from "@/components/ui/loaders";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-xl xl:col-span-2" />
        <SectionSkeleton rows={3} rowClassName="h-16 rounded-lg" />
      </div>

      <SectionSkeleton rows={5} rowClassName="h-14 rounded-lg" />
    </div>
  );
}
