import type { IPost } from "@/models/Post";
import type { IPostPlatform } from "@/models/PostPlatform";
import type { ISocialAccount } from "@/models/SocialAccount";

export type LinkedInPostDTO = {
  author: string;
  commentary: string;
  visibility: "PUBLIC" | "CONNECTIONS";
  distribution: {
    feedDistribution: "MAIN_FEED" | "NONE";
    targetEntities: any[];
    thirdPartyDistributionChannels: any[];
  };
  lifecycleState: "PUBLISHED" | "DRAFT";
  isReshareDisabledByAuthor: boolean;
  content?: {
    media: {
      id: string;
    };
  };
};

export function mapToLinkedInDTO(
  post: IPost,
  postPlatform: IPostPlatform,
  socialAccount: ISocialAccount,
  imageUrn?: string
): LinkedInPostDTO {
  const author = socialAccount.platformUserId.startsWith("urn:li:person:")
    ? socialAccount.platformUserId
    : `urn:li:person:${socialAccount.platformUserId}`;

  const dto: LinkedInPostDTO = {
    author,
    commentary: postPlatform.adaptedContent || post.content,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (imageUrn) {
    dto.content = {
      media: {
        id: imageUrn,
      },
    };
  }

  return dto;
}
