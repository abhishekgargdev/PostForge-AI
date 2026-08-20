import { SectionSkeleton } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlannerLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SectionSkeleton
            key={index}
            rows={1}
            rowClassName="h-56 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
