"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function money(cents: number) {
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

type Product = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  priceCents?: number | null;
  active?: boolean;
  imageUrl?: string | null;
  description?: string | null;
  shortDescription?: string | null;
};

type CatalogItem = {
  productId: string;
  qty: number;
  unitCents: number;
};

function ActionButton({
  label,
  onClick,
}: {
  label: string;
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
        border: "1px solid #e5e7eb",
        background: hover ? "#2563eb" : "#ffffff",
        color: hover ? "#ffffff" : "#111827",
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

function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
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
            color: "#111827",
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

function getProductDescription(product?: Product | null) {
  if (!product) return "Sem descrição cadastrada.";
  return (
    product.description ||
    product.shortDescription ||
    "Sem descrição cadastrada."
  );
}

function normalizeProducts(payload: any): Product[] {
  let rawProducts: any[] = [];

  if (Array.isArray(payload)) {
    rawProducts = payload;
  } else if (Array.isArray(payload?.products)) {
    rawProducts = payload.products;
  } else if (Array.isArray(payload?.items)) {
    rawProducts = payload.items;
  } else if (Array.isArray(payload?.data)) {
    rawProducts = payload.data;
  } else if (Array.isArray(payload?.data?.products)) {
    rawProducts = payload.data.products;
  } else if (Array.isArray(payload?.rows)) {
    rawProducts = payload.rows;
  }

  return rawProducts
    .filter((item) => item && item.id && item.name)
    .map((item) => ({
      id: String(item.id),
      sku: String(item.sku ?? "-"),
      name: String(item.name ?? ""),
      category: item.category ?? null,
      priceCents:
        typeof item.priceCents === "number"
          ? item.priceCents
          : typeof item.price === "number"
            ? item.price
            : 0,
      active: typeof item.active === "boolean" ? item.active : true,
      imageUrl: item.imageUrl ?? null,
      description: item.description ?? null,
      shortDescription: item.shortDescription ?? null,
    }))
    .filter((item) => item.active !== false);
}

function ProductImage({
  sku,
  name,
  alt,
}: {
  sku: string;
  name: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if ((!sku && !name) || failed) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          color: "#64748b",
          textAlign: "center",
          padding: 12,
        }}
      >
        Sem imagem
      </div>
    );
  }

  return (
    <img
      src={`/api/product-image?sku=${encodeURIComponent(sku)}&name=${encodeURIComponent(name)}`}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

export default function PortalOrderRequestPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadBase() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const prodRes = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!prodRes.ok) {
          setProducts([]);
          setCatalog([]);
          setErrorMessage("Não foi possível carregar os produtos do catálogo.");
          setLoading(false);
          return;
        }

        const prodData = await prodRes.json();
        const productList = normalizeProducts(prodData);

        setProducts(productList);
        setCatalog(
          productList.map((p) => ({
            productId: p.id,
            qty: 0,
            unitCents: p.priceCents ?? 0,
          }))
        );

        if (productList.length === 0) {
          setErrorMessage("Nenhum produto disponível no catálogo.");
        }
      } catch (error) {
        console.error(error);
        setProducts([]);
        setCatalog([]);
        setErrorMessage("Erro ao carregar os produtos do catálogo.");
      } finally {
        setLoading(false);
      }
    }

    loadBase();
  }, []);

  function updateQty(productId: string, qty: number) {
    setCatalog((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: Math.max(0, qty || 0) }
          : item
      )
    );
  }

  function incrementQty(productId: string, amount = 1) {
    setCatalog((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: item.qty + amount }
          : item
      )
    );
  }

  function decrementQty(productId: string, amount = 1) {
    setCatalog((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: Math.max(0, item.qty - amount) }
          : item
      )
    );
  }

  function clearAll() {
    setCatalog((prev) => prev.map((item) => ({ ...item, qty: 0 })));
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ).sort() as string[];
  }, [products]);

  const itemsWithProduct = useMemo(() => {
    return catalog.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        ...item,
        product,
        subtotalCents: item.qty * item.unitCents,
      };
    });
  }, [catalog, products]);

  const visibleItems = useMemo(() => {
    return itemsWithProduct.filter((item) => {
      const product = item.product;
      if (!product) return false;

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !categoryFilter || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [itemsWithProduct, search, categoryFilter]);

  const visibleGroupedItems = useMemo(() => {
    const ordered = [...visibleItems].sort((a, b) => {
      const categoryA = (a.product?.category || "").trim();
      const categoryB = (b.product?.category || "").trim();

      const categoryCompare = categoryA.localeCompare(categoryB, "pt-BR");
      if (categoryCompare !== 0) return categoryCompare;

      return compareSku(a.product?.sku || "", b.product?.sku || "");
    });

    const groups = ordered.reduce<Record<string, typeof ordered>>((acc, item) => {
      const categoryName = item.product?.category?.trim() || "Sem categoria";

      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }

      acc[categoryName].push(item);
      return acc;
    }, {});

    return Object.entries(groups);
  }, [visibleItems]);

  const selectedItems = useMemo(() => {
    return itemsWithProduct.filter((item) => item.qty > 0);
  }, [itemsWithProduct]);

  const selectedItemsCount = useMemo(() => {
    return selectedItems.length;
  }, [selectedItems]);

  const totalQuantity = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.qty, 0);
  }, [selectedItems]);

  async function save() {
    const validItems = itemsWithProduct
      .filter((i) => i.qty > 0)
      .map((i) => ({
        productId: i.productId,
        quantity: i.qty,
      }));

    if (validItems.length === 0) {
      alert("Informe a quantidade de pelo menos um produto.");
      return;
    }

    setSaving(true);
    setSuccess(null);

    try {
      const res = await fetch("/api/portal/order-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes,
          items: validItems,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(`Erro ao enviar solicitação: ${txt}`);
        return;
      }

      setCatalog((prev) => prev.map((item) => ({ ...item, qty: 0 })));
      setNotes("");
      setSuccess("Solicitação enviada com sucesso.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f6fb",
          color: "#111827",
          fontWeight: 700,
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f3f6fb",
        color: "#111827",
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
              color: "#64748b",
              marginBottom: 10,
            }}
          >
            🏠 / Portal do Cliente / Solicitar pedido
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#111827",
            }}
          >
            Solicitar Pedido
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Monte sua solicitação por catálogo. Este lançamento não gera venda
            direta, apenas um pedido pendente para o representante.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="Voltar"
            onClick={() => router.push("/portal/dashboard")}
          />
          <ActionButton
            label={saving ? "Enviando..." : "Enviar solicitação"}
            onClick={save}
          />
        </div>
      </div>

      {success ? (
        <div
          style={{
            marginBottom: 18,
            border: "1px solid #86efac",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: 14,
            padding: 16,
            fontWeight: 700,
          }}
        >
          {success}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          style={{
            marginBottom: 18,
            border: "1px solid #fdba74",
            background: "#fff7ed",
            color: "#9a3412",
            borderRadius: 14,
            padding: 16,
            fontWeight: 700,
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>
        <Card
          title="Catálogo de Produtos"
          right={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                style={{ ...input(), width: 220 }}
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ ...input(), width: 180 }}
              >
                <option value="">Todas categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button onClick={clearAll} style={btnSecondary()} type="button">
                Limpar quantidades
              </button>
            </div>
          }
        >
          {visibleGroupedItems.length === 0 ? (
            <div style={{ color: "#64748b" }}>Nenhum produto encontrado.</div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {visibleGroupedItems.map(([categoryName, categoryItems]) => (
                <div
                  key={categoryName}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #e5e7eb",
                      background: "#f8fafc",
                      fontWeight: 800,
                      color: "#111827",
                      fontSize: 16,
                    }}
                  >
                    {categoryName}
                  </div>

                  <div
                    style={{
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    {categoryItems.map((item) => (
                      <div
                        key={item.productId}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 14,
                          padding: 14,
                          background: "#ffffff",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            height: 220,
                            borderRadius: 12,
                            background: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 14,
                            overflow: "hidden",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <ProductImage
                            sku={item.product?.sku ?? ""}
                            name={item.product?.name ?? ""}
                            alt={item.product?.name ?? "Produto"}
                          />
                        </div>

                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 16,
                            color: "#111827",
                            lineHeight: 1.35,
                            minHeight: 44,
                          }}
                        >
                          {item.product?.name ?? "Produto"}
                        </div>

                        <div style={{ color: "#64748b", marginTop: 6, fontSize: 12 }}>
                          SKU: {item.product?.sku ?? "-"}
                        </div>

                        <div style={{ color: "#64748b", marginTop: 2, fontSize: 12 }}>
                          Categoria: {item.product?.category ?? "-"}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: "#64748b",
                            minHeight: 74,
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {getProductDescription(item.product)}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#111827",
                          }}
                        >
                          {money(item.unitCents)}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 14,
                          }}
                        >
                          <button
                            onClick={() => decrementQty(item.productId, 1)}
                            style={qtyBtn()}
                            type="button"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) =>
                              updateQty(item.productId, Number(e.target.value))
                            }
                            style={{ ...input(), textAlign: "center", padding: "0 8px" }}
                          />

                          <button
                            onClick={() => incrementQty(item.productId, 1)}
                            style={qtyBtn()}
                            type="button"
                          >
                            +
                          </button>
                        </div>

                        <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
                          Subtotal:{" "}
                          <b style={{ color: "#111827" }}>{money(item.subtotalCents)}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Resumo da solicitação">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ color: "#64748b" }}>Produtos selecionados</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginTop: 6,
                  color: "#111827",
                }}
              >
                {selectedItemsCount}
              </div>
            </div>

            <div>
              <div style={{ color: "#64748b" }}>Quantidade total</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginTop: 6,
                  color: "#111827",
                }}
              >
                {totalQuantity}
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid #e5e7eb",
                background: "#f8fafc",
                fontWeight: 800,
                color: "#111827",
                fontSize: 15,
              }}
            >
              Itens escolhidos
            </div>

            {selectedItems.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  color: "#64748b",
                }}
              >
                Nenhum produto selecionado ainda.
              </div>
            ) : (
              <div style={{ display: "grid" }}>
                {selectedItems.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      padding: 14,
                      borderTop: "1px solid #e5e7eb",
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 80px",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "#111827",
                          fontSize: 14,
                        }}
                      >
                        {item.product?.name ?? "Produto"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        SKU: {item.product?.sku ?? "-"}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        fontWeight: 900,
                        color: "#2563eb",
                      }}
                    >
                      x{item.qty}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={label()}>Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escreva aqui alguma observação para o representante."
              rows={5}
              style={textarea()}
            />
          </div>
        </Card>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => router.push("/portal/dashboard")}
            style={btnSecondary()}
            type="button"
          >
            Cancelar
          </button>

          <button
            onClick={save}
            style={btnPrimary()}
            disabled={saving}
            type="button"
          >
            {saving ? "Enviando..." : "Enviar solicitação"}
          </button>
        </div>
      </div>
    </div>
  );
}

function label(): React.CSSProperties {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    color: "#111827",
    fontSize: 14,
  };
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14,
  };
}

function textarea(): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };
}

function btnSecondary(): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
  };
}

function qtyBtn(): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
    flexShrink: 0,
  };
}