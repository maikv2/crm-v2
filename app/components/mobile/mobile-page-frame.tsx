"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Smartphone } from "lucide-react";
import MobileShell, {
  type MobileNavItem,
} from "@/app/components/mobile/mobile-shell";
import {
  adminMobileNavItems,
  financeMobileNavItems,
} from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobilePageFrame({
  title,
  subtitle,
  desktopHref,
  navItems,
  children,
}: {
  title: string;
  subtitle?: string;
  desktopHref?: string;
  navItems?: MobileNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const isFinanceMobile =
    pathname.startsWith("/m/admin/finance") || pathname.startsWith("/m/finance");

  const resolvedNavItems =
    navItems ?? (isFinanceMobile ? financeMobileNavItems : adminMobileNavItems);

  return (
    <MobileShell
      title={title}
      subtitle={subtitle}
      navItems={resolvedNavItems}
      showBrand
      brandHref={isFinanceMobile ? "/m/admin/finance" : "/m/admin"}
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