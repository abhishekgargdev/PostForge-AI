"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LayoutTemplateIcon } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import {
  formatTemplatePlatform,
  type TemplateResponse,
} from "@/lib/templates/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionSkeleton } from "@/components/ui/loaders";
import { SOCIAL_PLATFORMS } from "@/types/platforms";

function truncate(text: string, length = 140) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trim()}...`;
}

function buildEditorHref(template: TemplateResponse) {
  const params = new URLSearchParams({
    prompt: template.promptTemplate,
  });

  if (
    template.platform !== "all" &&
    SOCIAL_PLATFORMS.includes(template.platform)
  ) {
    params.set("platform", template.platform);
  }

  return `/posts/new?${params.toString()}`;
}

export function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await apiClient<TemplateResponse[]>("/api/templates");
      setTemplates(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load templates",
      );
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  function handleUseTemplate(template: TemplateResponse) {
    setUsingTemplateId(template.id);
    router.push(buildEditorHref(template));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Reusable AI prompts for faster post creation.
        </p>
      </div>

      <Button
        render={<Link href="/settings" />}
        nativeButton={false}
        variant="ghost"
        className="h-11 w-fit"
      >
        Back to More
      </Button>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SectionSkeleton
              key={index}
              rows={1}
              rowClassName="h-56 rounded-xl"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplateIcon className="size-4" />
              No templates yet
            </CardTitle>
            <CardDescription>
              Public templates and your private templates will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/posts/new" />}
              nativeButton={false}
              className="h-11"
            >
              Create a post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} size="sm" className="flex flex-col">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">
                      {formatTemplatePlatform(template.platform)}
                    </Badge>
                    {template.isPublic ? (
                      <Badge variant="secondary">Public</Badge>
                    ) : (
                      <Badge variant="secondary">Private</Badge>
                    )}
                  </div>
                </div>
                {template.category ? (
                  <CardDescription>{template.category}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {truncate(template.promptTemplate)}
                </p>
                {template.contentExample ? (
                  <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    {truncate(template.contentExample, 120)}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  className="h-11 w-full"
                  disabled={usingTemplateId === template.id}
                  onClick={() => handleUseTemplate(template)}
                >
                  {usingTemplateId === template.id
                    ? "Opening editor..."
                    : "Use Template"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
