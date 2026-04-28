"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  Minus,
  Package2,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Truck,
  User2,
} from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  regionId?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  priceCents?: number | null;
  active?: boolean;
  imageUrl?: string | null;
};

type StockLocation = {
  id: string;
  name: string;
  active?: boolean | null;
};

type RegionItem = {
  id: string;
  name: string;
  stockLocationId?: string | null;
};

type StockResponse = {
  locations?: Array<{ id: string; name: string }>;
  products?: Array<{
    id: string;
    name: string;
    stock?: Record<string, number>;
    total?: number;
  }>;
};

type AuthResponse = {
  user?: {
    id: string;
    role: string;
    regionId?: string | null;
    stockLocationId?: string | null;
  } | null;
};

type OrderCreateResponse = {
  ok?: boolean;
  message?: string;
  order?: {
    id: string;
    number: number;
  };
};

type CartItem = {
  productId: string;
  qty: number;
  unitCents: number;
};

type DefectReturnItem = {
  productId: string;
  quantity: number;
  reason: string;
  notes: string;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARD_DEBIT", label: "Débito" },
  { value: "CARD_CREDIT", label: "Crédito" },
  { value: "BOLETO", label: "Boleto" },
] as const;

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function compareSku(a: string, b: string) {
  const prefixA = a.replace(/\d+/g, "").toUpperCase();
  const prefixB = b.replace(/\d+/g, "").toUpperCase();

  if (prefixA !== prefixB) {
    return prefixA.localeCompare(prefixB, "pt-BR");
  }

  const numberA = Number(a.match(/\d+/)?.[0] ?? "999999");
  const numberB = Number(b.match(/\d+/)?.[0] ?? "999999");

  if (numberA !== numberB) return numberA - numberB;
  return a.localeCompare(b, "pt-BR");
}

function toCurrencyInput(value: string) {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

function ProductQtyControl({
  qty,
  onDecrease,
  onIncrease,
  onChange,
  themeColors,
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onChange: (next: number) => void;
  themeColors: ReturnType<typeof getThemeColors>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={onDecrease}
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          background: themeColors.cardBg,
          color: themeColors.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Minus size={16} />
      </button>

      <input
        inputMode="numeric"
        value={qty}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value || 0)))}
        style={{
          width: 54,
          height: 34,
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          background: themeColors.inputBg,
          color: themeColors.text,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 800,
          outline: "none",
        }}
      />

      <button
        type="button"
        onClick={onIncrease}
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          border: `1px solid ${themeColors.border}`,
          background: themeColors.primary,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function MobileAdminOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const clientIdFromQuery = searchParams.get("clientId") ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [stockByProductAndLocation, setStockByProductAndLocation] = useState<
    Record<string, Record<string, number>>
  >({});

  const [selectedClientId, setSelectedClientId] = useState(clientIdFromQuery);
  const [selectedStockLocationId, setSelectedStockLocationId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discountValue, setDiscountValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [defectReturnItems, setDefectReturnItems] = useState<DefectReturnItem[]>([]);

  const [savedOrderId, setSavedOrderId] = useState("");
  const [savedOrderNumber, setSavedOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBase() {
      try {
        setLoading(true);
        setError(null);

        const [authRes, clientsRes, productsRes, stockRes, stockLocationsRes, regionsRes] =
          await Promise.all([
            fetch("/api/auth/me", { cache: "no-store" }),
            fetch("/api/clients", { cache: "no-store" }),
            fetch("/api/products", { cache: "no-store" }),
            fetch("/api/stock", { cache: "no-store" }),
            fetch("/api/stock-locations", { cache: "no-store" }),
            fetch("/api/regions", { cache: "no-store" }),
          ]);

        const authJson = (await authRes.json().catch(() => null)) as AuthResponse | null;
        const clientsJson = await clientsRes.json().catch(() => null);
        const productsJson = await productsRes.json().catch(() => null);
        const stockJson = (await stockRes.json().catch(() => null)) as StockResponse | null;
        const stockLocationsJson = await stockLocationsRes.json().catch(() => null);
        const regionsJson = await regionsRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/orders/new");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const nextClients: Client[] = Array.isArray(clientsJson)
          ? clientsJson
          : Array.isArray(clientsJson?.items)
          ? clientsJson.items
          : [];

        const nextProducts: Product[] = Array.isArray(productsJson)
          ? productsJson
          : Array.isArray(productsJson?.items)
          ? productsJson.items
          : [];

        const nextStockLocations: StockLocation[] = Array.isArray(stockLocationsJson?.items)
          ? stockLocationsJson.items
          : Array.isArray(stockLocationsJson)
          ? stockLocationsJson
          : [];

        const nextRegions: RegionItem[] = Array.isArray(regionsJson?.items)
          ? regionsJson.items
          : [];

        const stockMap: Record<string, Record<string, number>> = {};
        for (const product of stockJson?.products ?? []) {
          stockMap[product.id] = product.stock ?? {};
        }

        if (!active) return;

        const activeProducts = nextProducts
          .filter((item) => item.active !== false)
          .sort((a, b) => {
            const categoryCompare = String(a.category ?? "").localeCompare(
              String(b.category ?? ""),
              "pt-BR"
            );
            if (categoryCompare !== 0) return categoryCompare;
            return compareSku(a.sku ?? "", b.sku ?? "");
          });

        setClients(nextClients);
        setProducts(activeProducts);
        setStockLocations(nextStockLocations);
        setRegions(nextRegions);
        setStockByProductAndLocation(stockMap);
        setCart(
          activeProducts.map((product) => ({
            productId: product.id,
            qty: 0,
            unitCents: product.priceCents ?? 0,
          }))
        );

        if (!selectedStockLocationId && nextStockLocations.length > 0) {
          setSelectedStockLocationId(nextStockLocations[0].id);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar dados do pedido."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBase();

    return () => {
      active = false;
    };
  }, [router, selectedStockLocationId]);

  const selectedClient = useMemo(() => {
    return clients.find((item) => item.id === selectedClientId) ?? null;
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (!selectedClient?.regionId) return;

    const region = regions.find((item) => item.id === selectedClient.regionId);
    if (region?.stockLocationId) {
      setSelectedStockLocationId(region.stockLocationId);
    }
  }, [selectedClient?.regionId, regions]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((item) => item.category).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")) as string[];
  }, [products]);

  const itemsWithProduct = useMemo(() => {
    return cart.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const locationStock =
        stockByProductAndLocation[item.productId]?.[selectedStockLocationId] ?? 0;

      return {
        ...item,
        product,
        stockQty: locationStock,
        subtotalCents: item.qty * item.unitCents,
      };
    });
  }, [cart, products, stockByProductAndLocation, selectedStockLocationId]);

  const filteredItems = useMemo(() => {
    return itemsWithProduct.filter((item) => {
      const product = item.product;
      if (!product) return false;

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        String(product.sku ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !categoryFilter || product.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [itemsWithProduct, search, categoryFilter]);

  const selectedItems = useMemo(() => {
    return itemsWithProduct.filter((item) => item.qty > 0 && item.product);
  }, [itemsWithProduct]);

  const defectItemsWithProduct = useMemo(() => {
    return defectReturnItems.map((item) => ({
      ...item,
      product: products.find((product) => product.id === item.productId) ?? null,
    }));
  }, [defectReturnItems, products]);

  const selectedDefectReturnItems = useMemo(() => {
    return defectItemsWithProduct.filter((item) => item.quantity > 0 && item.product);
  }, [defectItemsWithProduct]);

  const subtotalCents = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.subtotalCents, 0);
  }, [selectedItems]);

  const discountCents = useMemo(() => {
    return toCurrencyInput(discountValue);
  }, [discountValue]);

  const totalCents = Math.max(0, subtotalCents - discountCents);

  const savedPdfUrl = useMemo(() => {
    if (!savedOrderId) return "";
    return `/api/orders/${savedOrderId}/pdf`;
  }, [savedOrderId]);

  const whatsappUrl = useMemo(() => {
    if (!savedOrderId || !selectedClient) return "";

    const phone = normalizeWhatsapp(selectedClient.whatsapp || selectedClient.phone);
    const absolutePdf =
      typeof window !== "undefined" ? `${window.location.origin}${savedPdfUrl}` : savedPdfUrl;

    const message = encodeURIComponent(
      `Olá! Segue o PDF do seu pedido${savedOrderNumber ? ` nº ${savedOrderNumber}` : ""}: ${absolutePdf}`
    );

    return phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
  }, [savedOrderId, savedOrderNumber, selectedClient, savedPdfUrl]);

  function updateQty(productId: string, nextQty: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: Math.max(0, nextQty || 0) }
          : item
      )
    );
  }

  function incrementQty(productId: string) {
    const current = cart.find((item) => item.productId === productId)?.qty ?? 0;
    updateQty(productId, current + 1);
  }

  function decrementQty(productId: string) {
    const current = cart.find((item) => item.productId === productId)?.qty ?? 0;
    updateQty(productId, Math.max(0, current - 1));
  }

  function updateDefectQty(productId: string, quantity: number) {
    setDefectReturnItems((prev) => {
      const nextQuantity = Math.max(0, quantity || 0);
      const existing = prev.find((item) => item.productId === productId);

      if (!existing && nextQuantity <= 0) {
        return prev;
      }

      if (!existing) {
        return [
          ...prev,
          {
            productId,
            quantity: nextQuantity,
            reason: "",
            notes: "",
          },
        ];
      }

      if (nextQuantity <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }

      return prev.map((item) =>
        item.productId === productId ? { ...item, quantity: nextQuantity } : item
      );
    });
  }

  function incrementDefectQty(productId: string) {
    const current =
      defectReturnItems.find((item) => item.productId === productId)?.quantity ?? 0;
    updateDefectQty(productId, current + 1);
  }

  function decrementDefectQty(productId: string) {
    const current =
      defectReturnItems.find((item) => item.productId === productId)?.quantity ?? 0;
    updateDefectQty(productId, Math.max(0, current - 1));
  }

  function updateDefectField(
    productId: string,
    field: "reason" | "notes",
    value: string
  ) {
    setDefectReturnItems((prev) => {
      const existing = prev.find((item) => item.productId === productId);

      if (!existing) {
        return [
          ...prev,
          {
            productId,
            quantity: 0,
            reason: field === "reason" ? value : "",
            notes: field === "notes" ? value : "",
          },
        ];
      }

      return prev.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item
      );
    });
  }

  function resetOrder() {
    setSavedOrderId("");
    setSavedOrderNumber(null);
    setSearch("");
    setCategoryFilter("");
    setDiscountValue("");
    setDueDate("");
    setInstallmentCount(1);
    setPaymentMethod("CASH");
    setDefectReturnItems([]);
    setCart((prev) => prev.map((item) => ({ ...item, qty: 0 })));
  }

  async function handleSave() {
    try {
      setError(null);

      if (!selectedClientId) {
        setError("Selecione o cliente.");
        return;
      }

      if (!selectedClient?.regionId) {
        setError("O cliente selecionado não possui região vinculada.");
        return;
      }

      if (!selectedStockLocationId) {
        setError("Selecione o estoque de origem.");
        return;
      }

      if (selectedItems.length === 0) {
        setError("Adicione pelo menos um produto ao pedido.");
        return;
      }

      if (
        (paymentMethod === "BOLETO" || paymentMethod === "CARD_CREDIT") &&
        !dueDate
      ) {
        setError("Informe a data do primeiro vencimento.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "SALE",
          clientId: selectedClientId,
          regionId: selectedClient.regionId,
          stockLocationId: selectedStockLocationId,
          items: selectedItems.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            unitCents: item.unitCents,
          })),
          subtotalCents,
          discountCents,
          totalCents,
          paymentMethod,
          dueDate:
            paymentMethod === "BOLETO" || paymentMethod === "CARD_CREDIT"
              ? dueDate || null
              : null,
          installmentCount:
            paymentMethod === "BOLETO" || paymentMethod === "CARD_CREDIT"
              ? installmentCount
              : 1,
          installmentDates: [],
          defectReturnItems: selectedDefectReturnItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason?.trim() || null,
            notes: item.notes?.trim() || null,
          })),
        }),
      });

      const json = (await res.json().catch(() => null)) as OrderCreateResponse | null;

      if (!res.ok) {
        throw new Error(json?.message || (json as any)?.error || "Erro ao salvar pedido.");
      }

      const createdOrderId = json?.order?.id ?? "";
      const createdOrderNumber = json?.order?.number ?? null;

      if (!createdOrderId) {
        throw new Error("Pedido salvo, mas o retorno veio incompleto.");
      }

      setSavedOrderId(createdOrderId);
      setSavedOrderNumber(createdOrderNumber);

      alert("Pedido realizado com sucesso!");

     
     router.push(`/m/admin/orders/${createdOrderId}`);
     
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar pedido.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Carregando dados do pedido...</div>
      </MobileCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error ? (
        <MobileCard
          style={{
            borderColor: "#ef4444",
          }}
        >
          <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 800 }}>{error}</div>
        </MobileCard>
      ) : null}

      {savedOrderId ? (
        <MobileCard
          style={{
            background: colors.isDark
              ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
              : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <CheckCircle2 size={22} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              Pedido salvo com sucesso
            </div>
          </div>

          <div style={{ fontSize: 14, opacity: 0.94, lineHeight: 1.5 }}>
            {savedOrderNumber ? `Pedido nº ${savedOrderNumber}` : "Pedido criado"} para{" "}
            <strong>{selectedClient?.name ?? "cliente"}</strong>.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => window.open(savedPdfUrl, "_blank", "noopener,noreferrer")}
              style={{
                border: "none",
                borderRadius: 16,
                padding: 14,
                background: colors.cardBg,
                color: colors.text,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <FileText size={18} />
              PDF
            </button>

            <button
              type="button"
              onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
              style={{
                border: "none",
                borderRadius: 16,
                padding: 14,
                background: colors.cardBg,
                color: colors.text,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={resetOrder}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                padding: 14,
                background: colors.cardBg,
                color: colors.text,
                fontWeight: 800,
                cursor: "pointer",
                gridColumn: "1 / -1",
              }}
            >
              Criar novo pedido
            </button>
          </div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <MobileSectionTitle title="Cliente" />

        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              position: "relative",
            }}
          >
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
              placeholder="Buscar produto por nome ou SKU"
              style={{
                width: "100%",
                height: 44,
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

          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
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
          >
            <option value="">Selecione um cliente</option>
            {clients
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.region?.name ? ` • ${client.region.name}` : ""}
                </option>
              ))}
          </select>

          {selectedClient ? (
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.isDark ? "#0f172a" : "#f8fafc",
                padding: 14,
                display: "grid",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                <User2 size={16} />
                {selectedClient.name}
              </div>

              <div style={{ fontSize: 12, color: colors.subtext }}>
                Região: {selectedClient.region?.name || "Sem região"}
              </div>
            </div>
          ) : null}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Origem do estoque" />

        <select
          value={selectedStockLocationId}
          onChange={(e) => setSelectedStockLocationId(e.target.value)}
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
        >
          <option value="">Selecione o estoque</option>
          {stockLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Categorias" />

        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setCategoryFilter("")}
            style={{
              border: `1px solid ${colors.border}`,
              background:
                !categoryFilter
                  ? colors.isDark
                    ? "#1d4ed8"
                    : "#dbeafe"
                  : colors.cardBg,
              color: !categoryFilter ? (colors.isDark ? "#ffffff" : "#1d4ed8") : colors.text,
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            Todas
          </button>

          {categories.map((category) => {
            const active = categoryFilter === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: active
                    ? colors.isDark
                      ? "#1d4ed8"
                      : "#dbeafe"
                    : colors.cardBg,
                  color: active ? (colors.isDark ? "#ffffff" : "#1d4ed8") : colors.text,
                  borderRadius: 999,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
      </MobileCard>

      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: colors.text,
          }}
        >
          Produtos do pedido
        </div>

        {filteredItems.length === 0 ? (
          <MobileCard>
            <div style={{ fontSize: 14, color: colors.subtext }}>
              Nenhum produto encontrado.
            </div>
          </MobileCard>
        ) : (
          filteredItems.map((item) => {
            const product = item.product;
            if (!product) return null;

            const insufficient = item.qty > item.stockQty;

            return (
              <MobileCard key={product.id} style={{ padding: 14 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0,1fr)",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 18,
                      border: `1px solid ${colors.border}`,
                      overflow: "hidden",
                      background: colors.isDark ? "#0f172a" : "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Package2 size={24} color={colors.subtext} />
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: colors.text,
                        lineHeight: 1.3,
                      }}
                    >
                      {product.name}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      {product.sku} • {product.category || "Sem categoria"}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: colors.primary,
                        }}
                      >
                        {formatMoneyBR(item.unitCents)}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color: insufficient ? "#ef4444" : colors.subtext,
                          fontWeight: 700,
                        }}
                      >
                        Estoque: {item.stockQty}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <ProductQtyControl
                    qty={item.qty}
                    onDecrease={() => decrementQty(product.id)}
                    onIncrease={() => incrementQty(product.id)}
                    onChange={(next) => updateQty(product.id, next)}
                    themeColors={colors}
                  />

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      Subtotal
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 14,
                        fontWeight: 900,
                        color: insufficient ? "#ef4444" : colors.text,
                      }}
                    >
                      {formatMoneyBR(item.subtotalCents)}
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })
        )}
      </div>

      <MobileCard>
        <MobileSectionTitle title="Itens de troca" />

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, color: colors.subtext }}>
            Registre aqui os itens devolvidos na troca. Eles acompanham o mesmo pedido e não geram financeiro.
          </div>

          {filteredItems.length === 0 ? (
            <div style={{ fontSize: 14, color: colors.subtext }}>
              Nenhum produto encontrado para registrar na troca.
            </div>
          ) : (
            filteredItems.map((item) => {
              const product = item.product;
              if (!product) return null;

              const defectItem =
                defectItemsWithProduct.find((entry) => entry.productId === product.id) ?? null;

              return (
                <div
                  key={`defect-${product.id}`}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${colors.border}`,
                    background: colors.isDark ? "#0f172a" : "#f8fafc",
                    padding: 12,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: colors.text,
                        lineHeight: 1.3,
                      }}
                    >
                      {product.name}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      {product.sku} • {product.category || "Sem categoria"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <ProductQtyControl
                      qty={defectItem?.quantity ?? 0}
                      onDecrease={() => decrementDefectQty(product.id)}
                      onIncrease={() => incrementDefectQty(product.id)}
                      onChange={(next) => updateDefectQty(product.id, next)}
                      themeColors={colors}
                    />

                    <div
                      style={{
                        fontSize: 12,
                        color: colors.subtext,
                        fontWeight: 700,
                      }}
                    >
                      Quantidade da troca
                    </div>
                  </div>

                  {(defectItem?.quantity ?? 0) > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <input
                        type="text"
                        value={defectItem?.reason ?? ""}
                        onChange={(e) =>
                          updateDefectField(product.id, "reason", e.target.value)
                        }
                        placeholder="Motivo da troca"
                        style={{
                          width: "100%",
                          height: 42,
                          borderRadius: 12,
                          border: `1px solid ${colors.border}`,
                          background: colors.inputBg,
                          color: colors.text,
                          padding: "0 12px",
                          outline: "none",
                          fontSize: 13,
                        }}
                      />

                      <textarea
                        value={defectItem?.notes ?? ""}
                        onChange={(e) =>
                          updateDefectField(product.id, "notes", e.target.value)
                        }
                        placeholder="Observações da troca (opcional)"
                        rows={3}
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          border: `1px solid ${colors.border}`,
                          background: colors.inputBg,
                          color: colors.text,
                          padding: 12,
                          outline: "none",
                          fontSize: 13,
                          resize: "vertical",
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Pagamento" />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 10,
          }}
        >
          {PAYMENT_METHODS.map((method) => {
            const active = paymentMethod === method.value;

            return (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: `1px solid ${active ? colors.primary : colors.border}`,
                  background: active
                    ? colors.isDark
                      ? "#111f39"
                      : "#e8f0ff"
                    : colors.cardBg,
                  color: active ? colors.primary : colors.text,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {method.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            marginTop: 14,
          }}
        >
          <input
            type="text"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Desconto em R$ (opcional)"
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

          {paymentMethod === "BOLETO" || paymentMethod === "CARD_CREDIT" ? (
            <>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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

              <select
                value={installmentCount}
                onChange={(e) => setInstallmentCount(Math.max(1, Number(e.target.value)))}
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
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}x
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Resumo do pedido" />

        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Itens selecionados</span>
            <strong>{selectedItems.length}</strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Subtotal</span>
            <strong>{formatMoneyBR(subtotalCents)}</strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Itens de troca</span>
            <strong>{selectedDefectReturnItems.length}</strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <span style={{ color: colors.subtext }}>Desconto</span>
            <strong>{formatMoneyBR(discountCents)}</strong>
          </div>

          <div
            style={{
              height: 1,
              background: colors.border,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: colors.subtext,
                }}
              >
                Total final
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 22,
                  fontWeight: 900,
                  color: colors.primary,
                }}
              >
                {formatMoneyBR(totalCents)}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                minWidth: 144,
                height: 48,
                borderRadius: 16,
                border: "none",
                background: colors.primary,
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.75 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ShoppingCart size={18} />
              {saving ? "Salvando..." : "Salvar pedido"}
            </button>
          </div>
        </div>
      </MobileCard>

      {selectedItems.length > 0 ? (
        <MobileCard>
          <MobileSectionTitle title="Itens no carrinho" />

          <div style={{ display: "grid", gap: 10 }}>
            {selectedItems.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: colors.text,
                    }}
                  >
                    {item.product?.name}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: colors.subtext,
                    }}
                  >
                    {item.qty}x • {formatMoneyBR(item.unitCents)}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: colors.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMoneyBR(item.subtotalCents)}
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      {selectedDefectReturnItems.length > 0 ? (
        <MobileCard>
          <MobileSectionTitle title="Itens recebidos na troca" />

          <div style={{ display: "grid", gap: 10 }}>
            {selectedDefectReturnItems.map((item) => (
              <div
                key={`selected-defect-${item.productId}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: colors.text,
                    }}
                  >
                    {item.product?.name}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: colors.subtext,
                    }}
                  >
                    {item.quantity}x
                    {item.reason ? ` • ${item.reason}` : ""}
                    {item.notes ? ` • ${item.notes}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 10,
          }}
        >
          <Link href="/m/admin/orders">
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                minHeight: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 800,
                color: colors.text,
              }}
            >
              <ChevronLeft size={16} />
              Pedidos
            </div>
          </Link>

          <Link href="/m/admin/clients">
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                minHeight: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 800,
                color: colors.text,
              }}
            >
              <Store size={16} />
              Clientes
            </div>
          </Link>

          <Link href="/m/admin/map">
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                minHeight: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 800,
                color: colors.text,
              }}
            >
              <Truck size={16} />
              Mapa
            </div>
          </Link>
        </div>
      </MobileCard>
    </div>
  );
}