# PostForge AI 🚀

PostForge AI is a premium multi-platform social media content generator and scheduler designed to help creators draft once and publish everywhere. Utilizing Google Gemini AI, PostForge automatically tailors content for LinkedIn, X (Twitter), and Facebook while preserving your unique brand voice.

---

## 🌟 Core Features

- **Draft Once, Publish Everywhere**: Write a single draft topic or goal and let AI adapt the tone, structure, and hashtags for each social platform.
- **AI-Powered Generation**: Integrated with Google Gemini API for fast, high-quality, and contextual social copies.
- **Custom Post Scheduling**: Choose exact dates/times or publish instantly from a single unified workspace.
- **Media Asset Library**: Upload, store, and manage your image media via Cloudinary integration.
- **PWA Capabilities**: Fully installable offline-capable Progressive Web App with support for push notifications and home-screen access.
- **Responsive Mobile-First Design**: Seamless navigation collapsing into a bottom tab bar on mobile and a full sidebar on desktop.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14 App Router](https://nextjs.org/) + TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/)
- **Authentication**: Custom JWT-based stateless authentication (httpOnly cookies) with `bcryptjs` password hashing.
- **AI Integration**: Custom rotation client (`@google/generative-ai`) balancing API calls across 6 Gemini keys to circumvent rate limits.
- **Media Storage**: [Cloudinary](https://cloudinary.com/) (image upload, optimization, and secure URL storage).
- **Service Worker / PWA**: `@ducanh2912/next-pwa` for manifest management and asset/API response caching.

---

## 🚀 Getting Started

### 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [MongoDB](https://www.mongodb.com/) installed locally.

### 2. Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/postforge-ai

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Gemini Key Rotation (1 to 6 API keys)
GEMINI_API_KEY_1=AIzaSy...
GEMINI_API_KEY_2=AIzaSy...
# ... up to GEMINI_API_KEY_6

# Cloudinary Integration
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Seed Database (Optional)

Seed an initial admin/user account for testing:

```bash
npm run seed:admin
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📱 PWA Features

PostForge is built as a Progressive Web App (PWA).
- **Install Prompt**: A custom banner prompts mobile and desktop users to install PostForge AI onto their device.
- **Service Worker**: Caches page resources, static assets, and Cloudinary images for fast offline loads.
- **Configuration**: Managed in `next.config.ts` using `@ducanh2912/next-pwa` and registered inside `src/components/app-providers.tsx`.

---

## 🗺️ Project Structure

```
├── public/                 # Static assets, icons, manifest.json
├── src/
│   ├── app/                # Next.js App Router pages and API routes
│   │   ├── (app)/          # Protected workspace pages (Dashboard, Posts, Settings)
│   │   ├── (auth)/         # Login page
│   │   ├── api/            # API endpoints (Auth, Accounts, Posts, AI)
│   │   └── layout.tsx      # Main layout & metadata
│   ├── components/         # Reusable UI component layer
│   │   ├── app-shell/      # Responsive Sidebar / Bottom bar Shell
│   │   └── ui/             # shadcn components (button, loaders, dropdowns)
│   ├── lib/                # Shared utilities (DB, Auth, Gemini Client, Cloudinary)
│   ├── models/             # Mongoose schemas (User, Post, SocialAccount)
│   └── types/              # TypeScript typings
```
