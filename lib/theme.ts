export type ThemeMode = "light" | "dark";

export function getThemeColors(mode: ThemeMode) {
  const isDark = mode === "dark";

  return {
    isDark,
    pageBg: isDark ? "#0b1220" : "#f3f6fb",
    sidebarBg: isDark ? "#0f172a" : "#ffffff",
    headerBg: isDark ? "#111827" : "#ffffff",
    cardBg: isDark ? "#111827" : "#ffffff",
    text: isDark ? "#ffffff" : "#111827",
    subtext: isDark ? "#94a3b8" : "#6b7280",
    border: isDark ? "#1f2937" : "#e5e7eb",
    primary: "#2563eb",
    hoverBg: isDark ? "#172036" : "#eff6ff",
    inputBg: isDark ? "#0f172a" : "#ffffff",
  };
}