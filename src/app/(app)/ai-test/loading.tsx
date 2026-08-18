import { SectionSkeleton } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

export default function AiTestLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="rounded-xl border p-4">
        <SectionSkeleton rows={1} rowClassName="h-5 w-24" />
        <SectionSkeleton rows={1} rowClassName="mt-4 h-28" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SectionSkeleton rows={1} rowClassName="h-11" />
          <SectionSkeleton rows={1} rowClassName="h-11" />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <SectionSkeleton rows={1} rowClassName="h-11" />
          <SectionSkeleton rows={1} rowClassName="h-11" />
        </div>
      </div>
    </div>
  );
}
