export default function PostsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <p className="text-sm text-muted-foreground">
          Your drafts, scheduled posts, and published content will appear here.
        </p>
      </div>
    </div>
  );
}
