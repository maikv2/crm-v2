"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

function fromCents(cents?: number | null) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function toCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

function moneyFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type ThemeShape = ReturnType<typeof getThemeColors>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [price, setPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [extraCost, setExtraCost] = useState("");
  const [taxCost, setTaxCost] = useState("");
  const [freightCost, setFreightCost] = useState("");
  const [commission, setCommission] = useState("");

  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [origem, setOrigem] = useState("2");
  const [active, setActive] = useState(true);

  const priceCents = useMemo(() => toCents(price), [price]);
  const purchaseCostCents = useMemo(() => toCents(purchaseCost), [purchaseCost]);
  const packagingCostCents = useMemo(() => toCents(packagingCost), [packagingCost]);
  const extraCostCents = useMemo(() => toCents(extraCost), [extraCost]);
  const taxCostCents = useMemo(() => toCents(taxCost), [taxCost]);
  const freightCostCents = useMemo(() => toCents(freightCost), [freightCost]);
  const commissionCents = useMemo(() => toCents(commission), [commission]);

  const totalCostCents = useMemo(() => {
    return (
      purchaseCostCents +
      packagingCostCents +
      extraCostCents +
      taxCostCents +
      freightCostCents +
      commissionCents
    );
  }, [
    purchaseCostCents,
    packagingCostCents,
    extraCostCents,
    taxCostCents,
    freightCostCents,
    commissionCents,
  ]);

  const profitCents = useMemo(() => {
    return priceCents - totalCostCents;
  }, [priceCents, totalCostCents]);

  const marginPercent = useMemo(() => {
    if (priceCents <= 0) return 0;
    return (profitCents / priceCents) * 100;
  }, [profitCents, priceCents]);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        const res = await fetch(`/api/products/${id}`);

        if (!res.ok) {
          const txt = await res.text();
          setError(txt);
          setLoading(false);
          return;
        }

        const product = await res.json();

        setSku(product.sku ?? "");
        setName(product.name ?? "");
        setCategory(product.category ?? "");
        setBarcode(product.barcode ?? "");
        setImageUrl(product.imageUrl ?? "");

        setPrice(fromCents(product.priceCents));
        setPurchaseCost(fromCents(product.purchaseCostCents));
        setPackagingCost(fromCents(product.packagingCostCents));
        setExtraCost(fromCents(product.extraCostCents));
        setTaxCost(fromCents(product.taxCostCents));
        setFreightCost(fromCents(product.freightCostCents));
        setCommission(fromCents(product.commissionCents));

        setNcm(product.ncm ?? "");
        setCest(product.cest ?? "");
        setOrigem(product.origem ?? "2");
        setActive(product.active ?? true);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar produto.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function uploadImage(file: File) {
    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/product", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Erro ao enviar imagem");
        setUploadingImage(false);
        return;
      }

      setImageUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao enviar imagem.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sku,
        name,
        category,
        barcode: barcode || null,
        imageUrl: imageUrl || null,
        priceCents,
        purchaseCostCents,
        packagingCostCents,
        extraCostCents,
        taxCostCents,
        freightCostCents,
        commissionCents,
        ncm: ncm || null,
        cest: cest || null,
        origem,
        active,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      setError(txt);
      setSaving(false);
      return;
    }

    router.push("/products");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 13,
    color: theme.text,
  };

  const btnSecondary: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  };

  const btnPrimary: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  };

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 16,
    background: theme.cardBg,
    color: theme.text,
    maxWidth: 980,
    boxShadow: theme.isDark
      ? "0 10px 30px rgba(2,6,23,0.35)"
      : "0 8px 24px rgba(15,23,42,0.06)",
  };

  const summaryCard: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 16,
    background: subtleCard,
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: theme.text,
          background: theme.pageBg,
          minHeight: "100%",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        color: theme.text,
        background: theme.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.subtext,
          marginBottom: 10,
        }}
      >
        🏠 / Produtos / Editar Produto
      </div>

      <div style={cardStyle}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 900,
            color: theme.text,
          }}
        >
          Editar Produto
        </h1>

        <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Imagem do produto</label>

            <div
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px dashed ${theme.border}`,
                background: subtleCard,
                color: theme.text,
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await uploadImage(file);
                }}
                style={{ color: theme.text }}
              />
            </div>
          </div>

          {uploadingImage && (
            <div
              style={{
                marginBottom: 12,
                color: "#93c5fd",
                fontWeight: 700,
              }}
            >
              Enviando imagem...
            </div>
          )}

          {imageUrl && (
            <div
              style={{
                marginBottom: 16,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 12,
                background: subtleCard,
              }}
            >
              <div style={{ marginBottom: 8, fontWeight: 700 }}>Pré-visualização</div>

              <div
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 12,
                  border: `1px solid ${theme.border}`,
                  background: theme.cardBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={imageUrl}
                  alt={name || "Produto"}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: theme.subtext,
                  wordBreak: "break-all",
                }}
              >
                {imageUrl}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>SKU</label>
              <input
                style={inputStyle}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Nome do produto</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Categoria</label>
              <input
                style={inputStyle}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Código de barras</label>
              <input
                style={inputStyle}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Preço de venda</label>
              <input
                style={inputStyle}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Comissão</label>
              <input
                style={inputStyle}
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Custo de compra</label>
              <input
                style={inputStyle}
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Embalagem</label>
              <input
                style={inputStyle}
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Outros custos</label>
              <input
                style={inputStyle}
                value={extraCost}
                onChange={(e) => setExtraCost(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Imposto</label>
              <input
                style={inputStyle}
                value={taxCost}
                onChange={(e) => setTaxCost(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Frete</label>
              <input
                style={inputStyle}
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
              />
            </div>
          </div>

          <div style={{ ...summaryCard, marginBottom: 16 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
                color: theme.text,
              }}
            >
              Resumo financeiro do produto
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <div style={{ color: theme.subtext, marginBottom: 6 }}>Custo total</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
                  {moneyFromCents(totalCostCents)}
                </div>
              </div>

              <div>
                <div style={{ color: theme.subtext, marginBottom: 6 }}>Lucro unitário</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: profitCents >= 0 ? "#22c55e" : "#ef4444",
                  }}
                >
                  {moneyFromCents(profitCents)}
                </div>
              </div>

              <div>
                <div style={{ color: theme.subtext, marginBottom: 6 }}>Margem</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: marginPercent >= 0 ? "#60a5fa" : "#ef4444",
                  }}
                >
                  {marginPercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>NCM</label>
              <input
                style={inputStyle}
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>CEST</label>
              <input
                style={inputStyle}
                value={cest}
                onChange={(e) => setCest(e.target.value)}
              />
            </div>
          </div>

          <div>
  <label style={labelStyle}>Origem da mercadoria</label>
  <select
    style={inputStyle}
    value={origem}
    onChange={(e) => setOrigem(e.target.value)}
  >
    <option value="0">0 - Nacional</option>
    <option value="1">1 - Importação direta</option>
    <option value="2">2 - Importada (mercado interno)</option>
  </select>
</div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Produto ativo
            </label>
          </div>

          {error && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#ff6b6b",
                marginBottom: 12,
              }}
            >
              {error}
            </pre>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={btnSecondary}
              onClick={() => router.back()}
            >
              Cancelar
            </button>

            <button type="submit" style={btnPrimary} disabled={saving || uploadingImage}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}