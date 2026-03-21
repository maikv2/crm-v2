"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";
import MobileShell from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobilePageFrame({
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
    <MobileShell
      title={title}
      subtitle={subtitle}
      navItems={adminMobileNavItems}
      showBrand
      brandHref="/m/admin"
      rightSlot={
        desktopHref ? (
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
              gap: 6,
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
            title="Abrir modo normal"
          >
            <Smartphone size={15} />
            Normal
          </Link>
        ) : undefined
      }
    >
      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {children}
      </div>
    </MobileShell>
  );
}