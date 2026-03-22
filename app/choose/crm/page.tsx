"use client";

import { useEffect, useState } from "react";
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
  return "/dashboard";
}

function resolveMobile(role?: string | null) {
  if (role === "ADMIN") return "/m/admin";
  if (role === "REPRESENTATIVE") return "/m/rep";
  return "/m/admin";
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
        const res = await fetch("/api/session/me", {
          cache: "no-store",
        });

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const json = (await res.json()) as MeResponse;

        if (active) {
          setName(json?.user?.name?.trim() || json?.user?.email || "Usuário");
          setRole(json?.user?.role || null);
        }
      } catch {
        router.push("/login");
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
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Bem-vindo {name}</h2>

        <button
          onClick={() => router.push(resolveDesktop(role))}
          style={{ marginBottom: 12 }}
        >
          Versão desktop
        </button>

        <button onClick={() => router.push(resolveMobile(role))}>
          Versão mobile
        </button>

        <button onClick={toggleTheme} style={{ marginTop: 20 }}>
          {colors.isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}