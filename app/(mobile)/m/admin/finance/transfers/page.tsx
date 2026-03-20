"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Landmark,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type TransferItem = {
  id: string;
  amountCents?: number | null;
  status?: string | null;
  createdAt?: string | null;
  transferredAt?: string | null;
  description?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
  transferredBy?: {
    id: string;
    name: string;
  } | null;
};

export default function MobileAdminTransfersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTransfers() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = await authRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/finance/transfers");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/finance/transfers", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar repasses.");
        }

        const nextItems = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        if (active) {
          setItems(nextItems);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar repasses.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTransfers();

    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!q) return true;

      return (
        String(item.region?.name ?? "").toLowerCase().includes(q) ||
        String(item.description ?? "").toLowerCase().includes(q) ||
        String(item.transferredBy?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    const pending = filtered.filter((item) => item.status === "PENDING");
    const completed = filtered.filter((item) => item.status === "COMPLETED");

    return {
      pendingCount: pending.length,
      pendingValue: pending.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      completedCount: completed.length,
      completedValue: completed.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
    };
  }, [filtered]);

  return (
    <MobilePageFrame
      title="Repasses"
      subtitle="Financeiro mobile de repasses"
      desktopHref="/finance/transfers"
    >
      <MobileCard>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por região, descrição ou responsável"
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
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando repasses...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileCard style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>
                Pendentes
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 21,
                  fontWeight: 900,
                  color: "#f59e0b",
                }}
              >
                {formatMoneyBR(summary.pendingValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
                {summary.pendingCount} repasses
              </div>
            </MobileCard>

            <MobileCard style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>
                Concluídos
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 21,
                  fontWeight: 900,
                  color: "#16a34a",
                }}
              >
                {formatMoneyBR(summary.completedValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
                {summary.completedCount} repasses
              </div>
            </MobileCard>
          </div>

          <MobileCard>
            <MobileSectionTitle title="Movimentações" />

            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum repasse encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((item) => {
                  const pending = item.status === "PENDING";

                  return (
                    <Link key={item.id} href="/finance/transfers">
                      <div
                        style={{
                          borderRadius: 16,
                          border: `1px solid ${colors.border}`,
                          background: colors.isDark ? "#111827" : "#f8fafc",
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
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 900,
                                color: colors.text,
                              }}
                            >
                              {item.region?.name || "Sem região"}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: colors.subtext,
                              }}
                            >
                              {item.description || "Repasse financeiro"}
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: colors.text,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatMoneyBR(item.amountCents ?? 0)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              background: pending
                                ? colors.isDark
                                  ? "#2a2313"
                                  : "#fef3c7"
                                : colors.isDark
                                ? "#0f2a17"
                                : "#dcfce7",
                              color: pending ? "#b45309" : "#16a34a",
                            }}
                          >
                            {item.status || "Status"}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gap: 4,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ArrowRightLeft size={14} />
                              Criado em {formatDateBR(item.createdAt)}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Landmark size={14} />
                              {item.transferredBy?.name || "Sem responsável"}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {pending ? <ArrowRightLeft size={14} /> : <CheckCircle2 size={14} />}
                            abrir
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}