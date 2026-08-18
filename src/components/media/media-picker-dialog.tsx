"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionSkeleton } from "@/components/ui/loaders";

type MediaPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaResponse) => void;
};

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: MediaPickerDialogProps) {
  const [items, setItems] = useState<MediaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMedia = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "24",
        source: "all",
      });
      const data = await apiClient<PaginatedMediaResponse>(
        `/api/media?${params.toString()}`,
      );
      setItems(data.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load media library",
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchMedia();
    }
  }, [open, fetchMedia]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose from library</DialogTitle>
          <DialogDescription>
            Select an existing upload or AI-generated image for this post.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SectionSkeleton
                key={index}
                rows={1}
                rowClassName="aspect-square rounded-xl"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No media yet. Upload images on the Media page or generate one with
            AI.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="overflow-hidden rounded-xl border text-left transition-colors hover:border-primary"
                onClick={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMediaPreviewUrl(item)}
                  alt={item.fileName}
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-2 border-t p-2">
                  <Badge variant="secondary">
                    {formatMediaSourceLabel(item.source)}
                  </Badge>
                  <p className="truncate text-xs font-medium">{item.fileName}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
