"use client";

import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileSkeletonCard({
  lines = 3,
  height = 110,
}: {
  lines?: number;
  height?: number;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const base = colors.isDark ? "#111827" : "#eef2f7";
  const bar = colors.isDark ? "#1f2937" : "#dde5ef";

  return (
    <>
      <style>{`
        @keyframes mobileSkeletonPulse {
          0% { opacity: 0.55; }
          50% { opacity: 1; }
          100% { opacity: 0.55; }
        }
      `}</style>

      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${colors.border}`,
          background: colors.cardBg,
          padding: 14,
          minHeight: height,
        }}
      >
        <div
          style={{
            width: "46%",
            height: 16,
            borderRadius: 999,
            background: bar,
            animation: "mobileSkeletonPulse 1.2s ease-in-out infinite",
            marginBottom: 14,
          }}
        />

        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              style={{
                width: index === lines - 1 ? "62%" : "100%",
                height: 12,
                borderRadius: 999,
                background: index % 2 === 0 ? base : bar,
                animation: "mobileSkeletonPulse 1.2s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}