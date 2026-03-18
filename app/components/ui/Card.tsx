"use client";

import React from "react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type CardProps = {
  children: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  padding?: number;
};

export default function Card({
  children,
  title,
  right,
  padding = 20,
}: CardProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding,
        color: colors.text,
      }}
    >
      {(title || right) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: colors.text,
            }}
          >
            {title}
          </div>

          {right}
        </div>
      )}

      {children}
    </div>
  );
}