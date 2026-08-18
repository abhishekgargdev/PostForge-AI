import { cn } from "@/lib/utils";
import { formatPlatformLabel } from "@/lib/posts/serialize";
import type { SocialPlatform } from "@/models/SocialAccount";

const platformStyles: Record<
  SocialPlatform,
  { initial: string; circleClass: string; activeClass: string }
> = {
  linkedin: {
    initial: "in",
    circleClass: "bg-[#0A66C2] text-white",
    activeClass: "border-[#0A66C2] bg-[#0A66C2]/10 text-ink",
  },
  twitter: {
    initial: "X",
    circleClass: "bg-ink text-white",
    activeClass: "border-ink bg-ink/5 text-ink",
  },
  facebook: {
    initial: "f",
    circleClass: "bg-[#1877F2] text-white",
    activeClass: "border-[#1877F2] bg-[#1877F2]/10 text-ink",
  },
};

type PlatformChipProps = {
  platform: SocialPlatform;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export function PlatformChip({
  platform,
  selected,
  disabled,
  onToggle,
}: PlatformChipProps) {
  const styles = platformStyles[platform];

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? cn("border-2 shadow-sm", styles.activeClass)
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold uppercase",
          styles.circleClass,
        )}
        aria-hidden
      >
        {styles.initial}
      </span>
      <span className="truncate">{formatPlatformLabel(platform)}</span>
    </button>
  );
}
