# 14 — LinkedIn Developer Setup Guide (do this manually first)

Do these steps yourself in the LinkedIn Developer Portal before running the
Cursor prompt below — Cursor can't do this part for you.

## Step 1 — Confirm/create your app
1. Go to https://www.linkedin.com/developers/apps
2. Open your existing app (or click "Create app"). You'll need a LinkedIn 
   Company Page associated with the app — LinkedIn requires this even for 
   personal-profile posting apps.

## Step 2 — Add the right products
On your app's **Products** tab, request/add:
- **"Share on LinkedIn"** — lets the app post content on a member's behalf.
- **"Sign In with LinkedIn using OpenID Connect"** — lets the app get the 
  member's basic profile (name, avatar, LinkedIn user id) during connect.

Some of these require LinkedIn's review/approval before going live in 
production, but they work immediately in development mode with your own 
LinkedIn account as a test user — enough to build and test now.

## Step 3 — Set the redirect URL
On the **Auth** tab, under "OAuth 2.0 settings" → "Authorized redirect URLs 
for your app", add:
```
http://localhost:3000/api/accounts/linkedin/callback
```
Add your production URL too once you deploy, e.g.:
```
https://your-app.vercel.app/api/accounts/linkedin/callback
```

## Step 4 — Copy your credentials
Still on the **Auth** tab, copy:
- **Client ID**
- **Client Secret**

Put them in `.env.local`:
```
LINKEDIN_CLIENT_ID=<paste client id>
LINKEDIN_CLIENT_SECRET=<paste client secret>
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/accounts/linkedin/callback
```

## Step 5 — Know the scopes you need
- `openid profile email` — for identifying the connecting user
- `w_member_social` — for posting on their behalf (this is the one that 
  requires the "Share on LinkedIn" product to be approved/active)

That's it for the manual part — now run the Cursor prompt below.

# 14b — LinkedIn OAuth + Real Posting (Cursor prompt)

Run this only after finishing 14-linkedin-setup-guide.md and setting the
LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET / LINKEDIN_REDIRECT_URI env vars.

```
Implement real LinkedIn OAuth and posting (replace the simulated version 
in lib/publishing/publish-post.ts for the "linkedin" platform only — leave 
Twitter/Facebook as simulated for now):

1. lib/social/linkedin.ts:
   - getLinkedInAuthUrl(state) — builds the LinkedIn OAuth authorize URL 
     using LINKEDIN_CLIENT_ID, LINKEDIN_REDIRECT_URI, scope 
     "openid profile email w_member_social", and a random state param.
   - exchangeCodeForToken(code) — POSTs to 
     https://www.linkedin.com/oauth/v2/accessToken to exchange the code 
     for an access token (and expiry) using LINKEDIN_CLIENT_ID/SECRET.
   - getLinkedInProfile(accessToken) — GETs 
     https://api.linkedin.com/v2/userinfo (OpenID Connect endpoint) to get 
     the member's sub (LinkedIn user id), name, email, picture.
   - publishToLinkedIn(accessToken, authorSub, text, imageUrl?) — posts via 
     LinkedIn's UGC/Posts API. If imageUrl is present, first register + 
     upload the image asset per LinkedIn's image-upload flow, then 
     reference it in the post body. Return the created post's URN/URL.

2. GET /api/accounts/connect/linkedin — requires auth, generates a random 
   state, stores it in a short-lived httpOnly cookie (or signed value) tied 
   to the current user, redirects to getLinkedInAuthUrl(state).

3. GET /api/accounts/linkedin/callback — requires auth, validates the state 
   param against the stored value, calls exchangeCodeForToken(code), then 
   getLinkedInProfile(), then upserts a SocialAccount (platform: "linkedin", 
   platformUserId: sub, accessToken encrypted, tokenExpiresAt, 
   isConnected: true), redirects to /settings/accounts with a success toast 
   (pass a query param the client reads to show it).

4. Update lib/publishing/publish-post.ts: when 
   postPlatform.platform === "linkedin", call publishToLinkedIn with the 
   connected SocialAccount's decrypted access token instead of the 
   simulated logic. Validate content length against LinkedIn's 3000 char 
   limit before sending; if the token is expired, mark the PostPlatform as 
   failed with a clear errorMessage telling the user to reconnect the 
   account (LinkedIn's OAuth tokens are long-lived but this still needs 
   handling).

5. Update app/(app)/settings/accounts/page.tsx (from Module 9's page, or 
   create it now if you skipped straight here): show the LinkedIn card with 
   a "Connect LinkedIn" button when disconnected, and the connected 
   member's name/avatar with a "Disconnect" button when connected, with a 
   <Loader /> during the OAuth redirect round-trip.

6. Encrypt accessToken/refreshToken at rest using a symmetric encryption 
   helper in lib/crypto.ts (AES-256-GCM, keyed off JWT_SECRET or a new 
   TOKEN_ENCRYPTION_KEY env var — ask me which you'd prefer before picking).

Test by connecting your own LinkedIn account and publishing a real test 
post from the app to confirm the full loop works end to end.
```