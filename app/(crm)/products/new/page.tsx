"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

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

export default function NewProductPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [price, setPrice] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [extraCost, setExtraCost] = useState("");
  const [taxCost, setTaxCost] = useState("");
  const [freightCost, setFreightCost] = useState("");
  const [commission, setCommission] = useState("");

  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleImageUpload(file: File) {
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
        throw new Error(data?.error || "Erro ao enviar imagem.");
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

    try {
      const res = await fetch("/api/products", {
        method: "POST",
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
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar produto.");
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 13,
    color: theme.text,
  };

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

  const btnSecondary: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const btnPrimary: React.CSSProperties = {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const displayImage = previewUrl || imageUrl;

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 24,
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
        🏠 / Produtos / Novo Produto
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Novo Produto
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Cadastre um novo produto no catálogo
          </div>
        </div>
      </div>

      <div
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          padding: 20,
          boxShadow: theme.isDark
            ? "0 10px 30px rgba(2,6,23,0.35)"
            : "0 8px 24px rgba(15,23,42,0.06)",
          maxWidth: 980,
        }}
      >
        <form onSubmit={onSubmit}>
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

                  if (previewUrl && previewUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(previewUrl);
                  }

                  const localPreviewUrl = URL.createObjectURL(file);
                  setPreviewUrl(localPreviewUrl);

                  await handleImageUpload(file);
                }}
                style={{ color: theme.text }}
              />

              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: theme.subtext,
                }}
              >
                Escolha uma imagem do seu computador para enviar ao sistema.
              </div>
            </div>
          </div>

          {uploadingImage ? (
            <div
              style={{
                marginBottom: 16,
                color: "#2563eb",
                fontWeight: 700,
              }}
            >
              Enviando imagem...
            </div>
          ) : null}

          {displayImage ? (
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
                  key={displayImage}
                  src={displayImage}
                  alt={name || "Produto"}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Preço de venda</label>
              <input
                style={inputStyle}
                placeholder="Ex: 12,90"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Comissão</label>
              <input
                style={inputStyle}
                placeholder="Ex: 1,50"
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
                placeholder="Ex: 5,00"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Embalagem</label>
              <input
                style={inputStyle}
                placeholder="Ex: 0,50"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Outros custos</label>
              <input
                style={inputStyle}
                placeholder="Ex: 0,20"
                value={extraCost}
                onChange={(e) => setExtraCost(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Imposto</label>
              <input
                style={inputStyle}
                placeholder="Ex: 0,80"
                value={taxCost}
                onChange={(e) => setTaxCost(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Frete</label>
              <input
                style={inputStyle}
                placeholder="Ex: 0,40"
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: 16,
              background: subtleCard,
              marginBottom: 16,
            }}
          >
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
                <div style={{ opacity: 0.7, marginBottom: 6, fontSize: 13 }}>
                  Custo total
                </div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>
                  {moneyFromCents(totalCostCents)}
                </div>
              </div>

              <div>
                <div style={{ opacity: 0.7, marginBottom: 6, fontSize: 13 }}>
                  Lucro unitário
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: profitCents >= 0 ? "#16a34a" : "#ef4444",
                  }}
                >
                  {moneyFromCents(profitCents)}
                </div>
              </div>

              <div>
                <div style={{ opacity: 0.7, marginBottom: 6, fontSize: 13 }}>
                  Margem
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: marginPercent >= 0 ? "#2563eb" : "#ef4444",
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

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 0,
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
                color: "#ef4444",
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

            <button
              type="submit"
              style={btnPrimary}
              disabled={saving || uploadingImage}
            >
              {saving ? "Salvando..." : "Salvar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}