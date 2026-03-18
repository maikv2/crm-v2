"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

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

type CatalogItem = {
  productId: string;
  qty: number;
  unitCents: number;
};

type ExchangeRow = {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  notes: string;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId?: string | null;
  stockLocationId?: string | null;
};

type RegionItem = {
  id: string;
  name: string;
  stockLocationId?: string | null;
};

type NewOrderPageProps = {
  mode?: "ADMIN" | "REPRESENTATIVE";
};

type SaveOrderResponse =
  | {
      id?: string;
      number?: number;
      order?: {
        id?: string;
        number?: number;
      };
    }
  | null;

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

function Card({
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

function createExchangeRow(): ExchangeRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: "",
    quantity: 1,
    reason: "",
    notes: "",
  };
}

function getOrderIdFromResponse(data: SaveOrderResponse) {
  return data?.order?.id || data?.id || "";
}

function getOrderNumberFromResponse(data: SaveOrderResponse) {
  return data?.order?.number || data?.number || null;
}

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export default function NewOrderPage({
  mode = "ADMIN",
}: NewOrderPageProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { theme: modeTheme } = useTheme();
  const theme = getThemeColors(modeTheme);

  const clientIdFromUrl = params.get("clientId") ?? "";
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const isRepresentative = mode === "REPRESENTATIVE";

  const [loggedUser, setLoggedUser] = useState<LoggedUser | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(clientIdFromUrl);

  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [stockLocationId, setStockLocationId] = useState("");
  const [stockLocationName, setStockLocationName] = useState("");
  const [representativeRegionName, setRepresentativeRegionName] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const paymentReceiver = paymentMethod === "CASH" ? "REGION" : "MATRIX";

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [exchangeRows, setExchangeRows] = useState<ExchangeRow[]>([]);

  const [discountReais, setDiscountReais] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dueDate, setDueDate] = useState("");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installmentDates, setInstallmentDates] = useState<string[]>([""]);

  const [savedOrderId, setSavedOrderId] = useState("");
  const [savedOrderNumber, setSavedOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    async function loadBase() {
      try {
        setLoading(true);

        if (isRepresentative) {
          const [
            authRes,
            clientsRes,
            prodRes,
            stockLocationsRes,
            regionsRes,
          ] = await Promise.all([
            fetch("/api/auth/me", { cache: "no-store" }),
            fetch("/api/rep/clients", { cache: "no-store" }),
            fetch("/api/products", { cache: "no-store" }),
            fetch("/api/stock-locations", { cache: "no-store" }),
            fetch("/api/regions", { cache: "no-store" }),
          ]);

          const authData = await authRes.json().catch(() => null);
          const clientsData = await clientsRes.json().catch(() => null);
          const prodData = await prodRes.json().catch(() => null);
          const stockLocationsData = await stockLocationsRes.json().catch(
            () => null
          );
          const regionsData = await regionsRes.json().catch(() => null);

          const currentUser = (authData?.user ?? null) as LoggedUser | null;

          const clientList: Client[] = Array.isArray(clientsData?.items)
            ? clientsData.items
            : Array.isArray(clientsData)
            ? clientsData
            : [];

          const productList: Product[] = Array.isArray(prodData?.items)
            ? prodData.items
            : Array.isArray(prodData)
            ? prodData
            : [];

          const locationList: StockLocation[] = Array.isArray(stockLocationsData)
            ? stockLocationsData
            : Array.isArray(stockLocationsData?.items)
            ? stockLocationsData.items
            : [];

          const regionList: RegionItem[] = Array.isArray(regionsData?.items)
            ? regionsData.items
            : [];

          const currentRegion = regionList.find(
            (region) => region.id === currentUser?.regionId
          );

          const resolvedStockLocationId =
            currentUser?.stockLocationId || currentRegion?.stockLocationId || "";

          const resolvedStockLocation = locationList.find(
            (location) => location.id === resolvedStockLocationId
          );

          const activeProducts = productList.filter(
            (product) => product.active !== false
          );

          setLoggedUser(currentUser);
          setClients(clientList);
          setProducts(activeProducts);
          setStockLocations(locationList);
          setRepresentativeRegionName(currentRegion?.name || "");
          setStockLocationId(resolvedStockLocationId);
          setStockLocationName(resolvedStockLocation?.name || "");

          setCatalog(
            activeProducts.map((product) => ({
              productId: product.id,
              qty: 0,
              unitCents: product.priceCents ?? 0,
            }))
          );

          return;
        }

        const [clientsRes, prodRes, stockRes] = await Promise.all([
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/stock", { cache: "no-store" }),
        ]);

        const clientsData = await clientsRes.json().catch(() => null);
        const prodData = await prodRes.json().catch(() => null);
        const stockData = await stockRes.json().catch(() => null);

        const clientList: Client[] = Array.isArray(clientsData)
          ? clientsData
          : Array.isArray(clientsData?.items)
          ? clientsData.items
          : [];

        const productList: Product[] = Array.isArray(prodData)
          ? prodData
          : Array.isArray(prodData?.items)
          ? prodData.items
          : [];

        const locationList: StockLocation[] = Array.isArray(stockData?.locations)
          ? stockData.locations
          : Array.isArray(stockData)
          ? stockData
          : [];

        setClients(clientList);
        setProducts(productList);
        setStockLocations(locationList);
        setCatalog(
          productList.map((product) => ({
            productId: product.id,
            qty: 0,
            unitCents: product.priceCents ?? 0,
          }))
        );
      } finally {
        setLoading(false);
      }
    }

    loadBase();
  }, [isRepresentative]);

  useEffect(() => {
    async function loadClient() {
      if (!selectedClientId) {
        setClient(null);
        return;
      }

      if (isRepresentative) {
        const selected =
          clients.find((item) => item.id === selectedClientId) ?? null;
        setClient(selected);
        return;
      }

      const clientRes = await fetch(`/api/clients/${selectedClientId}`, {
        cache: "no-store",
      });

      if (!clientRes.ok) {
        setClient(null);
        return;
      }

      const clientData = await clientRes.json();
      setClient(clientData);
    }

    loadClient();
  }, [selectedClientId, clients, isRepresentative]);

  useEffect(() => {
    if (paymentMethod !== "BOLETO" && paymentMethod !== "CARD_CREDIT") {
      setDueDate("");
      setInstallmentCount(1);
      setInstallmentDates([""]);
    }
  }, [paymentMethod]);

  useEffect(() => {
    if (!clientIdFromUrl) return;
    setSelectedClientId(clientIdFromUrl);
  }, [clientIdFromUrl]);

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

  function addExchangeRow() {
    setExchangeRows((prev) => [...prev, createExchangeRow()]);
  }

  function removeExchangeRow(id: string) {
    setExchangeRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateExchangeRow(
    id: string,
    field: keyof Omit<ExchangeRow, "id">,
    value: string | number
  ) {
    setExchangeRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "quantity"
                  ? Math.max(1, Number(value) || 1)
                  : value,
            }
          : row
      )
    );
  }

  function updateInstallmentCount(nextCount: number) {
    const count = Math.max(1, nextCount || 1);
    setInstallmentCount(count);

    setInstallmentDates((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });
  }

  function updateInstallmentDate(index: number, value: string) {
    setInstallmentDates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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

    const groups = ordered.reduce<Record<string, typeof ordered>>(
      (acc, item) => {
        const categoryName = item.product?.category?.trim() || "Sem categoria";

        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }

        acc[categoryName].push(item);
        return acc;
      },
      {}
    );

    return Object.entries(groups);
  }, [visibleItems]);

  const subtotal = useMemo(() => {
    return itemsWithProduct.reduce((acc, item) => acc + item.subtotalCents, 0);
  }, [itemsWithProduct]);

  const discountCents = useMemo(() => {
    const reais = Number(discountReais.replace(",", "."));
    const percent = Number(discountPercent.replace(",", "."));

    if (!Number.isNaN(reais) && reais > 0) {
      return Math.round(reais * 100);
    }

    if (!Number.isNaN(percent) && percent > 0) {
      return Math.round((subtotal * percent) / 100);
    }

    return 0;
  }, [discountReais, discountPercent, subtotal]);

  const finalTotalCents = Math.max(0, subtotal - discountCents);

  const selectedItemsCount = useMemo(() => {
    return itemsWithProduct.filter((item) => item.qty > 0).length;
  }, [itemsWithProduct]);

  const validExchangeItems = useMemo(() => {
    return exchangeRows.filter(
      (row) => row.productId && Number(row.quantity) > 0
    );
  }, [exchangeRows]);

  const savedPdfUrl = useMemo(() => {
    if (!savedOrderId) return "";
    return `/api/orders/${savedOrderId}/pdf`;
  }, [savedOrderId]);

  const savedPdfAbsoluteUrl = useMemo(() => {
    if (!savedOrderId || typeof window === "undefined") return "";
    return `${window.location.origin}/api/orders/${savedOrderId}/pdf`;
  }, [savedOrderId]);

  const whatsappUrl = useMemo(() => {
    if (!savedOrderId || !savedPdfAbsoluteUrl) return "";

    const clientPhone = normalizeWhatsapp(client?.whatsapp || client?.phone);
    const orderLabel = savedOrderNumber ? ` nº ${savedOrderNumber}` : "";
    const message = `Olá! Segue o PDF do seu pedido${orderLabel}: ${savedPdfAbsoluteUrl}`;
    const encodedMessage = encodeURIComponent(message);

    return clientPhone
      ? `https://wa.me/${clientPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
  }, [client, savedOrderId, savedOrderNumber, savedPdfAbsoluteUrl]);

  function openPdf() {
    if (!savedPdfUrl) return;
    window.open(savedPdfUrl, "_blank", "noopener,noreferrer");
  }

  function openWhatsapp() {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function save() {
    const validItems = itemsWithProduct
      .filter((item) => item.qty > 0)
      .map((item) => ({
        productId: item.productId,
        qty: item.qty,
        unitCents: item.unitCents,
      }));

    const defectReturnItems = validExchangeItems.map((row) => ({
      productId: row.productId,
      quantity: row.quantity,
      reason: row.reason.trim() || undefined,
      notes: row.notes.trim() || undefined,
    }));

    if (!selectedClientId) {
      alert("Selecione o cliente.");
      return;
    }

    if (!stockLocationId) {
      alert(
        isRepresentative
          ? "O representante não possui estoque vinculado."
          : "Selecione o estoque de origem."
      );
      return;
    }

    if (validItems.length === 0) {
      alert("Informe a quantidade de pelo menos um produto.");
      return;
    }

    if (
      (paymentMethod === "BOLETO" || paymentMethod === "CARD_CREDIT") &&
      !dueDate
    ) {
      alert("Informe a data do primeiro vencimento.");
      return;
    }

    setSaving(true);

    try {
      const body: {
        type: "DEFECT_EXCHANGE" | "SALE";
        clientId: string;
        regionId: string | null | undefined;
        stockLocationId: string;
        items: Array<{
          productId: string;
          qty: number;
          unitCents: number;
        }>;
        defectReturnItems: Array<{
          productId: string;
          quantity: number;
          reason?: string;
          notes?: string;
        }>;
        subtotalCents?: number;
        discountCents?: number;
        totalCents?: number;
        paymentMethod?: string;
        paymentReceiver?: string;
        dueDate?: string | null;
        installmentCount?: number;
        installmentDates?: string[];
      } = {
        type: defectReturnItems.length > 0 ? "DEFECT_EXCHANGE" : "SALE",
        clientId: selectedClientId,
        regionId: isRepresentative
          ? loggedUser?.regionId || client?.regionId || null
          : client?.regionId,
        stockLocationId,
        items: validItems,
        defectReturnItems,
      };

      if (defectReturnItems.length === 0) {
        body.subtotalCents = subtotal;
        body.discountCents = discountCents;
        body.totalCents = finalTotalCents;
        body.paymentMethod = paymentMethod;
        body.paymentReceiver = paymentReceiver;
        body.dueDate = dueDate || null;
        body.installmentCount = installmentCount;
        body.installmentDates = installmentDates.filter(Boolean);
      } else {
        body.subtotalCents = 0;
        body.discountCents = 0;
        body.totalCents = 0;
        body.paymentMethod = "CASH";
        body.paymentReceiver = "REGION";
        body.dueDate = null;
        body.installmentCount = 1;
        body.installmentDates = [];
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Erro ao salvar pedido.");
        return;
      }

      const data = (await res.json().catch(() => null)) as SaveOrderResponse;
      const createdOrderId = getOrderIdFromResponse(data);
      const createdOrderNumber = getOrderNumberFromResponse(data);

      if (createdOrderId) {
        setSavedOrderId(createdOrderId);
        setSavedOrderNumber(createdOrderNumber);
        alert("Pedido salvo com sucesso.");
        return;
      }

      if (isRepresentative) {
        router.push("/rep/orders");
        return;
      }

      router.push(`/clients/${selectedClientId}`);
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
          background: theme.pageBg,
          color: theme.text,
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
            🏠 / Pedidos / Novo pedido
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Cadastro de Pedido
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Monte o pedido por catálogo e, se houver, informe as trocas por defeito.
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
            label="Cancelar"
            theme={theme}
            onClick={() => router.back()}
          />
          <ActionButton
            label={saving ? "Salvando..." : "Salvar pedido"}
            theme={theme}
            onClick={save}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {savedOrderId ? (
          <Card title="Pedido salvo com sucesso" theme={theme}>
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                padding: 18,
                background: theme.isDark ? "#0e1728" : "#f8fafc",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                {savedOrderNumber
                  ? `Pedido #${savedOrderNumber} disponível`
                  : "Pedido disponível"}
              </div>

              <div
                style={{
                  color: theme.subtext,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                O PDF já está disponível automaticamente. Você pode baixar agora
                ou abrir o WhatsApp com a mensagem pronta para envio ao cliente.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={openPdf}
                style={btnPrimary(theme)}
                type="button"
              >
                Baixar PDF
              </button>

              <button
                onClick={openWhatsapp}
                style={btnSecondary(theme)}
                type="button"
              >
                Enviar no WhatsApp
              </button>

              <button
                onClick={() =>
                  isRepresentative
                    ? router.push("/rep/orders")
                    : router.push(`/clients/${selectedClientId}`)
                }
                style={btnSecondary(theme)}
                type="button"
              >
                Concluir
              </button>
            </div>
          </Card>
        ) : null}

        <Card title="Informações do pedido" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label style={label(theme)}>Cliente</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                style={input(theme, inputBg)}
              >
                <option value="">Selecione o cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label(theme)}>Região</label>
              <input
                value={client?.region?.name ?? representativeRegionName ?? ""}
                readOnly
                style={inputReadOnly(theme, inputBg)}
                placeholder="Região do cliente"
              />
            </div>

            <div>
              <label style={label(theme)}>Estoque de origem</label>

              {isRepresentative ? (
                <input
                  value={stockLocationName}
                  readOnly
                  style={inputReadOnly(theme, inputBg)}
                  placeholder="Estoque da região do representante"
                />
              ) : (
                <select
                  value={stockLocationId}
                  onChange={(e) => setStockLocationId(e.target.value)}
                  style={input(theme, inputBg)}
                >
                  <option value="">Selecione o estoque</option>
                  {stockLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div>
              <label style={label(theme)}>Forma de pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={input(theme, inputBg)}
                disabled={validExchangeItems.length > 0}
              >
                <option value="CASH">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="BOLETO">Boleto</option>
                <option value="CARD_DEBIT">Cartão débito</option>
                <option value="CARD_CREDIT">Cartão crédito</option>
              </select>
            </div>

            <div>
              <label style={label(theme)}>Quem recebeu</label>
              <input
                value={
                  validExchangeItems.length > 0
                    ? "Sem financeiro"
                    : paymentReceiver === "REGION"
                    ? "Região"
                    : "Matriz"
                }
                readOnly
                style={inputReadOnly(theme, inputBg)}
              />
            </div>
          </div>

          {validExchangeItems.length > 0 && (
            <div
              style={{
                marginTop: 16,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 16,
                background: theme.isDark ? "#0e1728" : "#f8fafc",
                color: theme.subtext,
                fontSize: 14,
              }}
            >
              Como há trocas informadas, este lançamento será salvo como
              <strong style={{ color: theme.text }}> troca por defeito</strong> e
              não vai gerar financeiro.
            </div>
          )}

          {validExchangeItems.length === 0 &&
            (paymentMethod === "BOLETO" || paymentMethod === "CARD_CREDIT") && (
              <div
                style={{
                  marginTop: 16,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: 16,
                  background: theme.isDark ? "#0e1728" : "#f8fafc",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    marginBottom: 12,
                    color: theme.text,
                  }}
                >
                  Parcelamento
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <label style={label(theme)}>Data do primeiro vencimento</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={input(theme, inputBg)}
                    />
                  </div>

                  <div>
                    <label style={label(theme)}>Quantidade de parcelas</label>
                    <input
                      type="number"
                      min={1}
                      value={installmentCount}
                      onChange={(e) =>
                        updateInstallmentCount(Number(e.target.value))
                      }
                      style={input(theme, inputBg)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={label(theme)}>Datas das parcelas</label>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    {Array.from({ length: installmentCount }).map((_, index) => (
                      <input
                        key={index}
                        type="date"
                        value={installmentDates[index] ?? ""}
                        onChange={(e) =>
                          updateInstallmentDate(index, e.target.value)
                        }
                        style={input(theme, inputBg)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
        </Card>

        <Card
          title="Catálogo de Produtos"
          theme={theme}
          right={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                style={{ ...input(theme, inputBg), width: 220 }}
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ ...input(theme, inputBg), width: 180 }}
              >
                <option value="">Todas categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button onClick={clearAll} style={btnSecondary(theme)} type="button">
                Limpar quantidades
              </button>
            </div>
          }
        >
          {visibleGroupedItems.length === 0 ? (
            <div style={{ color: theme.subtext }}>Nenhum produto encontrado.</div>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {visibleGroupedItems.map(([categoryName, categoryItems]) => (
                <div
                  key={categoryName}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: theme.isDark ? "#0e1728" : "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                      background: theme.isDark ? "#0b1324" : "#f8fafc",
                      fontWeight: 800,
                      color: theme.text,
                      fontSize: 16,
                    }}
                  >
                    {categoryName}
                  </div>

                  <div
                    style={{
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {categoryItems.map((item) => (
                      <div
                        key={item.productId}
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: 12,
                          padding: 14,
                          background: theme.cardBg,
                        }}
                      >
                        <div
                          style={{
                            height: 90,
                            borderRadius: 10,
                            background: theme.isDark ? "#0f172a" : "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 12,
                            overflow: "hidden",
                          }}
                        >
                          {item.product?.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product?.name ?? "Produto"}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                fontSize: 13,
                                color: theme.subtext,
                              }}
                            >
                              Sem imagem
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 16,
                            color: theme.text,
                          }}
                        >
                          {item.product?.name ?? "Produto"}
                        </div>

                        <div style={{ color: theme.subtext, marginTop: 4, fontSize: 13 }}>
                          SKU: {item.product?.sku ?? "-"}
                        </div>

                        <div style={{ color: theme.subtext, marginTop: 2, fontSize: 13 }}>
                          Categoria: {item.product?.category ?? "-"}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 20,
                            fontWeight: 900,
                            color: theme.text,
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
                            style={qtyBtn(theme)}
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
                            style={{ ...input(theme, inputBg), textAlign: "center" }}
                          />

                          <button
                            onClick={() => incrementQty(item.productId, 1)}
                            style={qtyBtn(theme)}
                            type="button"
                          >
                            +
                          </button>
                        </div>

                        <div style={{ marginTop: 12, color: theme.subtext }}>
                          Subtotal:{" "}
                          <b style={{ color: theme.text }}>{money(item.subtotalCents)}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Trocas por defeito"
          theme={theme}
          right={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={addExchangeRow}
                style={btnSecondary(theme)}
                type="button"
              >
                + Adicionar troca
              </button>
            </div>
          }
        >
          {exchangeRows.length === 0 ? (
            <div style={{ color: theme.subtext }}>
              Nenhuma troca informada. Se houver produto com defeito devolvido pelo
              cliente, adicione aqui.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {exchangeRows.map((row, index) => (
                <div
                  key={row.id}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: theme.isDark ? "#0e1728" : "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: theme.text,
                      }}
                    >
                      Troca {index + 1}
                    </div>

                    <button
                      onClick={() => removeExchangeRow(row.id)}
                      style={btnSecondary(theme)}
                      type="button"
                    >
                      Remover
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 120px",
                      gap: 12,
                    }}
                  >
                    <div>
                      <label style={label(theme)}>Produto devolvido com defeito</label>
                      <select
                        value={row.productId}
                        onChange={(e) =>
                          updateExchangeRow(row.id, "productId", e.target.value)
                        }
                        style={input(theme, inputBg)}
                      >
                        <option value="">Selecione o produto</option>
                        {products
                          .filter((p) => p.active !== false)
                          .sort((a, b) => compareSku(a.sku, b.sku))
                          .map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} - {product.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label style={label(theme)}>Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) =>
                          updateExchangeRow(
                            row.id,
                            "quantity",
                            Number(e.target.value)
                          )
                        }
                        style={input(theme, inputBg)}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <div>
                      <label style={label(theme)}>Motivo</label>
                      <input
                        value={row.reason}
                        onChange={(e) =>
                          updateExchangeRow(row.id, "reason", e.target.value)
                        }
                        placeholder="Ex: produto com vazamento"
                        style={input(theme, inputBg)}
                      />
                    </div>

                    <div>
                      <label style={label(theme)}>Observações</label>
                      <input
                        value={row.notes}
                        onChange={(e) =>
                          updateExchangeRow(row.id, "notes", e.target.value)
                        }
                        placeholder="Detalhes da troca"
                        style={input(theme, inputBg)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Resumo" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ color: theme.subtext }}>Itens selecionados</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginTop: 6,
                  color: theme.text,
                }}
              >
                {selectedItemsCount}
              </div>
            </div>

            <div>
              <div style={{ color: theme.subtext }}>
                {validExchangeItems.length > 0 ? "Tipo de lançamento" : "Subtotal"}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  marginTop: 6,
                  color: theme.text,
                }}
              >
                {validExchangeItems.length > 0 ? "Troca" : money(subtotal)}
              </div>
            </div>
          </div>

          {validExchangeItems.length === 0 ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={label(theme)}>Desconto em R$</label>
                  <input
                    value={discountReais}
                    onChange={(e) => {
                      setDiscountReais(e.target.value);
                      if (e.target.value) setDiscountPercent("");
                    }}
                    placeholder="Ex: 10,00"
                    style={input(theme, inputBg)}
                  />
                </div>

                <div>
                  <label style={label(theme)}>Desconto em %</label>
                  <input
                    value={discountPercent}
                    onChange={(e) => {
                      setDiscountPercent(e.target.value);
                      if (e.target.value) setDiscountReais("");
                    }}
                    placeholder="Ex: 5"
                    style={input(theme, inputBg)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: theme.subtext }}>Desconto aplicado</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      marginTop: 6,
                      color: "#ef4444",
                    }}
                  >
                    {money(discountCents)}
                  </div>
                </div>

                <div>
                  <div style={{ color: theme.subtext }}>Total do pedido</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      marginTop: 6,
                      color: theme.text,
                    }}
                  >
                    {money(finalTotalCents)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 16,
                background: theme.isDark ? "#0e1728" : "#f8fafc",
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: theme.text,
                  marginBottom: 8,
                }}
              >
                Resumo da troca
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  color: theme.subtext,
                  fontSize: 14,
                }}
              >
                <div>• O pedido será salvo como troca por defeito.</div>
                <div>• O estoque sai da região selecionada.</div>
                <div>• Não haverá geração de financeiro.</div>
                <div>• Os produtos informados acima ficarão registrados como defeito.</div>
              </div>
            </div>
          )}
        </Card>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => router.back()} style={btnSecondary(theme)} type="button">
            Cancelar
          </button>

          <button
            onClick={save}
            style={btnPrimary(theme)}
            disabled={saving}
            type="button"
          >
            {saving ? "Salvando..." : "Salvar pedido"}
          </button>
        </div>
      </div>
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

function inputReadOnly(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    ...input(theme, inputBg),
    opacity: 0.75,
  };
}

function btnPrimary(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: theme.primary,
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };
}

function btnSecondary(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 700,
  };
}

function qtyBtn(theme: ThemeShape): React.CSSProperties {
  return {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 18,
  };
}