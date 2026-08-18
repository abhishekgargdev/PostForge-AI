import { SectionSkeleton } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreatePostLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:max-w-2xl md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>
      <SectionSkeleton rows={1} rowClassName="h-11" />
      <SectionSkeleton rows={1} rowClassName="h-32" />
      <SectionSkeleton rows={1} rowClassName="h-11 w-32" />
    </div>
  );
}
