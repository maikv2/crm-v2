"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type ThemeShape = ReturnType<typeof getThemeColors>;

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function findMatrixLocation(locations: any[]) {
  const normalized = locations.map((loc) => ({
    ...loc,
    _name: String(loc?.name ?? "").trim().toLowerCase(),
  }));

  return (
    normalized.find((loc) => loc._name === "matriz") ||
    normalized.find((loc) => loc._name.includes("matriz")) ||
    null
  );
}

function ActionButton({
  label,
  theme,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : theme.primary
    : hover
    ? theme.primary
    : theme.cardBg;

  const color = hover || primary ? "#ffffff" : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: primary ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
        background,
        color,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Card({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
        maxWidth: 760,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
      </div>

      {children}
    </div>
  );
}

export default function NewStockMovementPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [products, setProducts] = useState<any[]>([]);
  const [matrixLocation, setMatrixLocation] = useState<any | null>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const matrixLabel = useMemo(() => {
    return matrixLocation?.name || "Matriz";
  }, [matrixLocation]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [productsRes, stockRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/stock", { cache: "no-store" }),
        ]);

        const productsData = await readJsonSafe(productsRes);
        const stockData = await readJsonSafe(stockRes);

        if (!productsRes.ok) {
          throw new Error(
            productsData?.error || productsData?.raw || "Erro ao carregar produtos."
          );
        }

        if (!stockRes.ok) {
          throw new Error(
            stockData?.error || stockData?.raw || "Erro ao carregar estoque."
          );
        }

        const locations = Array.isArray(stockData?.locations)
          ? stockData.locations
          : [];

        const matrix = findMatrixLocation(locations);

        if (!matrix) {
          throw new Error(
            "Não encontrei o local de estoque da Matriz. Cadastre ou renomeie o local como 'Matriz'."
          );
        }

        setProducts(Array.isArray(productsData) ? productsData : []);
        setMatrixLocation(matrix);
      } catch (e: any) {
        alert(e?.message || "Erro ao carregar dados da tela.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function save() {
    if (!productId || quantity <= 0) {
      alert("Selecione o produto e informe uma quantidade válida.");
      return;
    }

    if (!matrixLocation?.id) {
      alert("Não foi possível identificar o estoque da Matriz.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          stockLocationId: matrixLocation.id,
          type: "IN",
          quantity,
          note,
        }),
      });

      const data = await readJsonSafe(res);

      if (!res.ok) {
        alert(
          `Erro ao salvar movimentação: ${
            data?.error || data?.details || data?.raw || "Erro desconhecido."
          }`
        );
        return;
      }

      router.push("/stock");
    } catch (e: any) {
      alert(e?.message || "Erro ao salvar movimentação.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 28,
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
        padding: 28,
        color: theme.text,
        background: theme.pageBg,
        minHeight: "100%",
      }}
    >
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
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Estoque / Nova entrada
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Entrada de Estoque
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Toda entrada cai automaticamente no estoque geral da Matriz.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton
            label="Cancelar"
            theme={theme}
            onClick={() => router.back()}
            disabled={saving}
          />
          <ActionButton
            label={saving ? "Salvando..." : "Salvar entrada"}
            theme={theme}
            onClick={save}
            disabled={saving}
            primary
          />
        </div>
      </div>

      <Card title="Dados da movimentação" theme={theme}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={label(theme)}>Destino automático</label>
            <input
              value={matrixLabel}
              readOnly
              style={{
                ...input(theme, inputBg),
                opacity: 0.9,
              }}
            />
          </div>

          <div>
            <label style={label(theme)}>Produto</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              style={input(theme, inputBg)}
            >
              <option value="">Selecione o produto</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label(theme)}>Quantidade</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={input(theme, inputBg)}
            />
          </div>

          <div>
            <label style={label(theme)}>Observação</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={textarea(theme, inputBg)}
              placeholder="Descreva a entrada de estoque"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function label(theme: ThemeShape): React.CSSProperties {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    color: theme.text,
    fontSize: 14,
  };
}

function input(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };
}

function textarea(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };
}
