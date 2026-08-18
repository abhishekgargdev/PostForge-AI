"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import type { DayPreferenceResponse } from "@/lib/day-preferences/serialize";
import {
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_VALUES,
  type DayOfWeek,
} from "@/lib/content-preferences/types";
import {
  POST_GOAL_LABELS,
  POST_GOALS,
  type PostGoal,
} from "@/lib/validation/ai";
import { POST_TONES, type PostTone } from "@/lib/validation/posts";
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
import { cn } from "@/lib/utils";

type DayPreferencesListResponse = {
  timezone: string;
  todayDayOfWeek: DayOfWeek;
  todayDayLabel: string;
  preferences: DayPreferenceResponse[];
};

type EditFormState = {
  topic: string;
  goal: PostGoal | "";
  tone: PostTone;
  isActive: boolean;
};

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type SelectionChipProps = {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

function SelectionChip({
  label,
  selected,
  disabled,
  onSelect,
}: SelectionChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-2 border-forge bg-forge/10 text-ink shadow-sm"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {label}
    </button>
  );
}

const emptyForm: EditFormState = {
  topic: "",
  goal: "",
  tone: "professional",
  isActive: true,
};

export function ContentCalendarSettings() {
  const [preferences, setPreferences] = useState<DayPreferenceResponse[]>([]);
  const [timezone, setTimezone] = useState("UTC");
  const [todayDayOfWeek, setTodayDayOfWeek] = useState<DayOfWeek>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<DayOfWeek | null>(null);
  const [form, setForm] = useState<EditFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const preferenceByDay = useMemo(() => {
    return new Map(preferences.map((preference) => [preference.dayOfWeek, preference]));
  }, [preferences]);

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await apiClient<DayPreferencesListResponse>(
        "/api/day-preferences",
      );
      setPreferences(data.preferences);
      setTimezone(data.timezone);
      setTodayDayOfWeek(data.todayDayOfWeek);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load content calendar",
      );
      setPreferences([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  function openEditDialog(dayOfWeek: DayOfWeek) {
    const existing = preferenceByDay.get(dayOfWeek);

    setEditingDay(dayOfWeek);
    setForm(
      existing
        ? {
            topic: existing.topic,
            goal: existing.goal,
            tone: existing.tone,
            isActive: existing.isActive,
          }
        : { ...emptyForm },
    );
  }

  function closeEditDialog() {
    if (isSaving || isDeleting) {
      return;
    }

    setEditingDay(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (editingDay === null) {
      return;
    }

    if (!form.topic.trim()) {
      toast.error("Topic is required.");
      return;
    }

    if (!form.goal) {
      toast.error("Select a goal for this day.");
      return;
    }

    setIsSaving(true);

    try {
      const saved = await apiClient<DayPreferenceResponse>(
        `/api/day-preferences/${editingDay}`,
        {
          method: "PUT",
          body: JSON.stringify({
            topic: form.topic.trim(),
            goal: form.goal,
            tone: form.tone,
            isActive: form.isActive,
          }),
        },
      );

      setPreferences((current) => {
        const next = current.filter(
          (preference) => preference.dayOfWeek !== saved.dayOfWeek,
        );
        return [...next, saved].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      });

      toast.success(`${DAY_OF_WEEK_LABELS[editingDay]} preference saved`);
      setEditingDay(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save preference",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearDay() {
    if (editingDay === null) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiClient(`/api/day-preferences/${editingDay}`, {
        method: "DELETE",
      });

      setPreferences((current) =>
        current.filter((preference) => preference.dayOfWeek !== editingDay),
      );
      toast.success(`${DAY_OF_WEEK_LABELS[editingDay]} default cleared`);
      setEditingDay(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to clear preference",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <SectionSkeleton rows={1} rowClassName="h-8 w-56" />
        <SectionSkeleton rows={7} rowClassName="h-28 rounded-xl md:hidden" />
        <SectionSkeleton
          rows={1}
          rowClassName="hidden h-40 rounded-xl md:block"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Content calendar
        </h1>
        <p className="text-sm text-muted-foreground">
          Set a default topic, goal, and tone for each day. Today is{" "}
          {DAY_OF_WEEK_LABELS[todayDayOfWeek]} in your timezone ({timezone}).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        {DAY_OF_WEEK_VALUES.map((dayOfWeek) => {
          const preference = preferenceByDay.get(dayOfWeek);
          const isToday = dayOfWeek === todayDayOfWeek;

          return (
            <Card
              key={dayOfWeek}
              size="sm"
              className={cn(isToday && "border-forge/40 ring-1 ring-forge/20")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {DAY_OF_WEEK_LABELS[dayOfWeek]}
                  {isToday ? (
                    <span className="ml-2 text-xs font-normal text-forge">
                      Today
                    </span>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  {preference
                    ? preference.isActive
                      ? "Default set"
                      : "Default paused"
                    : "No default set"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {preference ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-ink">{preference.topic}</p>
                    <p className="text-muted-foreground">
                      {preference.goalLabel} · {capitalize(preference.tone)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No default set
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => openEditDialog(dayOfWeek)}
                >
                  Edit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        render={<Link href="/settings" />}
        nativeButton={false}
        variant="ghost"
        className="h-11 w-fit"
      >
        Back to More
      </Button>

      <Dialog
        open={editingDay !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDay !== null
                ? `${DAY_OF_WEEK_LABELS[editingDay]} default`
                : "Edit day"}
            </DialogTitle>
            <DialogDescription>
              These defaults pre-fill the post wizard on matching days.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="day-topic">Topic</Label>
              <Input
                id="day-topic"
                value={form.topic}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    topic: event.target.value,
                  }))
                }
                className="h-11"
                placeholder="Motivational tips for founders..."
                disabled={isSaving || isDeleting}
              />
            </div>

            <div className="grid gap-3">
              <Label>Goal</Label>
              <div className="flex flex-wrap gap-2">
                {POST_GOALS.map((option) => (
                  <SelectionChip
                    key={option}
                    label={POST_GOAL_LABELS[option]}
                    selected={form.goal === option}
                    disabled={isSaving || isDeleting}
                    onSelect={() =>
                      setForm((current) => ({ ...current, goal: option }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Tone</Label>
              <div className="flex flex-wrap gap-2">
                {POST_TONES.map((option) => (
                  <SelectionChip
                    key={option}
                    label={capitalize(option)}
                    selected={form.tone === option}
                    disabled={isSaving || isDeleting}
                    onSelect={() =>
                      setForm((current) => ({ ...current, tone: option }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="day-active">Use this default</Label>
                <p className="text-xs text-muted-foreground">
                  Turn off to pause without deleting your saved theme.
                </p>
              </div>
              <Switch
                id="day-active"
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
                }
                disabled={isSaving || isDeleting}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              disabled={
                isSaving || isDeleting || editingDay === null || !preferenceByDay.has(editingDay)
              }
              onClick={() => void handleClearDay()}
            >
              {isDeleting ? (
                <>
                  <Loader size="sm" label="Clearing day preference" />
                  Clearing...
                </>
              ) : (
                "Clear default"
              )}
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={isSaving || isDeleting}
                onClick={closeEditDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11"
                disabled={isSaving || isDeleting}
                onClick={() => void handleSave()}
              >
                {isSaving ? (
                  <>
                    <Loader size="sm" label="Saving day preference" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
