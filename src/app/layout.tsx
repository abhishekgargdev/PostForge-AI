import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/app-providers";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "PostForge AI",
  description: "Multi-platform social media content and scheduling",
  applicationName: "PostForge AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PostForge",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/postforge.png", type: "image/png" }],
    apple: [{ url: "/postforge.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6D5DFC" },
    { media: "(prefers-color-scheme: dark)", color: "#12121A" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
