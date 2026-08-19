"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Sparkles, HelpCircle } from "lucide-react";

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
import { Loader, SectionSkeleton } from "@/components/ui/loaders";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";

type QuestionResponse = {
  id: string;
  text: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function QuestionsSettings() {
  const [questions, setQuestions] = useState<QuestionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingQuestion, setEditingQuestion] = useState<QuestionResponse | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<QuestionResponse[]>("/api/questions");
      setQuestions(res);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load questions",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  function openAddDialog() {
    setDialogMode("add");
    setEditingQuestion(null);
    setQuestionText("");
    setIsActive(true);
    setIsDialogOpen(true);
  }

  function openEditDialog(q: QuestionResponse) {
    setDialogMode("edit");
    setEditingQuestion(q);
    setQuestionText(q.text);
    setIsActive(q.isActive);
    setIsDialogOpen(true);
  }

  async function handleSave() {
    if (!questionText.trim()) {
      toast.error("Question text is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (dialogMode === "add") {
        const newQ = await apiClient<QuestionResponse>("/api/questions", {
          method: "POST",
          body: JSON.stringify({ text: questionText.trim(), isActive }),
        });
        setQuestions((prev) => [newQ, ...prev]);
        toast.success("Question added successfully");
      } else if (dialogMode === "edit" && editingQuestion) {
        const updatedQ = await apiClient<QuestionResponse>(
          `/api/questions/${editingQuestion.id}`,
          {
            method: "PUT",
            body: JSON.stringify({ text: questionText.trim(), isActive }),
          },
        );
        setQuestions((prev) =>
          prev.map((q) => (q.id === updatedQ.id ? updatedQ : q)),
        );
        toast.success("Question updated successfully");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save question",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(q: QuestionResponse, checked: boolean) {
    try {
      const updatedQ = await apiClient<QuestionResponse>(`/api/questions/${q.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: checked }),
      });
      setQuestions((prev) =>
        prev.map((item) => (item.id === updatedQ.id ? updatedQ : item)),
      );
      toast.success(checked ? "Question activated" : "Question paused");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to toggle status",
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      await apiClient(`/api/questions/${id}`, { method: "DELETE" });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete question",
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
          <h1 className="text-2xl font-semibold tracking-tight">Questions List</h1>
          <p className="text-sm text-muted-foreground">
            Configure questions that you want PostForge AI to ask you. Daily AI drafts and prompts will be based on these active questions.
          </p>
        </div>
        <Button
          type="button"
          onClick={openAddDialog}
          className="h-11 bg-gradient-forge text-white"
        >
          <Plus className="mr-2 size-4" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions added yet"
          description="Create questions related to your posts so PostForge can ask you them daily and forge perfect content."
          action={
            <Button type="button" onClick={openAddDialog} className="h-11">
              Add your first question
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {questions.map((q) => (
            <Card key={q.id} size="sm" className="transition-all hover:shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-base font-medium text-ink">{q.text}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {q.isActive ? "Active (Used for daily prompt generation)" : "Paused"}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${q.id}`} className="text-xs text-muted-foreground">
                      Active
                    </Label>
                    <Switch
                      id={`active-${q.id}`}
                      checked={q.isActive}
                      onCheckedChange={(checked) => void handleToggleActive(q, checked)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => openEditDialog(q)}
                  >
                    <Edit2 className="size-4 text-neutral-500" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                    onClick={() => void handleDelete(q.id)}
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
              {dialogMode === "add" ? "Add New Question" : "Edit Question"}
            </DialogTitle>
            <DialogDescription>
              Write a question related to your industry, daily work, or insights to help generate posts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="question-text">Question Text</Label>
              <Input
                id="question-text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What is your top productivity tip for this week?"
                className="h-11"
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="q-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Include this question in the pool of daily prompt suggestions.
                </p>
              </div>
              <Switch
                id="q-active"
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
                  <Loader size="sm" label="Saving question" />
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
