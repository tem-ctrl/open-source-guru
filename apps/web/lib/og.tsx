// Building blocks for the Open Graph cards rendered with next/og (Sunset Violet colors).
// next/og supports a subset of CSS: every element with children needs `display: flex`.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { appName } from "./shared";

export const ogColors = {
  plum: "#1F024C",
  violet: "#45056E",
  petal: "#F6EEFB",
  wisteria: "#BCA7D3",
  violetBright: "#B57BE0",
  coral: "#E47676",
} as const;

/** The display face (headings and wordmark on the site), for headlines and the wordmark. */
export const ogDisplay = { fontFamily: "Bricolage Grotesque", fontWeight: 800 } as const;

let fonts: Promise<[Buffer, Buffer]> | undefined;
const fontFile = (name: string) => readFile(join(process.cwd(), "assets/fonts", name));

/**
 * Size and fonts for `ImageResponse`: the site's faces, Geist for text and Bricolage Grotesque
 * for display. next/og needs TTF/OTF data (not the site's WOFF2), read from assets/fonts
 * (next.config.ts includes it in the standalone output); passing fonts replaces its own.
 */
export async function ogImageOptions() {
  fonts ??= Promise.all([
    fontFile("Geist-Regular.ttf"),
    fontFile("BricolageGrotesque-ExtraBold.ttf"),
  ]);
  const [geist, bricolage] = await fonts;
  return {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Geist", data: geist, weight: 400 as const },
      { name: ogDisplay.fontFamily, data: bricolage, weight: 800 as const },
    ],
  };
}

/** The Branch Sprout mark, drawn for a dark background. */
export function OgLogo({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" aria-hidden="true">
      <path d="M56 56C56 34 40 22 18 22 18 44 34 56 56 56Z" fill={ogColors.violetBright} />
      <path d="M56 50C56 28 72 14 96 16 96 38 80 50 56 50Z" fill={ogColors.coral} />
      <path
        d="M56 52V72M56 100V104"
        stroke={ogColors.petal}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="56" cy="86" r="10" fill="none" stroke={ogColors.petal} strokeWidth="8" />
    </svg>
  );
}

/** Logo + app name, plus an optional label on the right (e.g. "Docs"). */
export function OgFooter({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 28,
        color: ogColors.wisteria,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <OgLogo />
        <span style={{ ...ogDisplay, color: ogColors.petal }}>{appName}</span>
      </div>
      {label && <span style={{ fontSize: 24 }}>{label}</span>}
    </div>
  );
}

/** The full-bleed card every Open Graph image is drawn on. */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: `linear-gradient(135deg, ${ogColors.plum} 0%, ${ogColors.violet} 100%)`,
        color: ogColors.petal,
        fontFamily: "Geist",
      }}
    >
      {children}
    </div>
  );
}
