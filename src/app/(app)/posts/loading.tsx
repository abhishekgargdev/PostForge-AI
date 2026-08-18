import { SectionSkeleton } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <SectionSkeleton rows={5} rowClassName="h-16" />
    </div>
  );
}
