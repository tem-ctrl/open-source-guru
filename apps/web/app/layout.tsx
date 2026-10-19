import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "@/components/ui/Toaster";
import { pageMetadata } from "@/lib/seo";
import { appName, siteDescription, siteUrl, tagline } from "@/lib/shared";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display face for headings and the wordmark (visual identity: "Sunset Violet").
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes canonical and Open Graph image URLs absolute.
  metadataBase: new URL(siteUrl),
  title: {
    // Under 60 characters, so search results show it whole.
    default: `${appName}: Good First Issue Alerts for GitHub`,
    template: `%s | ${appName}`,
  },
  description: siteDescription,
  applicationName: appName,
  keywords: [
    "good first issue",
    "help wanted",
    "open source",
    "GitHub issues",
    "GitHub notifications",
    "first contribution",
    "open-source contributions",
    "contribution streak",
    "contribution tracker",
    "hacktoberfest",
  ],
  authors: [{ name: "Gilbert Temgoua", url: "https://github.com/tem-ctrl" }],
  creator: "Gilbert Temgoua",
  category: "technology",
  // Defaults for pages without their own (the image comes from app/opengraph-image.tsx).
  // Pages that set `openGraph` replace this object: build theirs with `pageMetadata`.
  ...pageMetadata({ title: `${appName}: ${tagline}`, description: siteDescription, image: null }),
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7FD" },
    { media: "(prefers-color-scheme: dark)", color: "#12012E" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </RootProvider>
      </body>
    </html>
  );
}
