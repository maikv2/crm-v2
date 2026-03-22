"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Moon, Smartphone, Sun, User2 } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type InvestorMeResponse = {
  investor?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
};

function HeaderButton({
  label,
  icon,
  onClick,
  primary,
  danger,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [hover, setHover] = useState(false);

  const background = danger
    ? hover
      ? "#dc2626"
      : "#ef4444"
    : primary
      ? hover
        ? "#1d4ed8"
        : "#2563eb"
      : hover
        ? "#2563eb"
        : colors.isDark
          ? "#0f172a"
          : "#ffffff";

  const color = danger || primary ? "#ffffff" : hover ? "#ffffff" : colors.text;
  const border = danger || primary ? "none" : `1px solid ${colors.border}`;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 42,
        padding: "0 14px",
        borderRadius: 12,
        border,
        background,
        color,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function IconHeaderButton({
  onClick,
}: {
  onClick?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const colors = getThemeColors(theme);
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick || toggleTheme}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: hover ? "#2563eb" : colors.isDark ? "#0f172a" : "#ffffff",
        color: hover ? "#ffffff" : colors.text,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
    >
      {colors.isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [investorName, setInvestorName] = useState("Investidor");
  const [loadingUser, setLoadingUser] = useState(true);
  const isLoginPage = pathname === "/investor/login";

  useEffect(() => {
    let active = true;

    async function loadMe() {
      if (isLoginPage) {
        setLoadingUser(false);
        return;
      }

      try {
        const res = await fetch("/api/investor-auth/me", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (active) setLoadingUser(false);
          return;
        }

        const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;

        if (active) {
          setInvestorName(json?.investor?.name?.trim() || "Investidor");
        }
      } catch {
      } finally {
        if (active) setLoadingUser(false);
      }
    }

    loadMe();

    return () => {
      active = false;
    };
  }, [isLoginPage, pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/investor-auth/logout", {
        method: "POST",
      });
    } catch {
    } finally {
      router.push("/investor/login");
      router.refresh();
    }
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.isDark ? "#081225" : "#f3f6fb",
      }}
    >
      <header
        style={{
          height: 74,
          background: colors.isDark ? "#0b1220" : "#ffffff",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "0 24px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: colors.primary,
              lineHeight: 1,
            }}
          >
            V2
          </div>

          <div
            style={{
              width: 1,
              height: 28,
              background: colors.border,
            }}
          />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.1,
              }}
            >
              Portal do Investidor
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: colors.subtext,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 360,
              }}
            >
              {loadingUser ? "Carregando..." : `Bem-vindo, ${investorName}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <HeaderButton
            label="Painel"
            onClick={() => router.push("/investor")}
          />

          <HeaderButton
            label="Minhas Cotas"
            onClick={() => router.push("/investor/quotas")}
          />

          <HeaderButton
            label="Distribuições"
            onClick={() => router.push("/investor/distributions")}
          />

          <IconHeaderButton />

          <HeaderButton
            label="Mobile"
            icon={<Smartphone size={16} />}
            primary
            onClick={() => router.push("/m/investor")}
          />

          <div
            style={{
              height: 42,
              padding: "0 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: colors.isDark ? "#0f172a" : "#ffffff",
              color: colors.text,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            <User2 size={16} />
            {investorName}
          </div>

          <HeaderButton
            label="Sair"
            icon={<LogOut size={16} />}
            danger
            onClick={handleLogout}
          />
        </div>
      </header>

      {children}
    </div>
  );
}