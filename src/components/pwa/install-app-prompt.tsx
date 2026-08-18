"use client";

import { DownloadIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SESSION_DISMISS_KEY = "postforge-pwa-install-dismissed";

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
      return;
    }

    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  function dismiss() {
    window.sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setVisible(false);
    setDeferredPrompt(null);
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      dismiss();
      setIsInstalling(false);
    }
  }

  if (!visible || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 z-50 px-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:px-0",
      )}
      role="region"
      aria-label="Install app prompt"
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-ink">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-forge/10 text-forge">
            <DownloadIcon className="size-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-ink dark:text-cloud">
              Install PostForge
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Add PostForge AI to your home screen for quick access.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Dismiss install prompt"
            onClick={dismiss}
          >
            <XIcon className="size-4" strokeWidth={2} />
          </Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={dismiss}
          >
            Not now
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 bg-gradient-forge text-white hover:opacity-90"
            disabled={isInstalling}
            onClick={handleInstall}
          >
            {isInstalling ? "Installing..." : "Install App"}
          </Button>
        </div>
      </div>
    </div>
  );
}
