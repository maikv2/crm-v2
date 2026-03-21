"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
  formatDateTimeBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type TransferItem = {
  id: string;
  amountCents?: number | null;
  transferredAt?: string | null;
  status?: string | null;
  notes?: string | null;
};

type ResponseShape = {
  items?: TransferItem[];
};

function moneyToCents(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits || "0");
}

function centsToMask(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RepFinanceTransfersPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);

  async function load() {
    const res = await fetch("/api/rep/finance/transfers", {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.error || "Erro ao carregar repasses.");
    }

    setItems(Array.isArray(json?.items) ? json.items : []);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        await load();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar repasses."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const amountCents = moneyToCents(value);

      if (amountCents <= 0) {
        setError("Informe um valor válido para o repasse.");
        return;
      }

      const res = await fetch("/api/rep/finance/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCents,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao registrar repasse.");
      }

      setValue("");
      setNotes("");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao registrar repasse."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileRepPageFrame
      title="Repasses"
      subtitle="Registrar repasse para a matriz"
      desktopHref="/rep/finance"
    >
      {loading ? (
        <MobileCard>Carregando repasses...</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Novo repasse" />

            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={value}
                onChange={(e) => {
                  const cents = moneyToCents(e.target.value);
                  setValue(centsToMask(cents));
                }}
                placeholder="0,00"
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  padding: "0 14px",
                  outline: "none",
                  fontSize: 14,
                }}
              />

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações do repasse"
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  padding: 14,
                  outline: "none",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />

              {error ? (
                <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
              ) : null}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  height: 46,
                  borderRadius: 14,
                  border: "none",
                  background: colors.primary,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.75 : 1,
                }}
              >
                {saving ? "Salvando..." : "Registrar repasse"}
              </button>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Histórico" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum repasse registrado.</div>
            ) : (
              items.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={item.status ?? "Sem status"}
                  subtitle={`${formatDateTimeBR(item.transferredAt)}${
                    item.notes ? ` • ${item.notes}` : ""
                  }`}
                  right={formatMoneyBR(item.amountCents ?? 0)}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}