import { SectionSkeleton } from "@/components/ui/loaders";

export default function ContentCalendarLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <SectionSkeleton rows={1} rowClassName="h-8 w-56" />
      <SectionSkeleton rows={7} rowClassName="h-28 rounded-xl md:hidden" />
      <SectionSkeleton rows={1} rowClassName="hidden h-40 rounded-xl md:block" />
    </div>
  );
}
