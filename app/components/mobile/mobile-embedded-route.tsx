"use client";

import { useMemo } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileEmbeddedRoute({
  src,
  title = "Conteúdo",
}: {
  src: string;
  title?: string;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const safeSrc = useMemo(() => {
    if (!src.startsWith("/")) return "/";
    return src;
  }, [src]);

  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        background: colors.cardBg,
        boxShadow: colors.isDark
          ? "0 10px 24px rgba(2,6,23,0.28)"
          : "0 10px 24px rgba(15,23,42,0.06)",
      }}
    >
      <iframe
        title={title}
        src={safeSrc}
        style={{
          width: "100%",
          height: "calc(100vh - 180px)",
          minHeight: 640,
          border: "none",
          background: colors.cardBg,
        }}
      />
    </div>
  );
}