"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import {
  formatPlatformName,
  type AccountSummary,
} from "@/lib/accounts/serialize";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader, SectionSkeleton } from "@/components/ui/loaders";

const IMPLEMENTED_OAUTH = new Set(["linkedin"]);

function getInitials(name?: string) {
  if (!name) {
    return "?";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AccountsSettingsPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(
    null,
  );
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await apiClient<AccountSummary[]>("/api/accounts");
      setAccounts(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load accounts",
      );
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      toast.success(`${formatPlatformName(connected as never)} connected`);
    }

    if (error) {
      toast.error(error);
    }
  }, [searchParams]);

  function handleConnect(platform: string) {
    if (!IMPLEMENTED_OAUTH.has(platform)) {
      toast.message(`${formatPlatformName(platform as never)} OAuth coming soon`);
      return;
    }

    setConnectingPlatform(platform);
    window.location.href = `/api/accounts/connect/${platform}`;
  }

  async function handleDisconnect(account: AccountSummary) {
    if (!account.id) {
      return;
    }

    setDisconnectingId(account.id);

    try {
      await apiClient(`/api/accounts/${account.id}`, { method: "DELETE" });
      toast.success(`${formatPlatformName(account.platform)} disconnected`);
      await fetchAccounts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to disconnect account",
      );
    } finally {
      setDisconnectingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connected accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect social platforms to publish posts from PostForge AI.
        </p>
      </div>

      <Button
        render={<Link href="/settings" />}
        nativeButton={false}
        variant="ghost"
        className="h-11 w-fit"
      >
        Back to settings
      </Button>

      {isLoading ? (
        <SectionSkeleton rows={3} rowClassName="h-28 rounded-xl" />
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.platform} size="sm">
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex items-start gap-3">
                  <Avatar size="lg">
                    {account.avatarUrl ? (
                      <AvatarImage
                        src={account.avatarUrl}
                        alt={account.displayName ?? account.platform}
                      />
                    ) : null}
                    <AvatarFallback>
                      {getInitials(account.displayName ?? account.platform)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {formatPlatformName(account.platform)}
                    </CardTitle>
                    <CardDescription>
                      {account.isConnected
                        ? `@${account.username ?? account.displayName ?? "connected"}`
                        : "Not connected"}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={account.isConnected ? "default" : "secondary"}>
                  {account.isConnected ? "Connected" : "Not connected"}
                </Badge>
              </CardHeader>
              <CardContent>
                {account.isConnected ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11"
                    disabled={disconnectingId === account.id}
                    onClick={() => handleDisconnect(account)}
                  >
                    {disconnectingId === account.id ? (
                      <>
                        <Loader size="sm" label="Disconnecting account" />
                        Disconnecting...
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-11"
                    disabled={connectingPlatform === account.platform}
                    onClick={() => handleConnect(account.platform)}
                  >
                    {connectingPlatform === account.platform ? (
                      <>
                        <Loader size="sm" label="Connecting account" />
                        Redirecting...
                      </>
                    ) : IMPLEMENTED_OAUTH.has(account.platform) ? (
                      "Connect"
                    ) : (
                      "Coming soon"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
