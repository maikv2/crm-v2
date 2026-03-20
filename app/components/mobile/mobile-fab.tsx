"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileFab({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link
      href={href}
      aria-label={label}
      style={{
        position: "fixed",
        right: 16,
        bottom: 84,
        zIndex: 60,
        textDecoration: "none",
      }}
    >
      <div
        style={{
          minWidth: 56,
          height: 56,
          borderRadius: 999,
          padding: "0 18px",
          background: colors.primary,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: "0 14px 30px rgba(37,99,235,0.32)",
          fontSize: 13,
          fontWeight: 900,
        }}
      >
        <Plus size={18} />
        <span>{label}</span>
      </div>
    </Link>
  );
}