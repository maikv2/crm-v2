"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, Shield, Users, HandCoins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import MobileShell, { MobileCard } from "@/app/components/mobile/mobile-shell";

export default function MobileEntryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkSessions() {
      try {
        const crmRes = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (crmRes.ok) {
          const crmJson = await crmRes.json().catch(() => null);
          const role = crmJson?.user?.role;

          if (!active) return;

          if (role === "ADMIN") {
            router.replace("/m/admin");
            return;
          }

          if (role === "REPRESENTATIVE") {
            router.replace("/m/rep");
            return;
          }
        }

        const portalRes = await fetch("/api/portal-auth/me", {
          cache: "no-store",
        });

        if (portalRes.ok) {
          if (!active) return;
          router.replace("/m/client");
          return;
        }

        const investorRes = await fetch("/api/investor-auth/me", {
          cache: "no-store",
        });

        if (investorRes.ok) {
          if (!active) return;
          router.replace("/m/investor");
          return;
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    checkSessions();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <MobileShell
      title="V2 CRM Mobile"
      subtitle="Entrada mobile do sistema. Se já houver sessão ativa, o acesso será aberto automaticamente."
    >
      <MobileCard
        style={{
          background: colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              background: colors.isDark ? "rgba(255,255,255,0.12)" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Smartphone size={24} />
          </div>

          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              App Mobile do CRM
            </div>
            <div
              style={{
                fontSize: 13,
                opacity: 0.86,
                marginTop: 4,
              }}
            >
              Admin, representante, cliente e investidor.
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {checking
            ? "Verificando sessão ativa..."
            : "Escolha o acesso abaixo. No login principal, o sistema voltará para a versão mobile automaticamente."}
        </div>
      </MobileCard>

      <div style={{ display: "grid", gap: 12 }}>
        <Link href="/login?redirect=/m">
          <MobileCard>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Shield size={22} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  Admin / Representante
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.subtext,
                    marginTop: 4,
                  }}
                >
                  Usa o login principal do CRM
                </div>
              </div>
            </div>
          </MobileCard>
        </Link>

        <Link href="/portal/login?m=1">
          <MobileCard>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Users size={22} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>Cliente</div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.subtext,
                    marginTop: 4,
                  }}
                >
                  Portal do cliente no celular
                </div>
              </div>
            </div>
          </MobileCard>
        </Link>

        <Link href="/investor/login?m=1">
          <MobileCard>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <HandCoins size={22} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>Investidor</div>
                <div
                  style={{
                    fontSize: 12,
                    color: colors.subtext,
                    marginTop: 4,
                  }}
                >
                  Visão executiva de cotas e distribuições
                </div>
              </div>
            </div>
          </MobileCard>
        </Link>
      </div>
    </MobileShell>
  );
}