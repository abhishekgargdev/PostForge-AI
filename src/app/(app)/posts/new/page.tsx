import { Suspense } from "react";

import { SectionSkeleton } from "@/components/ui/loaders";

import { PostCreationWizard } from "./post-creation-wizard";

function PostEditorFallback() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:max-w-3xl md:p-6">
      <SectionSkeleton rows={1} rowClassName="h-8 w-48" />
      <SectionSkeleton rows={6} rowClassName="h-14 rounded-xl" />
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<PostEditorFallback />}>
      <PostCreationWizard />
    </Suspense>
  );
}
