"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import MobileShell, { MobileCard } from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems, type MobileHubItem } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function MobileAdminHubPage({
  title,
  subtitle,
  backHref = "/m/admin",
  items,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  items: MobileHubItem[];
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileShell
      title={title}
      subtitle={subtitle}
      navItems={adminMobileNavItems}
      showBrand
    >
      <Link
        href={backHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 800,
          color: colors.subtext,
        }}
      >
        <ArrowLeft size={16} />
        voltar
      </Link>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => {
          const Icon: LucideIcon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <MobileCard
                style={{
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: colors.isDark ? "#111f39" : "#e8f0ff",
                      color: colors.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: colors.text,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                        lineHeight: 1.45,
                      }}
                    >
                      {item.description}
                    </div>
                  </div>

                  <ChevronRight size={18} color={colors.subtext} />
                </div>
              </MobileCard>
            </Link>
          );
        })}
      </div>
    </MobileShell>
  );
}