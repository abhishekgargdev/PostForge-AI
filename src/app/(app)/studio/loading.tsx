import { SectionSkeleton } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudioLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <SectionSkeleton rows={4} rowClassName="h-16 rounded-xl" />
        </div>
        <div className="xl:col-span-2">
          <SectionSkeleton rows={1} rowClassName="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
