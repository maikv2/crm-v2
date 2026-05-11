"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, Package } from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type PortalRequestItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    priceCents: number | null;
  };
};

type PortalRequest = {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
  client: {
    id: string;
    name: string;
    code: string | null;
  };
  items: PortalRequestItem[];
};

type AlertsResponse = {
  requests: PortalRequest[];
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export default function MobileRepAlertsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AlertsResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = await authRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/rep/alerts");
          return;
        }

        if (authJson?.user?.role !== "REPRESENTATIVE") {
          router.push("/m/rep");
          return;
        }

        const res = await fetch("/api/mobile/rep/alerts", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) throw new Error(json?.error || "Erro ao carregar alertas.");

        if (active) setData(json);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar alertas.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => { active = false; };
  }, [router]);

  const requests = data?.requests ?? [];

  return (
    <MobileRepPageFrame
      title="Alertas"
      subtitle="Solicitações dos clientes via portal"
      desktopHref="/portal-orders"
    >
      {loading ? (
        <MobileCard>Carregando alertas...</MobileCard>
      ) : error ? (
        <MobileCard>
          <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{error}</div>
        </MobileCard>
      ) : (
        <>
          <MobileCard style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: requests.length > 0
                    ? (colors.isDark ? "#431407" : "#fef3c7")
                    : (colors.isDark ? "#111827" : "#f0fdf4"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Bell
                  size={20}
                  color={requests.length > 0 ? "#f59e0b" : "#16a34a"}
                />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: colors.text }}>
                  {requests.length}
                </div>
                <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>
                  {requests.length === 1
                    ? "solicitação pendente"
                    : "solicitações pendentes"}
                </div>
              </div>
            </div>
          </MobileCard>

          {requests.length === 0 ? (
            <MobileCard>
              <div style={{ fontSize: 14, color: colors.subtext, textAlign: "center", padding: "8px 0" }}>
                Nenhuma solicitação pendente no momento.
              </div>
            </MobileCard>
          ) : (
            <MobileCard>
              <MobileSectionTitle title="Solicitações de pedido" />

              <div style={{ display: "grid", gap: 12 }}>
                {requests.map((req) => {
                  const totalItems = req.items.reduce((s, i) => s + i.quantity, 0);
                  const totalCents = req.items.reduce(
                    (s, i) => s + i.quantity * (i.product.priceCents ?? 0),
                    0
                  );

                  return (
                    <div
                      key={req.id}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#fffbeb",
                        padding: 14,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: colors.text,
                              lineHeight: 1.3,
                            }}
                          >
                            {req.client.name}
                          </div>
                          {req.client.code ? (
                            <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
                              Cód. {req.client.code}
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: colors.subtext,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {timeAgo(req.createdAt)}
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 6 }}>
                        {req.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <Package size={13} color={colors.subtext} style={{ flexShrink: 0 }} />
                              <span
                                style={{
                                  fontSize: 13,
                                  color: colors.text,
                                  fontWeight: 700,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.quantity}x {item.product.name}
                              </span>
                            </div>
                            {item.product.priceCents ? (
                              <span style={{ fontSize: 12, color: colors.subtext, whiteSpace: "nowrap", flexShrink: 0 }}>
                                {formatMoneyBR(item.quantity * item.product.priceCents)}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: 6,
                          borderTop: `1px solid ${colors.border}`,
                        }}
                      >
                        <span style={{ fontSize: 12, color: colors.subtext }}>
                          {totalItems} item{totalItems !== 1 ? "s" : ""}
                        </span>
                        {totalCents > 0 ? (
                          <span style={{ fontSize: 14, fontWeight: 900, color: colors.primary }}>
                            {formatMoneyBR(totalCents)}
                          </span>
                        ) : null}
                      </div>

                      {req.notes ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: colors.subtext,
                            fontStyle: "italic",
                            paddingTop: 2,
                          }}
                        >
                          {req.notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </MobileCard>
          )}
        </>
      )}
    </MobileRepPageFrame>
  );
}
