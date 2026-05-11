"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Moon, Plus, Sun, X } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export type MobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefixes?: string[];
};

export type MobileFabAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function formatMoneyBR(cents?: number | null) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTimeBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

export function MobileCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        padding: 16,
        boxShadow: colors.isDark
          ? "0 10px 24px rgba(2,6,23,0.28)"
          : "0 10px 24px rgba(15,23,42,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function MobileSectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: colors.text,
          letterSpacing: -0.2,
        }}
      >
        {title}
      </div>

      {action}
    </div>
  );
}

export function MobileStatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileCard
      style={{
        padding: 14,
        borderRadius: 18,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: colors.subtext,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          lineHeight: 1.1,
          fontWeight: 900,
          color: colors.text,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </div>

      {helper ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: colors.subtext,
          }}
        >
          {helper}
        </div>
      ) : null}
    </MobileCard>
  );
}

export function MobileInfoRow({
  title,
  subtitle,
  right,
  href,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  href?: string;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: colors.text,
            lineHeight: 1.25,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: colors.subtext,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {right ? (
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: colors.text,
            whiteSpace: "nowrap",
          }}
        >
          {right}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ display: "block" }}>
        {content}
      </Link>
    );
  }

  return content;
}

function matchesPath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

export default function MobileShell({
  title,
  subtitle,
  navItems,
  fabActions,
  rightSlot,
  showBrand = false,
  brandHref = "/m/admin",
  children,
}: {
  title: string;
  subtitle?: string;
  navItems?: MobileNavItem[];
  fabActions?: MobileFabAction[];
  rightSlot?: React.ReactNode;
  showBrand?: boolean;
  brandHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const colors = getThemeColors(theme);

  const [openFab, setOpenFab] = useState(false);

  const activeNav = useMemo(() => {
    return (navItems ?? []).find((item) => {
      if (matchesPath(pathname, item.href)) return true;

      if (item.matchPrefixes?.length) {
        return item.matchPrefixes.some((prefix) => matchesPath(pathname, prefix));
      }

      return false;
    });
  }, [navItems, pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.isDark ? "#08111f" : "#f3f6fb",
        color: colors.text,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          minHeight: "100vh",
          paddingBottom: navItems?.length ? 110 : 24,
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            backdropFilter: "blur(10px)",
            background: colors.isDark
              ? "rgba(8,17,31,0.88)"
              : "rgba(243,246,251,0.92)",
            borderBottom: `1px solid ${colors.border}`,
            padding: "16px 16px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              {showBrand ? (
                <Link
                  href={brandHref}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={colors.isDark ? "/logo_branca.svg" : "/logo.svg"}
                    alt="V2"
                    style={{
                      width: 26,
                      height: 26,
                      objectFit: "contain",
                    }}
                  />
                </Link>
              ) : null}

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: -0.5,
                    color: colors.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </div>

                {subtitle ? (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: colors.subtext,
                      lineHeight: 1.45,
                    }}
                  >
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>

            {rightSlot ? (
              rightSlot
            ) : (
              <button
                type="button"
                onClick={toggleTheme}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.cardBg,
                  color: colors.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
                aria-label="Alternar tema"
                title="Alternar tema"
              >
                {colors.isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            display: "grid",
            gap: 16,
          }}
        >
          {children}
        </div>
      </div>

      {navItems && navItems.length > 0 ? (
        <>
          {fabActions && fabActions.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpenFab((prev) => !prev)}
              style={{
                position: "fixed",
                left: "50%",
                bottom: 76,
                transform: "translateX(-50%)",
                width: 60,
                height: 60,
                borderRadius: "50%",
                border: "none",
                background: colors.primary,
                color: "#ffffff",
                boxShadow: "0 16px 28px rgba(37,99,235,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 45,
              }}
            >
              {openFab ? <X size={26} /> : <Plus size={26} />}
            </button>
          ) : null}

          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
              display: "flex",
              justifyContent: "center",
              padding: "0 10px 10px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                background: colors.isDark ? "#0f172a" : "#ffffff",
                border: `1px solid ${colors.border}`,
                borderRadius: 24,
                boxShadow: colors.isDark
                  ? "0 16px 40px rgba(2,6,23,0.42)"
                  : "0 12px 32px rgba(15,23,42,0.12)",
                padding: "10px 10px 12px",
                display: "grid",
                gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
                gap: 6,
              }}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav?.href === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 4px",
                      borderRadius: 16,
                      background: active
                        ? colors.isDark
                          ? "#111f39"
                          : "#e8f0ff"
                        : "transparent",
                      color: active ? colors.primary : colors.subtext,
                    }}
                  >
                    <Icon size={18} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {openFab && fabActions && fabActions.length > 0 ? (
        <>
          <div
            onClick={() => setOpenFab(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.48)",
              zIndex: 41,
            }}
          />

          <div
            style={{
              position: "fixed",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: 150,
              width: "calc(100% - 24px)",
              maxWidth: 420,
              zIndex: 42,
            }}
          >
            <div
              style={{
                background: colors.isDark ? "#0f172a" : "#ffffff",
                border: `1px solid ${colors.border}`,
                borderRadius: 22,
                padding: 14,
                boxShadow: colors.isDark
                  ? "0 20px 48px rgba(2,6,23,0.48)"
                  : "0 18px 40px rgba(15,23,42,0.16)",
                display: "grid",
                gap: 10,
              }}
            >
              {fabActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    onClick={() => setOpenFab(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      background: colors.isDark ? "#111827" : "#f8fafc",
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: colors.isDark ? "#1d4ed8" : "#dbeafe",
                        color: colors.isDark ? "#ffffff" : "#1d4ed8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: colors.text,
                      }}
                    >
                      {action.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}