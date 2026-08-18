import type { ISocialAccount } from "@/models/SocialAccount";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/models/SocialAccount";
import type mongoose from "mongoose";

export type AccountRecord = Pick<
  ISocialAccount,
  "platform" | "username" | "displayName" | "avatarUrl" | "isConnected" | "lastSyncedAt"
> & {
  _id: mongoose.Types.ObjectId;
};

export type AccountSummary = {
  id?: string;
  platform: SocialPlatform;
  isConnected: boolean;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  lastSyncedAt?: string;
};

export function toAccountSummary(
  platform: SocialPlatform,
  account?: AccountRecord | null,
): AccountSummary {
  if (!account) {
    return {
      platform,
      isConnected: false,
    };
  }

  return {
    id: account._id.toString(),
    platform,
    isConnected: account.isConnected,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    lastSyncedAt: account.lastSyncedAt?.toISOString(),
  };
}

export function buildAccountSummaries(accounts: AccountRecord[]) {
  const byPlatform = new Map(accounts.map((account) => [account.platform, account]));

  return SOCIAL_PLATFORMS.map((platform) =>
    toAccountSummary(platform, byPlatform.get(platform) ?? null),
  );
}

export function formatPlatformName(platform: SocialPlatform) {
  switch (platform) {
    case "linkedin":
      return "LinkedIn";
    case "twitter":
      return "Twitter/X";
    case "facebook":
      return "Facebook";
    default:
      return platform;
  }
}
