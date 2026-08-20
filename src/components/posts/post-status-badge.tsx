import {
  AlertCircleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  FilePenLineIcon,
  LoaderCircleIcon,
  InboxIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PostStatus } from "@/models/Post";

const statusConfig: Record<
  PostStatus,
  {
    label: string;
    icon: typeof FilePenLineIcon;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: FilePenLineIcon,
    className: "border-neutral-200 bg-neutral-100 text-neutral-700",
  },
  generated: {
    label: "Generated",
    icon: FilePenLineIcon,
    className: "border-neutral-200 bg-neutral-100 text-neutral-700",
  },
  selected: {
    label: "Selected",
    icon: FilePenLineIcon,
    className: "border-neutral-200 bg-neutral-100 text-neutral-700",
  },
  queued: {
    label: "Queued",
    icon: InboxIcon,
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  confirmed: {
    label: "Confirmed",
    icon: InboxIcon,
    className: "border-teal-200 bg-teal-50 text-teal-700",
  },
  scheduled: {
    label: "Scheduled",
    icon: CalendarClockIcon,
    className: "border-circuit/30 bg-circuit/10 text-circuit",
  },
  due: {
    label: "Due",
    icon: CalendarClockIcon,
    className: "border-circuit/30 bg-circuit/10 text-circuit",
  },
  publishing: {
    label: "Publishing",
    icon: LoaderCircleIcon,
    className: "border-circuit/30 bg-circuit/10 text-circuit",
  },
  posted: {
    label: "Posted",
    icon: CheckCircle2Icon,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  published: {
    label: "Published",
    icon: CheckCircle2Icon,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "Failed",
    icon: AlertCircleIcon,
    className: "border-ember/30 bg-ember/10 text-ember",
  },
  retry: {
    label: "Retry",
    icon: LoaderCircleIcon,
    className: "border-circuit/30 bg-circuit/10 text-circuit",
  },
};

type PostStatusBadgeProps = {
  status: PostStatus;
  className?: string;
};

export function PostStatusBadge({ status, className }: PostStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 capitalize", config.className, className)}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      {config.label}
    </Badge>
  );
}
