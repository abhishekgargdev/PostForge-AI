"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, Check, Clock, Trash2, Edit, Send } from "lucide-react";

import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "@/components/ui/loaders";
import { formatPlatformLabel } from "@/lib/posts/serialize";

type PlatformDetail = {
  platform: string;
  status: string;
  errorMessage?: string;
  retryCount: number;
};

type PostItem = {
  id: string;
  content: string;
  status: string;
  platforms: string[];
  scheduledAt?: string;
  createdAt: string;
  timezone?: string;
  aiPrompt?: string;
  imageUrl?: string;
  platformsDetail?: PlatformDetail[];
};

export function DailyDraftConfirmation({ onActionComplete }: { onActionComplete: () => void }) {
  const [draftPost, setDraftPost] = useState<PostItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Actions
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContent, setEditContent] = useState("");

  const [isPerformingAction, setIsPerformingAction] = useState(false);

  const fetchDailyDraft = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<{ posts: PostItem[] }>("/api/posts?status=draft&limit=20");
      // Find the latest auto-generated draft
      const dailyDraft = res.posts.find(
        (p) => p.aiPrompt && p.aiPrompt.includes("Daily Auto-Generated")
      );
      setDraftPost(dailyDraft || null);
    } catch {
      setDraftPost(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDailyDraft();
  }, [fetchDailyDraft]);

  const handlePublishInstantly = async () => {
    if (!draftPost) return;
    setIsPerformingAction(true);
    try {
      await apiClient(`/api/posts/${draftPost.id}/publish`, { method: "POST" });
      toast.success("Daily draft published instantly!");
      setDraftPost(null);
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publishing failed");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleOpenReschedule = () => {
    if (!draftPost) return;
    // Default to tomorrow at 9:00 AM local time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const hours = String(tomorrow.getHours()).padStart(2, "0");
    const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
    setRescheduleTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    setIsRescheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!draftPost || !rescheduleTime) return;
    setIsPerformingAction(true);
    try {
      const utcDate = new Date(rescheduleTime).toISOString();
      await apiClient(`/api/posts/${draftPost.id}`, {
        method: "PUT",
        body: JSON.stringify({ scheduledAt: utcDate, status: "scheduled" }),
      });
      toast.success("Daily draft confirmed & scheduled!");
      setIsRescheduleOpen(false);
      setDraftPost(null);
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scheduling failed");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleOpenEdit = () => {
    if (!draftPost) return;
    setEditContent(draftPost.content);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!draftPost) return;
    if (!editContent.trim()) {
      toast.error("Content cannot be empty.");
      return;
    }
    setIsPerformingAction(true);
    try {
      await apiClient(`/api/posts/${draftPost.id}`, {
        method: "PUT",
        body: JSON.stringify({ content: editContent.trim() }),
      });
      toast.success("Draft copy updated successfully");
      setIsEditOpen(false);
      void fetchDailyDraft();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleDismiss = async () => {
    if (!draftPost) return;
    if (!confirm("Are you sure you want to dismiss and delete this daily draft?")) {
      return;
    }
    setIsPerformingAction(true);
    try {
      await apiClient(`/api/posts/${draftPost.id}`, { method: "DELETE" });
      toast.success("Daily draft dismissed");
      setDraftPost(null);
      onActionComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dismiss failed");
    } finally {
      setIsPerformingAction(false);
    }
  };

  if (isLoading || !draftPost) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-forge bg-gradient-to-br from-forge/5 to-transparent ring-1 ring-forge/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-forge">
          <Sparkles className="size-5 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider">🌅 Daily AI-Generated Draft</span>
        </div>
        <CardTitle className="text-xl">Your Daily Update is Ready</CardTitle>
        <CardDescription>
          PostForge generated a draft post based on your active topics. Review and schedule it now.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 border rounded-xl p-4 bg-white/70 backdrop-blur-sm space-y-2">
            <p className="text-sm text-ink leading-relaxed font-medium whitespace-pre-wrap">
              {draftPost.content}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-100">
              <span className="text-xs text-neutral-500 font-semibold uppercase mr-1">Targeting:</span>
              {draftPost.platforms.map((p) => (
                <span key={p} className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-medium border border-neutral-200">
                  {formatPlatformLabel(p as any)}
                </span>
              ))}
            </div>
          </div>

          {draftPost.imageUrl ? (
            <div className="border rounded-xl p-3 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center max-h-48 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draftPost.imageUrl} alt="Daily draft concept graphic" className="max-w-full max-h-40 object-contain rounded-lg shadow-sm" />
            </div>
          ) : (
            <div className="border border-dashed rounded-xl p-4 bg-neutral-50 flex items-center justify-center text-center">
              <p className="text-xs text-neutral-400">No image attached.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 h-10 px-4"
            onClick={handleDismiss}
            disabled={isPerformingAction}
          >
            <Trash2 className="mr-1.5 size-4" />
            Dismiss
          </Button>

          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4"
              onClick={handleOpenEdit}
              disabled={isPerformingAction}
            >
              <Edit className="mr-1.5 size-4" />
              Edit Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 px-4 border-forge/30 text-forge hover:bg-forge/5"
              onClick={handleOpenReschedule}
              disabled={isPerformingAction}
            >
              <Clock className="mr-1.5 size-4" />
              Schedule Post
            </Button>
            <Button
              type="button"
              className="bg-gradient-forge text-white h-10 px-5 shadow-sm"
              onClick={handlePublishInstantly}
              disabled={isPerformingAction}
            >
              <Send className="mr-1.5 size-4" />
              Publish Now
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Publication</DialogTitle>
            <DialogDescription>Choose when you want this daily draft to publish.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="daily-draft-time">Date & Time</Label>
            <Input
              id="daily-draft-time"
              type="datetime-local"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="h-11"
              disabled={isPerformingAction}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(false)} disabled={isPerformingAction}>
              Cancel
            </Button>
            <Button type="button" className="bg-gradient-forge text-white" onClick={handleSaveSchedule} disabled={isPerformingAction}>
              {isPerformingAction ? "Scheduling..." : "Confirm & Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Content Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft Content</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
              className="bg-white text-sm leading-relaxed"
              disabled={isPerformingAction}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isPerformingAction}>
              Cancel
            </Button>
            <Button type="button" className="bg-gradient-forge text-white" onClick={handleSaveEdit} disabled={isPerformingAction}>
              {isPerformingAction ? "Saving..." : "Save Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
