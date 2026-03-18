"use client";

import React from "react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export default function StatCard({
  title,
  value,
  subtitle,
}: StatCardProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 20,
        color: colors.text,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: colors.text,
          opacity: 0.7,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: colors.text,
          marginBottom: subtitle ? 8 : 0,
        }}
      >
        {value}
      </div>

      {subtitle ? (
        <div
          style={{
            fontSize: 13,
            color: colors.text,
            opacity: 0.65,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}