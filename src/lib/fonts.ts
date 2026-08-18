import { Inter, JetBrains_Mono } from "next/font/google";

export const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Clash Display is not on Google Fonts. Add files under
 * `public/fonts/clash-display/` and switch to next/font/local when ready.
 * Until then, headings use a bold system sans stack via --font-heading.
 */
export const headingFontClassName =
  "font-heading font-semibold tracking-tight";

export const fontVariables = `${inter.variable} ${jetbrainsMono.variable}`;
