import type { CSSProperties } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getExhibitorTypeCapacity,
  getExhibitorTypeLabel,
} from "@/lib/exhibitors";

function formatDateBR(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatMoneyBRFromCents(cents?: number | null) {
  if (cents == null) return "-";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type ExhibitorDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorDetailPage({
  params,
}: ExhibitorDetailPageProps) {
  const { id } = await params;

  const exhibitor = await prisma.exhibitor.findUnique({
    where: { id },
    include: {
      client: true,
      region: true,
      initialItems: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      maintenances: {
        include: {
          user: true,
        },
        orderBy: {
          performedAt: "desc",
        },
      },
      visits: {
        include: {
          user: true,
        },
        orderBy: {
          visitedAt: "desc",
        },
      },
      orders: {
        include: {
          seller: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          issuedAt: "desc",
        },
      },
    },
  });

  if (!exhibitor) {
    return (
      <>
        <style>{themeVars}</style>

        <main
          style={{
            padding: 24,
            color: "var(--text-local)",
            background: "var(--page-bg-local)",
            minHeight: "100%",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Expositor não encontrado</h1>
          <p style={{ color: "var(--muted-local)" }}>
            Não foi possível localizar este expositor.
          </p>
          <Link href="/exhibitors" style={ghostButton}>
            Voltar
          </Link>
        </main>
      </>
    );
  }

  const typeLabel = getExhibitorTypeLabel(exhibitor.type);
  const typeCapacity = getExhibitorTypeCapacity(exhibitor.type);
  const totalInitialQty = exhibitor.initialItems.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0
  );

  return (
    <>
      <style>{themeVars}</style>

      <main
        style={{
          padding: 24,
          color: "var(--text-local)",
          background: "var(--page-bg-local)",
          minHeight: "100%",
        }}
      >
        <div style={headerRow}>
          <div>
            <div style={breadcrumb}>🏠 / Expositores / Detalhes</div>
            <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>
              {exhibitor.name || exhibitor.code || "Expositor"}
            </h1>
            <p style={subtitle}>Cliente: {exhibitor.client.name}</p>

            <div style={badgeRow}>
              <span style={typeBadge}>{typeLabel}</span>
              <span style={capacityBadge}>Capacidade: {typeCapacity} itens</span>
              <span style={capacityBadge}>
                Mix inicial: {totalInitialQty} itens
              </span>
            </div>
          </div>

          <div style={headerActions}>
            <Link
              href={`/exhibitors/${exhibitor.id}/maintenance`}
              style={successButton}
            >
              Registrar manutenção
            </Link>

            <Link href="/exhibitors" style={ghostButton}>
              Voltar
            </Link>
          </div>
        </div>

        <div style={pageGrid}>
          <section style={card}>
            <h2 style={sectionTitle}>Dados do expositor</h2>

            <div style={infoGrid}>
              <p style={infoItem}>
                <strong>Código:</strong> {exhibitor.code || "-"}
              </p>
              <p style={infoItem}>
                <strong>Nome:</strong> {exhibitor.name || "-"}
              </p>
              <p style={infoItem}>
                <strong>Modelo:</strong> {exhibitor.model || "-"}
              </p>
              <p style={infoItem}>
                <strong>Tipo:</strong> {typeLabel}
              </p>
              <p style={infoItem}>
                <strong>Capacidade máxima:</strong> {typeCapacity} itens
              </p>
              <p style={infoItem}>
                <strong>Status:</strong> {exhibitor.status}
              </p>
              <p style={infoItem}>
                <strong>Cliente:</strong> {exhibitor.client.name}
              </p>
              <p style={infoItem}>
                <strong>Região:</strong> {exhibitor.region?.name || "-"}
              </p>
              <p style={infoItem}>
                <strong>Instalado em:</strong> {formatDateBR(exhibitor.installedAt)}
              </p>
              <p style={infoItem}>
                <strong>Última visita:</strong> {formatDateBR(exhibitor.lastVisitAt)}
              </p>
              <p style={infoItem}>
                <strong>Última manutenção:</strong>{" "}
                {formatDateBR(exhibitor.lastMaintenanceAt)}
              </p>
              <p style={infoItem}>
                <strong>Próxima visita:</strong> {formatDateBR(exhibitor.nextVisitAt)}
              </p>
              <p style={infoItem}>
                <strong>Removido em:</strong> {formatDateBR(exhibitor.removedAt)}
              </p>
            </div>

            <div style={{ marginTop: 12 }}>
              <p style={infoItem}>
                <strong>Observações:</strong> {exhibitor.notes || "-"}
              </p>
              <p style={infoItem}>
                <strong>Observação do estoque inicial:</strong>{" "}
                {exhibitor.initialStockNote || "-"}
              </p>
            </div>
          </section>

          <section style={card}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>Estoque inicial do expositor</h2>
              <span style={capacityBadge}>
                {totalInitialQty} / {typeCapacity} itens
              </span>
            </div>

            {exhibitor.initialItems.length === 0 ? (
              <p style={emptyText}>Nenhum item inicial cadastrado.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {exhibitor.initialItems.map((item) => (
                  <div key={item.id} style={innerCard}>
                    <div style={infoGrid}>
                      <p style={infoItem}>
                        <strong>Produto:</strong> {item.product.name}
                      </p>
                      <p style={infoItem}>
                        <strong>SKU:</strong> {item.product.sku}
                      </p>
                      <p style={infoItem}>
                        <strong>Quantidade:</strong> {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={card}>
            <h2 style={sectionTitle}>Histórico de visitas</h2>

            {exhibitor.visits.length === 0 ? (
              <p style={emptyText}>Nenhuma visita registrada.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {exhibitor.visits.map((visit) => (
                  <div key={visit.id} style={innerCard}>
                    <div style={infoGrid}>
                      <p style={infoItem}>
                        <strong>Data:</strong> {formatDateBR(visit.visitedAt)}
                      </p>
                      <p style={infoItem}>
                        <strong>Responsável:</strong> {visit.user?.name || "-"}
                      </p>
                    </div>

                    <p style={{ ...infoItem, marginTop: 8 }}>
                      <strong>Observações:</strong> {visit.notes || "-"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={card}>
            <div style={sectionHeader}>
              <h2 style={sectionTitle}>Histórico de manutenção</h2>

              <Link
                href={`/exhibitors/${exhibitor.id}/maintenance`}
                style={successButtonSmall}
              >
                Registrar manutenção
              </Link>
            </div>

            {exhibitor.maintenances.length === 0 ? (
              <p style={emptyText}>Nenhuma manutenção registrada.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {exhibitor.maintenances.map((maintenance) => (
                  <div key={maintenance.id} style={innerCard}>
                    <div style={infoGrid}>
                      <p style={infoItem}>
                        <strong>Data:</strong> {formatDateBR(maintenance.performedAt)}
                      </p>
                      <p style={infoItem}>
                        <strong>Tipo:</strong> {maintenance.type}
                      </p>
                      <p style={infoItem}>
                        <strong>Responsável:</strong> {maintenance.user?.name || "-"}
                      </p>
                      <p style={infoItem}>
                        <strong>Custo:</strong>{" "}
                        {formatMoneyBRFromCents(maintenance.costCents)}
                      </p>
                      <p style={infoItem}>
                        <strong>Próxima ação:</strong>{" "}
                        {formatDateBR(maintenance.nextActionAt)}
                      </p>
                    </div>

                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <p style={infoItem}>
                        <strong>Descrição:</strong> {maintenance.description || "-"}
                      </p>
                      <p style={infoItem}>
                        <strong>Solução:</strong> {maintenance.solution || "-"}
                      </p>
                      <p style={infoItem}>
                        <strong>Observações:</strong> {maintenance.notes || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={card}>
            <h2 style={sectionTitle}>Histórico de pedidos</h2>

            {exhibitor.orders.length === 0 ? (
              <p style={emptyText}>Nenhum pedido relacionado a este expositor.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {exhibitor.orders.map((order) => (
                  <div key={order.id} style={innerCard}>
                    <div style={infoGrid}>
                      <p style={infoItem}>
                        <strong>Data:</strong> {formatDateBR(order.issuedAt)}
                      </p>
                      <p style={infoItem}>
                        <strong>Tipo:</strong> {order.type}
                      </p>
                      <p style={infoItem}>
                        <strong>Status:</strong> {order.status}
                      </p>
                      <p style={infoItem}>
                        <strong>Vendedor:</strong> {order.seller?.name || "-"}
                      </p>
                      <p style={infoItem}>
                        <strong>Subtotal:</strong>{" "}
                        {formatMoneyBRFromCents(order.subtotalCents)}
                      </p>
                      <p style={infoItem}>
                        <strong>Desconto:</strong>{" "}
                        {formatMoneyBRFromCents(order.discountCents)}
                      </p>
                      <p style={infoItem}>
                        <strong>Total:</strong>{" "}
                        {formatMoneyBRFromCents(order.totalCents)}
                      </p>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <strong style={{ color: "var(--text-local)" }}>Itens:</strong>

                      {order.items.length === 0 ? (
                        <p style={{ ...emptyText, marginTop: 8 }}>Nenhum item.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                          {order.items.map((item) => (
                            <div key={item.id} style={miniCard}>
                              <div style={infoGrid}>
                                <p style={infoItem}>
                                  <strong>Produto:</strong> {item.product.name}
                                </p>
                                <p style={infoItem}>
                                  <strong>SKU:</strong> {item.product.sku}
                                </p>
                                <p style={infoItem}>
                                  <strong>Quantidade:</strong> {item.qty}
                                </p>
                                <p style={infoItem}>
                                  <strong>Valor unitário:</strong>{" "}
                                  {formatMoneyBRFromCents(item.unitCents)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

const themeVars = `
  :root {
    --page-bg-local: #f3f6fb;
    --card-bg-local: #ffffff;
    --subtle-bg-local: #f8fafc;
    --mini-bg-local: #f1f5f9;
    --border-local: #e5e7eb;
    --text-local: #111827;
    --muted-local: #64748b;
    --green-local: #16a34a;
    --blue-local: #2563eb;
    --tag-bg-local: #eff6ff;
    --tag-text-local: #1d4ed8;
  }

  .dark,
  [data-theme="dark"],
  [data-mode="dark"],
  [data-color-mode="dark"] {
    --page-bg-local: #0b1220;
    --card-bg-local: #111827;
    --subtle-bg-local: #0e1728;
    --mini-bg-local: #0b1324;
    --border-local: #1f2937;
    --text-local: #ffffff;
    --muted-local: #94a3b8;
    --green-local: #22c55e;
    --blue-local: #2563eb;
    --tag-bg-local: rgba(37,99,235,0.14);
    --tag-text-local: #93c5fd;
  }
`;

const headerRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const breadcrumb: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--muted-local)",
};

const subtitle: CSSProperties = {
  marginTop: 8,
  color: "var(--muted-local)",
};

const badgeRow: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const pageGrid: CSSProperties = {
  display: "grid",
  gap: 16,
};

const card: CSSProperties = {
  background: "var(--card-bg-local)",
  border: "1px solid var(--border-local)",
  borderRadius: 16,
  padding: 16,
};

const innerCard: CSSProperties = {
  background: "var(--subtle-bg-local)",
  border: "1px solid var(--border-local)",
  borderRadius: 12,
  padding: 12,
};

const miniCard: CSSProperties = {
  background: "var(--mini-bg-local)",
  border: "1px solid var(--border-local)",
  borderRadius: 10,
  padding: 10,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  color: "var(--text-local)",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const infoItem: CSSProperties = {
  margin: 0,
  color: "var(--text-local)",
};

const emptyText: CSSProperties = {
  margin: 0,
  color: "var(--muted-local)",
};

const typeBadge: CSSProperties = {
  background: "var(--tag-bg-local)",
  color: "var(--tag-text-local)",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const capacityBadge: CSSProperties = {
  background: "var(--subtle-bg-local)",
  color: "var(--text-local)",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  border: "1px solid var(--border-local)",
};

const ghostButton: CSSProperties = {
  background: "var(--card-bg-local)",
  padding: "10px 16px",
  borderRadius: 10,
  color: "var(--text-local)",
  textDecoration: "none",
  border: "1px solid var(--border-local)",
  fontWeight: 700,
};

const successButton: CSSProperties = {
  background: "var(--green-local)",
  padding: "10px 16px",
  borderRadius: 10,
  color: "white",
  textDecoration: "none",
  fontWeight: 700,
};

const successButtonSmall: CSSProperties = {
  background: "var(--green-local)",
  padding: "8px 12px",
  borderRadius: 10,
  color: "white",
  textDecoration: "none",
  fontWeight: 700,
};