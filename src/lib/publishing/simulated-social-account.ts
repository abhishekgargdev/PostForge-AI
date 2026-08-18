import mongoose from "mongoose";

import SocialAccount, { type SocialPlatform } from "@/models/SocialAccount";

export async function getOrCreateSimulatedSocialAccount(
  userId: string,
  platform: SocialPlatform,
) {
  const platformUserId = `simulated-${platform}`;

  return SocialAccount.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(userId),
      platform,
      platformUserId,
    },
    {
      $setOnInsert: {
        userId: new mongoose.Types.ObjectId(userId),
        platform,
        platformUserId,
        username: `simulated-${platform}`,
        displayName: `Simulated ${platform}`,
        accessToken: "simulated-access-token",
        isConnected: false,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
}
