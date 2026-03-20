"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileRepListPage({
  title,
  subtitle,
  desktopHref,
  search,
  onSearchChange,
  searchPlaceholder,
  createHref,
  createLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  desktopHref?: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  createHref?: string;
  createLabel?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileRepPageFrame title={title} subtitle={subtitle} desktopHref={desktopHref}>
      <MobileCard>
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: colors.subtext,
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px 0 38px",
                outline: "none",
                fontSize: 14,
              }}
            />
          </div>

          {createHref && createLabel ? (
            <Link href={createHref}>
              <div
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: "none",
                  background: colors.primary,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                <Plus size={16} />
                {createLabel}
              </div>
            </Link>
          ) : null}
        </div>
      </MobileCard>

      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </MobileRepPageFrame>
  );
}