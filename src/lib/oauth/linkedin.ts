import {
  getLinkedInRedirectUri,
  LINKEDIN_SCOPES,
  validatePlatformCharacterLimit,
} from "@/lib/oauth/platforms";
import { encryptToken } from "@/lib/crypto/tokens";

type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

type LinkedInUserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
};

function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error(
      "LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getLinkedInRedirectUri(appUrl),
  };
}

export function buildLinkedInAuthorizationUrl(input: {
  state: string;
  codeChallenge?: string;
}) {
  const { clientId, redirectUri } = getLinkedInConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: input.state,
    scope: LINKEDIN_SCOPES.join(" "),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCode(input: {
  code: string;
  codeVerifier?: string;
}) {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await response.json()) as LinkedInTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ?? json.error ?? "LinkedIn token exchange failed.",
    );
  }

  return json;
}

export async function fetchLinkedInUserInfo(accessToken: string) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const json = (await response.json()) as LinkedInUserInfo & {
    message?: string;
  };

  if (!response.ok || !json.sub) {
    throw new Error(json.message ?? "Unable to fetch LinkedIn profile.");
  }

  return json;
}

export function buildLinkedInAccountFields(input: {
  token: LinkedInTokenResponse;
  profile: LinkedInUserInfo;
}) {
  const displayName =
    input.profile.name ??
    [input.profile.given_name, input.profile.family_name]
      .filter(Boolean)
      .join(" ") ??
    "LinkedIn User";

  return {
    platformUserId: input.profile.sub,
    username: input.profile.email ?? input.profile.sub,
    displayName,
    avatarUrl: input.profile.picture,
    accessToken: encryptToken(input.token.access_token),
    refreshToken: input.token.refresh_token
      ? encryptToken(input.token.refresh_token)
      : undefined,
    tokenExpiresAt: new Date(Date.now() + input.token.expires_in * 1000),
    isConnected: true,
    lastSyncedAt: new Date(),
  };
}

async function uploadImageToLinkedIn(
  accessToken: string,
  author: string,
  imageUrl: string,
): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202405",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: author,
      },
    }),
  });

  if (!initRes.ok) {
    const errorText = await initRes.text();
    throw new Error(`LinkedIn image upload initialization failed: ${errorText || initRes.statusText}`);
  }

  const initData = await initRes.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;

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

export async function publishLinkedInPost(input: {
  accessToken: string;
  platformUserId: string;
  content: string;
  imageUrl?: string;
}) {
  validatePlatformCharacterLimit("linkedin", input.content);

  const author = input.platformUserId.startsWith("urn:li:person:")
    ? input.platformUserId
    : `urn:li:person:${input.platformUserId}`;

  let contentPayload: any = {};
  let finalContent = input.content;

  if (input.imageUrl) {
    try {
      const imageUrn = await uploadImageToLinkedIn(input.accessToken, author, input.imageUrl);
      contentPayload = {
        content: {
          media: {
            id: imageUrn,
          },
        },
      };
    } catch (err) {
      console.error("LinkedIn image upload failed, falling back to text-only post:", err);
      finalContent = `${input.content}\n\n${input.imageUrl}`;
    }
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202405",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      commentary: finalContent,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
      ...contentPayload,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `LinkedIn publish failed with status ${response.status}.`,
    );
  }

  const postId =
    response.headers.get("x-restli-id") ??
    response.headers.get("x-linkedin-id") ??
    `linkedin-${Date.now()}`;

  return {
    platformPostId: postId,
    platformUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`,
  };
}
