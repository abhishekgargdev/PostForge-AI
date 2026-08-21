import { decryptToken } from "@/lib/crypto/tokens";
import type { IPost } from "@/models/Post";
import type { IPostPlatform } from "@/models/PostPlatform";
import type { ISocialAccount } from "@/models/SocialAccount";

export type LinkedInPublishResult =
  | { success: true; platformPostId: string; platformUrl: string }
  | { success: false; code: string; message: string; field?: string };

async function checkImageReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    try {
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }
}

async function uploadImageToLinkedIn(
  accessToken: string,
  author: string,
  imageUrl: string
): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const initRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [
          "urn:li:digitalmediaRecipe:feedshare-image"
        ],
        owner: author,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent"
          }
        ]
      }
    }),
  });

  if (!initRes.ok) {
    const errorText = await initRes.text();
    throw new Error(`LinkedIn image upload initialization failed: ${errorText || initRes.statusText}`);
  }

  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const imageUrn = initData.value?.asset;

  if (!uploadUrl || !imageUrn) {
    throw new Error("LinkedIn image upload initialization did not return uploadUrl or image URN.");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`LinkedIn image binary upload failed: ${errorText || uploadRes.statusText}`);
  }

  return imageUrn;
}

export async function publishLinkedInPost(params: {
  post: any;
  postPlatform: any;
  socialAccount: any;
}): Promise<LinkedInPublishResult> {
  const { post, postPlatform, socialAccount } = params;

  // 1. Validate content
  const content = postPlatform.adaptedContent || post.content || "";
  if (!content.trim()) {
    return {
      success: false,
      code: "LINKEDIN_VALIDATION_ERROR",
      message: "LinkedIn commentary content cannot be empty",
      field: "content",
    };
  }

  if (content.length > 3000) {
    return {
      success: false,
      code: "LINKEDIN_VALIDATION_ERROR",
      message: "LinkedIn commentary exceeds the 3000 character limit",
      field: "content",
    };
  }

  // 2. Validate token
  if (!socialAccount.accessToken) {
    return {
      success: false,
      code: "LINKEDIN_VALIDATION_ERROR",
      message: "Reconnect your LinkedIn account. Access token is missing.",
      field: "socialAccount",
    };
  }

  if (socialAccount.tokenExpiresAt && new Date(socialAccount.tokenExpiresAt) <= new Date()) {
    return {
      success: false,
      code: "LINKEDIN_VALIDATION_ERROR",
      message: "Reconnect your LinkedIn account. Access token has expired.",
      field: "socialAccount",
    };
  }

  // 3. Validate author
  if (!socialAccount.platformUserId) {
    return {
      success: false,
      code: "LINKEDIN_VALIDATION_ERROR",
      message: "LinkedIn rejected this post: missing author information",
      field: "socialAccount",
    };
  }

  // 4. Validate image
  const imageUrl = post.imageUrl;
  if (imageUrl) {
    const reachable = await checkImageReachable(imageUrl);
    if (!reachable) {
      return {
        success: false,
        code: "LINKEDIN_VALIDATION_ERROR",
        message: "Attached image URL is unreachable or invalid",
        field: "imageUrl",
      };
    }
  }

  const decryptedToken = decryptToken(socialAccount.accessToken);
  const author = socialAccount.platformUserId.startsWith("urn:li:person:")
    ? socialAccount.platformUserId
    : `urn:li:person:${socialAccount.platformUserId}`;

  let imageUrn: string | undefined = undefined;

  if (imageUrl) {
    try {
      imageUrn = await uploadImageToLinkedIn(decryptedToken, author, imageUrl);
    } catch (err) {
      console.error("LinkedIn image upload failed, falling back to text-only post link commentary:", err);
      // Fallback is handled by adding URL to commentary text in mapToLinkedInDTO
    }
  }

  let specificContent: any = {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: {
        text: content,
      },
      shareMediaCategory: "NONE",
    },
  };

  if (post.postType === "article" && post.articleUrl) {
    specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            description: {
              text: post.articleDescription || content,
            },
            originalUrl: post.articleUrl,
            title: {
              text: post.articleTitle || "Article",
            },
          },
        ],
      },
    };
  } else if (imageUrn) {
    specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: content,
        },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            description: {
              text: post.topic || "Post Image",
            },
            media: imageUrn,
            title: {
              text: post.topic || "Post Image",
            },
          },
        ],
      },
    };
  } else if (imageUrl) {
    // Fallback: append image URL to text commentary
    specificContent["com.linkedin.ugc.ShareContent"].shareCommentary.text = `${content}\n\n${imageUrl}`;
  }

  const payload = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent,
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const endpoint = "https://api.linkedin.com/v2/ugcPosts";
  const timestamp = new Date().toISOString();
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(payload),
    });

    const requestId = response.headers.get("x-restli-gateway-error-id") || `req-${Date.now()}`;

    if (!response.ok) {
      const errorText = await response.text();
      let readableMessage = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        readableMessage = errorJson.message || errorJson.error_description || readableMessage;
      } catch {
        // Keep original text
      }

      console.error(
        `[LINKEDIN_PUBLISH_FAILED] Timestamp: ${timestamp}, RequestId: ${requestId}, PostId: ${post._id}, Status: ${response.status}, Error: ${readableMessage}`
      );

      return {
        success: false,
        code: "LINKEDIN_API_ERROR",
        message: `LinkedIn rejected this post: ${readableMessage}`,
      };
    }

    const postId =
      response.headers.get("x-restli-id") ??
      response.headers.get("x-linkedin-id") ??
      `linkedin-${Date.now()}`;

    console.log(
      `[LINKEDIN_PUBLISH_SUCCESS] Timestamp: ${timestamp}, RequestId: ${requestId}, PostId: ${post._id}, PlatformPostId: ${postId}`
    );

    return {
      success: true,
      platformPostId: postId,
      platformUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
    };
  } catch (fetchErr: any) {
    const message = fetchErr instanceof Error ? fetchErr.message : "Network request failed";
    console.error(
      `[LINKEDIN_PUBLISH_NETWORK_ERROR] Timestamp: ${timestamp}, PostId: ${post._id}, Error: ${message}`
    );

    return {
      success: false,
      code: "LINKEDIN_NETWORK_ERROR",
      message: `LinkedIn publish failed: ${message}`,
    };
  }
}
