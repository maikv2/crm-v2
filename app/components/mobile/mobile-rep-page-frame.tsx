"use client";

import MobileRepNavigation from "./mobile-rep-shared";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

export default function MobileRepPageFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        paddingBottom: 80,
      }}
    >
      <div
        style={{
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 4,
            color: colors.text,
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              fontSize: 13,
              color: colors.subtext,
              marginBottom: 20,
            }}
          >
            {subtitle}
          </div>
        )}

        {children}
      </div>

      <MobileRepNavigation />
    </div>
  );
}