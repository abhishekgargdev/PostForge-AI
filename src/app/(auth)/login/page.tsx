import { Suspense } from "react";

import { GradientText } from "@/components/ui/gradient-text";
import { cn } from "@/lib/utils";

import LoginLoading from "./loading";
import { LoginForm } from "./login-form";

function LoginBrandPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "bg-gradient-forge text-white",
        compact
          ? "px-4 py-8 md:hidden"
          : "relative hidden flex-col justify-between p-10 md:flex md:w-1/2 md:p-12 lg:p-16",
      )}
    >
      <div className={cn("space-y-4", compact && "text-center")}>
        <GradientText
          as="h1"
          className={cn(
            "font-heading font-bold [background-image:linear-gradient(135deg,#FFFFFF_0%,#22D3EE_100%)]",
            compact ? "text-3xl" : "text-4xl lg:text-5xl",
          )}
        >
          PostForge AI
        </GradientText>
        <p
          className={cn(
            "text-white/85",
            compact
              ? "mx-auto max-w-xs text-sm"
              : "max-w-md text-base lg:text-lg",
          )}
        >
          Forge, schedule, and publish social content across platforms from one
          workspace.
        </p>
      </div>

      {!compact ? (
        <p className="text-sm text-white/70">
          Multi-platform scheduling with AI-assisted copy and media.
        </p>
      ) : null}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <LoginBrandPanel compact />
      <LoginBrandPanel />

      <div className="flex flex-1 flex-col justify-center px-4 py-8 md:w-1/2 md:px-10 lg:px-16">
        <Suspense fallback={<LoginLoading />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
