"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  active: boolean;
  priceCents: number;
  commissionCents: number;
  imageUrl?: string | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function moneyFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getSkuSortNumber(sku: string) {
  const match = sku.match(/(\d+)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]);
}

function compareSku(a: string, b: string) {
  const prefixA = a.replace(/\d+/g, "").toUpperCase();
  const prefixB = b.replace(/\d+/g, "").toUpperCase();

  if (prefixA !== prefixB) {
    return prefixA.localeCompare(prefixB, "pt-BR");
  }

  const numberA = getSkuSortNumber(a);
  const numberB = getSkuSortNumber(b);

  if (numberA !== numberB) {
    return numberA - numberB;
  }

  return a.localeCompare(b, "pt-BR");
}

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: hover ? theme.primary : theme.cardBg,
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
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
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";
  const tableHeadBg = theme.isDark ? "#0f172a" : "#f8fafc";
  const categoryHeadBg = theme.isDark ? "#0b1324" : "#f8fafc";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((item) => (item.category || "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term);

      const matchesCategory =
        !categoryFilter || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const groupedProducts = useMemo(() => {
    const ordered = [...filteredProducts].sort((a, b) => {
      const categoryCompare = (a.category || "").localeCompare(
        b.category || "",
        "pt-BR"
      );

      if (categoryCompare !== 0) return categoryCompare;

      return compareSku(a.sku || "", b.sku || "");
    });

    const groups = ordered.reduce<Record<string, Product[]>>((acc, product) => {
      const categoryName = product.category?.trim() || "Sem categoria";
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(product);
      return acc;
    }, {});

    return Object.entries(groups);
  }, [filteredProducts]);

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 28,
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
            🏠 / Produtos
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Cadastro de Produtos
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Gerencie os produtos cadastrados, preços, comissão e imagens.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <ActionButton
            label="+ Produto"
            theme={theme}
            onClick={() => router.push("/products/new")}
          />
        </div>
      </div>

      <Block
        title="Lista de produtos"
        theme={theme}
        right={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou código"
              style={{
                height: 38,
                width: 240,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: inputBg,
                color: theme.text,
                padding: "0 12px",
                outline: "none",
              }}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                height: 38,
                minWidth: 180,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: inputBg,
                color: theme.text,
                padding: "0 12px",
                outline: "none",
              }}
            >
              <option value="">Todas categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <div style={{ color: theme.subtext }}>Carregando...</div>
        ) : groupedProducts.length === 0 ? (
          <div style={{ color: theme.subtext }}>
            Nenhum produto encontrado para os filtros selecionados.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {groupedProducts.map(([categoryName, categoryProducts]) => (
              <div
                key={categoryName}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  background: subtleCard,
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: `1px solid ${theme.border}`,
                    background: categoryHeadBg,
                    fontWeight: 800,
                    color: theme.text,
                    fontSize: 16,
                  }}
                >
                  {categoryName}
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: tableHeadBg,
                      }}
                    >
                      <th style={th(theme)}>Imagem</th>
                      <th style={th(theme)}>Código</th>
                      <th style={th(theme)}>Nome</th>
                      <th style={th(theme)}>Preço</th>
                      <th style={th(theme)}>Comissão</th>
                      <th style={th(theme)}>Ativo</th>
                      <th style={th(theme)}>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {categoryProducts.map((product) => (
                      <tr key={product.id}>
                        <td style={td(theme)}>
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 10,
                              border: `1px solid ${theme.border}`,
                              background: inputBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                            }}
                          >
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: theme.subtext,
                                  textAlign: "center",
                                  padding: 6,
                                }}
                              >
                                Sem imagem
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={td(theme)}>{product.sku}</td>
                        <td style={td(theme)}>{product.name}</td>
                        <td style={td(theme)}>
                          {moneyFromCents(product.priceCents ?? 0)}
                        </td>
                        <td style={td(theme)}>
                          {moneyFromCents(product.commissionCents ?? 0)}
                        </td>
                        <td style={td(theme)}>{product.active ? "Sim" : "Não"}</td>
                        <td style={td(theme)}>
                          <button
                            style={btnInline(theme)}
                            onClick={() => router.push(`/products/${product.id}`)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}

function th(theme: ThemeShape): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "12px 14px",
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 13,
    color: theme.subtext,
  };
}

function td(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 14,
    color: theme.text,
    verticalAlign: "middle",
  };
}

function btnInline(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontWeight: 700,
    cursor: "pointer",
  };
}