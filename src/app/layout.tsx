import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PostForge AI",
  description: "Multi-platform social media content and scheduling",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AppProviders>
          {/* Nav shell placeholder — filled in by Module 4 */}
          <div id="app-nav" className="shrink-0" aria-hidden />

          <main className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
