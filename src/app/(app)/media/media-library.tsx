"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ImagePlusIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { apiClient, uploadApiClient } from "@/lib/api-client";
import {
  formatMediaSourceLabel,
  getMediaPreviewUrl,
  type MediaResponse,
  type PaginatedMediaResponse,
} from "@/lib/media/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loaders";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaLibraryPage() {
  const [items, setItems] = useState<MediaResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async (targetPage = page) => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
        source: "all",
      });
      const data = await apiClient<PaginatedMediaResponse>(
        `/api/media?${params.toString()}`,
      );

      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load media",
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  function handleFileSelection(file: File | null) {
    setSelectedFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    handleFileSelection(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Choose an image to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await uploadApiClient<MediaResponse>("/api/media/upload", formData);

      toast.success("Image uploaded");
      setSelectedFile(null);
      setIsUploadOpen(false);
      setPage(1);
      await fetchMedia(1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload image",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);

    try {
      await apiClient(`/api/media/${id}`, { method: "DELETE" });
      toast.success("Media deleted");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete media",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="text-sm text-muted-foreground">
            Uploads and AI-generated images for your posts.
          </p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger
            render={
              <Button className="h-11">
                <UploadIcon />
                Upload
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload image</DialogTitle>
              <DialogDescription>
                Drag and drop an image here, or browse from your device. Max
                size 10MB.
              </DialogDescription>
            </DialogHeader>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <ImagePlusIcon className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : "Drop an image here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or GIF
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0] ?? null)
                }
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setIsUploadOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11"
                disabled={!selectedFile || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <>
                    <Loader size="sm" label="Uploading image" />
                    Uploading...
                  </>
                ) : (
                  "Upload image"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No media yet. Upload an image or generate one from the post editor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getMediaPreviewUrl(item)}
                alt={item.fileName}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
                <Badge variant="secondary">
                  {formatMediaSourceLabel(item.source)}
                </Badge>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label={`Delete ${item.fileName}`}
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  {deletingId === item.id ? (
                    <Loader size="sm" label="Deleting media" />
                  ) : (
                    <Trash2Icon />
                  )}
                </Button>
              </div>
              <div className="space-y-1 border-t p-2">
                <p className="truncate text-xs font-medium">{item.fileName}</p>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {format(new Date(item.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
