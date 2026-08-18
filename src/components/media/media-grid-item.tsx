"use client";

import { motion, useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";

import {
  formatMediaSourceLabel,
  getMediaPreviewUrl,
  type MediaResponse,
} from "@/lib/media/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loaders";
import { cn } from "@/lib/utils";

type MediaGridItemProps = {
  item: MediaResponse;
  index: number;
  isDeleting: boolean;
  onDelete: (id: string) => void;
};

export function MediaGridItem({
  item,
  index,
  isDeleting,
  onDelete,
}: MediaGridItemProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.25,
        delay: reduceMotion ? 0 : index * 0.04,
        ease: "easeOut",
      }}
      className="group relative overflow-hidden rounded-xl border bg-card"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getMediaPreviewUrl(item)}
        alt={item.fileName}
        className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-forge opacity-0 transition-opacity duration-300 group-hover:opacity-35 md:block motion-reduce:group-hover:opacity-0" />

      <div className="absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:transition-opacity md:duration-300 md:group-hover:opacity-100">
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="pointer-events-auto size-11 shadow-lg"
          aria-label={`Delete ${item.fileName}`}
          disabled={isDeleting}
          onClick={() => onDelete(item.id)}
        >
          {isDeleting ? (
            <Loader size="sm" label="Deleting media" />
          ) : (
            <Trash2Icon className="size-5" strokeWidth={2} />
          )}
        </Button>
      </div>

      <div className="absolute left-2 top-2">
        <Badge variant="secondary" className="bg-white/90 text-ink">
          {formatMediaSourceLabel(item.source)}
        </Badge>
      </div>

      <div className="space-y-1 border-t bg-card p-2">
        <p className="truncate text-xs font-medium">{item.fileName}</p>
        <p className="text-[0.6875rem] text-muted-foreground">
          {format(new Date(item.createdAt), "MMM d, yyyy")}
        </p>
      </div>
    </motion.div>
  );
}
