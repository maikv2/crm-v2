"use client";

import { Suspense } from "react";
import NewOrderPage from "@/app/(crm)/orders/new/page-content";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function RepOrdersNewPageInner() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1400,
        }}
      >
        <NewOrderPage mode="REPRESENTATIVE" />
      </div>
    </div>
  );
}

export default function RepOrdersNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <RepOrdersNewPageInner />
    </Suspense>
  );
}