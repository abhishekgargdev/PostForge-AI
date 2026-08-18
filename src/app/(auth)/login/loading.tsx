import { SectionSkeleton } from "@/components/ui/loaders";

export default function LoginLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2 text-center">
        <SectionSkeleton rows={1} className="mx-auto max-w-[12rem]" />
        <SectionSkeleton rows={1} className="mx-auto max-w-[16rem]" />
      </div>
      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={1} className="h-11" />
    </div>
  );
}
