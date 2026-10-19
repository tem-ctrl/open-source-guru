import { ImageResponse } from "next/og";
import { formatNumber } from "@/lib/contributions";
import { OgFooter, OgFrame, ogColors, ogDisplay, ogImageOptions } from "@/lib/og";
import { fetchProfile } from "@/lib/profile";

// The card shown when a profile link is shared.
export const alt = "Open Source Contributions on Open Source Guru";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const { plum: PLUM, wisteria: WISTERIA, violetBright: VIOLET_BRIGHT, coral: CORAL } = ogColors;

export default async function Image({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const profile = await fetchProfile(login, null);
  const streak = profile ? profile.stats.streaks[profile.stats.streaks.period] : null;

  return new ImageResponse(
    <OgFrame>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {profile?.avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: rendered to an image by next/og
          <img
            src={profile.avatarUrl}
            alt=""
            width={128}
            height={128}
            style={{ borderRadius: 64, border: `4px solid ${VIOLET_BRIGHT}` }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 60, ...ogDisplay }}>
            {profile ? profile.name || profile.login : "Open Source Guru"}
          </span>
          {profile && <span style={{ fontSize: 32, color: WISTERIA }}>@{profile.login}</span>}
        </div>
      </div>

      {profile ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 64 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 120, ...ogDisplay, lineHeight: 1 }}>
              {formatNumber(profile.stats.total)}
            </span>
            <span style={{ fontSize: 32, color: WISTERIA }}>
              Open Source Contributions in the last year
            </span>
          </div>
          {streak && streak.current > 0 && (
            <div
              style={{
                display: "flex",
                padding: "12px 28px",
                borderRadius: 40,
                background: CORAL,
                color: PLUM,
                fontSize: 32,
                ...ogDisplay,
              }}
            >
              {formatNumber(streak.current)}-{profile.stats.streaks.period} streak
            </div>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 40, color: WISTERIA }}>
          Find, follow and track open-source work
        </span>
      )}

      <OgFooter />
    </OgFrame>,
    await ogImageOptions(),
  );
}
