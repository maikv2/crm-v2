"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Laptop, Moon, Smartphone, Sun } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type MeResponse = {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

function resolveDesktop(role?: string | null) {
  if (role === "ADMIN") return "/dashboard";
  if (role === "REPRESENTATIVE") return "/rep";
  if (role === "ADMINISTRATIVE") return "/finance";
  return "/dashboard";
}

function resolveMobile(role?: string | null) {
  if (role === "ADMIN") return "/m/admin";
  if (role === "REPRESENTATIVE") return "/m/rep";
  if (role === "ADMINISTRATIVE") return "/m/finance";
  return "/m/admin";
}

function OptionButton({
  title,
  subtitle,
  icon,
  onClick,
  primary,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onClick?: () => void;
  primary?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
      ? "#2563eb"
      : colors.isDark
        ? "#0f172a"
        : "#ffffff";

  const color = primary ? "#ffffff" : hover ? "#ffffff" : colors.text;
  const border = primary ? "none" : `1px solid ${colors.border}`;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        borderRadius: 18,
        border,
        background,
        color,
        padding: 20,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background:
            primary || hover
              ? "rgba(255,255,255,0.16)"
              : colors.isDark
                ? "#111827"
                : "#e8f0ff",
          color: primary || hover ? "#ffffff" : colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            opacity: primary || hover ? 0.92 : 0.8,
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}

export default function ChooseCrmPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Usuário");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (res.status === 401) {
          router.replace("/login?access=CRM");
          return;
        }

        if (!res.ok) {
          router.replace("/login?access=CRM");
          return;
        }

        const json = (await res.json().catch(() => null)) as MeResponse | null;

        if (active) {
          const nextRole = json?.user?.role || null;

          setName(json?.user?.name?.trim() || json?.user?.email || "Usuário");
          setRole(nextRole);

          if (
            nextRole !== "ADMIN" &&
            nextRole !== "REPRESENTATIVE" &&
            nextRole !== "ADMINISTRATIVE"
          ) {
            router.replace("/login?access=CRM");
            return;
          }
        }
      } catch (error) {
        console.error(error);
        router.replace("/login?access=CRM");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.isDark ? "#081225" : "#f3f6fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.text,
          fontWeight: 800,
        }}
      >
        Carregando CRM...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.isDark ? "#081225" : "#f3f6fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: colors.isDark ? "#0b1220" : "#ffffff",
          border: `1px solid ${colors.border}`,
          borderRadius: 28,
          padding: 28,
          boxShadow: colors.isDark
            ? "0 24px 60px rgba(0,0,0,0.35)"
            : "0 24px 60px rgba(15,23,42,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: colors.primary,
                lineHeight: 1,
                marginBottom: 18,
              }}
            >
              V2
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.1,
              }}
            >
              Bem-vindo
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 16,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {name}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.isDark ? "#0f172a" : "#ffffff",
              color: colors.text,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {colors.isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div
          style={{
            fontSize: 13,
            color: colors.subtext,
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          Escolha como deseja acessar o sistema.
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          <OptionButton
            title="Versão desktop"
            subtitle="Abrir a interface completa do CRM."
            icon={<Laptop size={20} />}
            primary
            onClick={() => router.replace(resolveDesktop(role))}
          />

          <OptionButton
            title="Versão mobile"
            subtitle="Abrir a interface otimizada para celular."
            icon={<Smartphone size={20} />}
            onClick={() => router.replace(resolveMobile(role))}
          />
        </div>
      </div>
    </div>
  );
}