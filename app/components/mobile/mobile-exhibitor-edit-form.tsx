"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
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

type CatalogProduct = {
  id: string;
  sku?: string | null;
  name: string;
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

  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [newProductId, setNewProductId] = useState("");

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

        const [res, productsRes] = await Promise.all([
          fetch(`/api/exhibitors/${exhibitorId}`, { cache: "no-store" }),
          fetch(`/api/products`, { cache: "no-store" }),
        ]);
        const json = await res.json().catch(() => null);
        const productsJson = await productsRes.json().catch(() => null);

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
        setCatalogProducts(Array.isArray(productsJson) ? productsJson : []);
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
        const baseMessage = json?.error || "Erro ao salvar expositor.";
        const details =
          typeof json?.details === "string" ? json.details : null;
        throw new Error(
          details && details !== baseMessage
            ? `${baseMessage}: ${details}`
            : baseMessage
        );
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

  function removeProduct(productId: string) {
    setProducts((current) =>
      current.filter(
        (product) => (product.product?.id || product.productId) !== productId
      )
    );
  }

  function addProduct() {
    if (!newProductId) return;

    const alreadyAdded = products.some(
      (product) => (product.product?.id || product.productId) === newProductId
    );
    if (alreadyAdded) {
      setNewProductId("");
      return;
    }

    const catalogProduct = catalogProducts.find((p) => p.id === newProductId);
    if (!catalogProduct) return;

    setProducts((current) => [
      ...current,
      {
        id: `new-${catalogProduct.id}`,
        productId: catalogProduct.id,
        quantity: 1,
        product: {
          id: catalogProduct.id,
          name: catalogProduct.name,
          sku: catalogProduct.sku,
        },
      },
    ]);
    setNewProductId("");
  }

  const availableProducts = useMemo(() => {
    const usedIds = new Set(
      products.map((product) => product.product?.id || product.productId)
    );
    return catalogProducts
      .filter((product) => !usedIds.has(product.id))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [catalogProducts, products]);

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
          <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 12 }}>
            Nenhum item registrado neste expositor.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {products.map((product) => {
              const productId = product.product?.id || product.productId || "";

              return (
                <div
                  key={product.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 92px 34px",
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

                  <button
                    type="button"
                    onClick={() => removeProduct(productId)}
                    aria-label={`Remover ${product.product?.name || "produto"}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 44px", gap: 10 }}>
          <select
            value={newProductId}
            onChange={(event) => setNewProductId(event.target.value)}
            style={inputStyle}
          >
            <option value="">Selecione um produto para adicionar</option>
            {availableProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.sku ? ` (${product.sku})` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={addProduct}
            disabled={!newProductId}
            aria-label="Adicionar produto"
            style={{
              width: 44,
              height: 46,
              borderRadius: 14,
              border: "none",
              background: colors.primary,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: newProductId ? "pointer" : "not-allowed",
              opacity: newProductId ? 1 : 0.6,
            }}
          >
            <Plus size={18} />
          </button>
        </div>
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
