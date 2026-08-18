import { SectionSkeleton } from "@/components/ui/loaders";

export default function AccountsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <SectionSkeleton rows={1} rowClassName="h-8 w-48" />
      <SectionSkeleton rows={3} rowClassName="h-28 rounded-xl" />
    </div>
  );
}
