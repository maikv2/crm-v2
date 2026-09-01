"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";

type Variant = "admin" | "rep";

type ExhibitorDetail = {
  id: string;
  name?: string | null;
  code?: string | null;
  model?: string | null;
  status?: string | null;
  type?: string | null;
  installedAt?: string | null;
  nextVisitAt?: string | null;
  notes?: string | null;
  initialStockNote?: string | null;
  client?: {
    id: string;
    name?: string | null;
  } | null;
  region?: {
    id: string;
    name?: string | null;
  } | null;
  products?: ExhibitorProduct[];
  initialItems?: ExhibitorProduct[];
};

type ExhibitorProduct = {
  id: string;
  productId?: string | null;
  quantity: number;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
  } | null;
};

const EXHIBITOR_TYPES = [
  { value: "", label: "Sem tipo definido" },
  { value: "FLOOR", label: "Chão" },
  { value: "ACRYLIC_CLOSED", label: "Acrílico fechado" },
  { value: "ACRYLIC_OPEN", label: "Acrílico aberto" },
  { value: "ACRYLIC_OPEN_SMALL", label: "Acrílico aberto pequeno" },
];

const EXHIBITOR_STATUSES = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "MAINTENANCE", label: "Manutenção" },
  { value: "DAMAGED", label: "Danificado" },
  { value: "REMOVED", label: "Removido" },
  { value: "INACTIVE", label: "Inativo" },
];

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function MobileExhibitorEditForm({
  exhibitorId,
  variant,
}: {
  exhibitorId: string;
  variant: Variant;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<ExhibitorDetail | null>(null);

  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [type, setType] = useState("");
  const [installedAt, setInstalledAt] = useState("");
  const [nextVisitAt, setNextVisitAt] = useState("");
  const [notes, setNotes] = useState("");
  const [initialStockNote, setInitialStockNote] = useState("");
  const [products, setProducts] = useState<ExhibitorProduct[]>([]);

  const backHref = useMemo(
    () =>
      variant === "rep"
        ? `/rep/exhibitors/${exhibitorId}`
        : `/exhibitors/${exhibitorId}`,
    [exhibitorId, variant]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/exhibitors/${exhibitorId}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar expositor.");
        }

        if (!active) return;

        const loaded = json as ExhibitorDetail;
        setItem(loaded);
        setName(loaded.name || "");
        setModel(loaded.model || "");
        setStatus(loaded.status || "ACTIVE");
        setType(loaded.type || "");
        setInstalledAt(toDateInputValue(loaded.installedAt));
        setNextVisitAt(toDateInputValue(loaded.nextVisitAt));
        setNotes(loaded.notes || "");
        setInitialStockNote(loaded.initialStockNote || "");
        setProducts(
          loaded.initialItems?.length ? loaded.initialItems : loaded.products ?? []
        );
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar expositor.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [exhibitorId]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/exhibitors/${exhibitorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || null,
          model: model.trim() || null,
          status,
          type: type || null,
          installedAt: installedAt || null,
          nextVisitAt: nextVisitAt || null,
          notes: notes.trim() || null,
          initialStockNote: initialStockNote.trim() || null,
          products: products.map((product) => ({
            productId: product.product?.id || product.productId,
            quantity: product.quantity,
          })),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar expositor.");
      }

      router.push(backHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar expositor.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 104,
    padding: 14,
    resize: "vertical",
  };

  function updateProductQuantity(productId: string, quantity: number) {
    setProducts((current) =>
      current.map((product) =>
        (product.product?.id || product.productId) === productId
          ? { ...product, quantity: Math.max(0, Math.trunc(quantity || 0)) }
          : product
      )
    );
  }

  if (loading) {
    return <MobileCard>Carregando expositor...</MobileCard>;
  }

  if (error && !item) {
    return <MobileCard style={{ borderColor: "#ef4444" }}>{error}</MobileCard>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {error ? (
        <MobileCard style={{ borderColor: "#ef4444" }}>
          <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 800 }}>
            {error}
          </div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <MobileSectionTitle title="Vínculo" />
        <div style={{ display: "grid", gap: 8 }}>
          <MobileInfoRow
            title="Cliente"
            subtitle={item?.client?.name || "-"}
            right={item?.code || "-"}
          />
          <MobileInfoRow
            title="Região"
            subtitle={item?.region?.name || "-"}
            right={formatDateBR(item?.installedAt)}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Informações do expositor" />
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do expositor"
            style={inputStyle}
          />

          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="Modelo"
            style={inputStyle}
          />

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            style={inputStyle}
          >
            {EXHIBITOR_TYPES.map((option) => (
              <option key={option.value || "empty"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={inputStyle}
          >
            {EXHIBITOR_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Datas e observações" />
        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="date"
            value={installedAt}
            onChange={(event) => setInstalledAt(event.target.value)}
            style={inputStyle}
          />

          <input
            type="date"
            value={nextVisitAt}
            onChange={(event) => setNextVisitAt(event.target.value)}
            style={inputStyle}
          />

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Observações do expositor"
            rows={4}
            style={textareaStyle}
          />

          <textarea
            value={initialStockNote}
            onChange={(event) => setInitialStockNote(event.target.value)}
            placeholder="Observação do estoque inicial"
            rows={3}
            style={textareaStyle}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Itens no expositor" />
        {products.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.subtext }}>
            Nenhum item registrado neste expositor.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {products.map((product) => {
              const productId = product.product?.id || product.productId || "";

              return (
                <div
                  key={product.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 116px",
                    gap: 10,
                    alignItems: "center",
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
                      {product.product?.name || "Produto"}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      SKU: {product.product?.sku || "-"}
                    </div>
                  </div>

                  <input
                    type="number"
                    min={0}
                    value={product.quantity}
                    onChange={(event) =>
                      updateProductQuantity(productId, Number(event.target.value))
                    }
                    style={{ ...inputStyle, textAlign: "center" }}
                    aria-label={`Quantidade de ${product.product?.name || "produto"}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </MobileCard>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          minHeight: 48,
          borderRadius: 14,
          border: "none",
          background: colors.primary,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 900,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.75 : 1,
        }}
      >
        <Save size={16} />
        {saving ? "Salvando..." : "Salvar informações"}
      </button>
    </div>
  );
}
