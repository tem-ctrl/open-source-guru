import { ImageResponse } from "next/og";
import { OgFooter, OgFrame, ogColors } from "@/lib/og";
import { siteImageAlt, tagline } from "@/lib/shared";

// The default card when any page without its own image is shared.
export const alt = siteImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const labels = ["good first issue", "help wanted"];

export default function Image() {
  return new ImageResponse(
    <OgFrame>
      <div style={{ display: "flex", gap: 16 }}>
        {labels.map((label) => (
          <div
            key={label}
            style={{
              display: "flex",
              padding: "10px 24px",
              borderRadius: 40,
              background: ogColors.coral,
              color: ogColors.plum,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          {tagline}
        </span>
        <span style={{ fontSize: 34, color: ogColors.wisteria, lineHeight: 1.35 }}>
          Emails when issues you can help with appear in the open-source repos you follow. Plus
          streaks, goals and a public profile for your contributions.
        </span>
      </div>

      <OgFooter label="Free and open source" />
    </OgFrame>,
    size,
  );
}
