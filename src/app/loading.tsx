import { SectionSkeleton } from "@/components/ui/loaders";

export default function HomeLoading() {
  return (
    <div className="min-h-full bg-cloud">
      <SectionSkeleton rows={1} rowClassName="h-14 w-full rounded-none" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 pt-10">
        <SectionSkeleton rows={1} rowClassName="h-12 w-64" />
        <SectionSkeleton rows={1} rowClassName="h-20 w-full max-w-xl" />
        <SectionSkeleton rows={1} rowClassName="h-11 w-44 rounded-lg" />
        <SectionSkeleton rows={1} rowClassName="mt-4 aspect-[4/3] w-full max-w-md rounded-2xl" />
      </div>
    </div>
  );
}
