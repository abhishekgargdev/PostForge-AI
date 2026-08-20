"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Sparkles, BookOpen } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader, SectionSkeleton } from "@/components/ui/loaders";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";

type TopicResponse = {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function TopicsSettings() {
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingTopic, setEditingTopic] = useState<TopicResponse | null>(null);
  const [topicText, setTopicText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTopics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<TopicResponse[]>("/api/topics");
      setTopics(res);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load topics",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTopics();
  }, [fetchTopics]);

  function openAddDialog() {
    setDialogMode("add");
    setEditingTopic(null);
    setTopicText("");
    setIsActive(true);
    setIsDialogOpen(true);
  }

  function openEditDialog(t: TopicResponse) {
    setDialogMode("edit");
    setEditingTopic(t);
    setTopicText(t.text);
    setIsActive(t.isActive);
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!topicText.trim()) {
      toast.error("Topic text is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (dialogMode === "add") {
        const newTopics = await apiClient<TopicResponse[]>("/api/topics", {
          method: "POST",
          body: JSON.stringify({ text: topicText.trim(), isActive }),
        });
        setTopics((prev) => [...newTopics, ...prev]);
        toast.success(`${newTopics.length} topic(s) added successfully`);
      } else if (dialogMode === "edit" && editingTopic) {
        const updatedTopic = await apiClient<TopicResponse>(
          `/api/topics/${editingTopic.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ text: topicText.trim(), isActive }),
          },
        );
        setTopics((prev) =>
          prev.map((t) => (t.id === updatedTopic.id ? updatedTopic : t)),
        );
        toast.success("Topic updated successfully");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save topic",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(t: TopicResponse, checked: boolean) {
    try {
      const updatedTopic = await apiClient<TopicResponse>(`/api/topics/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: checked }),
      });
      setTopics((prev) =>
        prev.map((item) => (item.id === updatedTopic.id ? updatedTopic : item)),
      );
      toast.success(checked ? "Topic activated" : "Topic paused");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to toggle status",
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this topic?")) {
      return;
    }

    try {
      await apiClient(`/api/topics/${id}`, { method: "DELETE" });
      setTopics((prev) => prev.filter((t) => t.id !== id));
      toast.success("Topic deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete topic",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <SectionSkeleton rows={1} rowClassName="h-8 w-56" />
        <SectionSkeleton rows={4} rowClassName="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Topic List</h1>
          <p className="text-sm text-muted-foreground">
            Configure topics (e.g. *Trending technologies*, *DSA based questions*, *Tips & Tricks*) that you want PostForge AI to base daily drafts and suggestions on.
          </p>
        </div>
        <Button
          type="button"
          onClick={openAddDialog}
          className="h-11 bg-gradient-forge text-white"
        >
          <Plus className="mr-2 size-4" />
          Add Topic
        </Button>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No topics added yet"
          description="Create topic ideas so PostForge can automatically generate professional copy and custom AI visuals for them daily."
          action={
            <Button type="button" onClick={openAddDialog} className="h-11">
              Add your first topic
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {topics.map((t) => (
            <Card key={t.id} size="sm" className="transition-all hover:shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-base font-medium text-ink">{t.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {t.isActive ? "Active (Used for daily auto-generations)" : "Paused"}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${t.id}`} className="text-xs text-muted-foreground">
                      Active
                    </Label>
                    <Switch
                      id={`active-${t.id}`}
                      checked={t.isActive}
                      onCheckedChange={(checked) => void handleToggleActive(t, checked)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => openEditDialog(t)}
                  >
                    <Edit2 className="size-4 text-neutral-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                    onClick={() => void handleDelete(t.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        render={<Link href="/settings" />}
        nativeButton={false}
        variant="ghost"
        className="h-11 w-fit"
      >
        Back to More
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Add New Topic" : "Edit Topic"}
            </DialogTitle>
            <DialogDescription>
              Specify a topic category, news theme, or specific subject for your daily post drafts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="topic-text">
                {dialogMode === "add" ? "Topic Titles / Themes (separate with commas or newlines)" : "Topic Title / Theme"}
              </Label>
              {dialogMode === "add" ? (
                <Textarea
                  id="topic-text"
                  value={topicText}
                  onChange={(e) => setTopicText(e.target.value)}
                  placeholder="e.g. Trending technologies, DSA based questions&#10;Productivity tips, Cloud Computing"
                  rows={4}
                  disabled={isSaving}
                />
              ) : (
                <Input
                  id="topic-text"
                  value={topicText}
                  onChange={(e) => setTopicText(e.target.value)}
                  placeholder="e.g. Trending technologies"
                  className="h-11"
                  disabled={isSaving}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="t-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Include this topic in the pool for daily AI auto-generation.
                </p>
              </div>
              <Switch
                id="t-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 bg-gradient-forge text-white"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader size="sm" label="Saving topic" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
