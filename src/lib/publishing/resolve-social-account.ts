import mongoose from "mongoose";

import SocialAccount, { type SocialPlatform } from "@/models/SocialAccount";

import { getOrCreateSimulatedSocialAccount } from "@/lib/publishing/simulated-social-account";

export async function resolveSocialAccountForPlatform(
  userId: string,
  platform: SocialPlatform,
) {
  const connected = await SocialAccount.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    platform,
    isConnected: true,
  });

  if (connected) {
    return connected;
  }

  return getOrCreateSimulatedSocialAccount(userId, platform);
}
