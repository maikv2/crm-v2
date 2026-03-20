"use client";

import Link from "next/link";
import MobileRepNavigation from "./mobile-rep-shared";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

export default function MobileRepPageFrame({
  title,
  subtitle,
  desktopHref,
  children,
}: {
  title: string;
  subtitle?: string;
  desktopHref?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        paddingBottom: 96,
      }}
    >
      <div
        style={{
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>

            {subtitle ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: colors.subtext,
                  lineHeight: 1.45,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          {desktopHref ? (
            <Link
              href={desktopHref}
              style={{
                minWidth: 42,
                height: 42,
                padding: "0 12px",
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Desktop
            </Link>
          ) : null}
        </div>

        {children}
      </div>

      <MobileRepNavigation />
    </div>
  );
}