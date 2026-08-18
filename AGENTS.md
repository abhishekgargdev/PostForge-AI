<!-- BEGIN:nextjs-agent-rules -->

We are building "PostForge AI" — a multi-platform social media content and 
scheduling tool. Stack and rules for EVERY module you build:

TECH STACK
- Next.js 14 App Router + TypeScript (strict mode)
- Tailwind CSS + shadcn/ui components (use existing shadcn components before 
  writing custom UI)
- MongoDB + Mongoose for all data (no Prisma, no SQL)
- Auth is custom: bcrypt-hashed passwords + JWT stored in an httpOnly cookie. 
  Do NOT use NextAuth or any third-party auth library.
- AI calls go through @google/generative-ai using a key-rotation utility 
  (lib/ai/gemini-client.ts) that cycles across GEMINI_API_KEY_1..6 and 
  retries the next key on rate-limit/quota errors.
- All images (AI-generated and user-uploaded) are stored in Cloudinary via 
  the CLOUDINARY_URL env var — never store image bytes/base64 in MongoDB, 
  only store the returned Cloudinary secure_url (and public_id, so we can 
  delete it later) on the relevant document.
- Deployment target is Vercel. Anything that assumes a long-running Node 
  process (in-process cron, in-memory queues, local filesystem writes 
  outside of /tmp) will NOT work in production — flag it if a module 
  prompt seems to need one, instead of silently building it that way.

CONVENTIONS
- API routes live under app/api/**/route.ts and always return JSON in this shape:
  success: { success: true, data: <payload> }
  error:   { success: false, error: { message: string, code?: string } }
- Mongoose models live in models/*.ts, one file per model, exported as a 
  singleton pattern (avoid model-overwrite errors on hot reload).
- Shared server logic (db connect, auth helpers, ai client) lives in lib/*.
- Client components fetch data via a small typed fetch wrapper in 
  lib/api-client.ts, never raw fetch scattered around.
- Validate all API input with Zod schemas colocated in the route file or in 
  lib/validation/*.
- Protect private API routes with a requireAuth() helper that reads/verifies 
  the JWT cookie and throws a 401 JSON response if invalid.

DESIGN — MOBILE FIRST
- Design and build for a ~375px viewport first, then add sm:/md:/lg: 
  breakpoints for larger screens. Never build desktop-first and shrink down.
- Primary navigation must collapse into a bottom tab bar or slide-out sheet 
  on mobile, and a sidebar on desktop (md: and up).
- Touch targets at least 44px tall. No hover-only interactions on mobile.

LOADING STATES
- Every page must show a loading UI on first load (Next.js loading.tsx with 
  shadcn <Skeleton> matching the eventual layout, not a generic spinner).
- Every API-triggering action (button click, form submit, tab switch that 
  fetches data) must show a local loading state — disable the trigger, show 
  a spinner/skeleton in place, never leave the UI silently frozen.
- Use a shared <Loader /> component (spinner) and <SectionSkeleton /> 
  component for section-level loading, both in components/ui/loaders.tsx, 
  and reuse them everywhere instead of ad hoc spinners.

GENERAL
- Keep each module self-contained: don't build features from a later module.
- After each module, tell me which files you created/changed and how to 
  manually test it.
- Ask me before adding any new npm package not already listed in the setup 
  commands.

<!-- END:nextjs-agent-rules -->
