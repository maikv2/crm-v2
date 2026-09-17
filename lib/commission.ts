// Comissão de venda: taxa única (16%), igual pra qualquer vendedor e
// independente da região do pedido — substitui o antigo valor fixo por
// produto (Product.commissionCents).
export const SELLER_COMMISSION_RATE_BPS = 1600;

export function calculateSellerCommissionCents(saleTotalCents: number) {
  const safeCents = Number.isFinite(saleTotalCents) ? Math.max(0, saleTotalCents) : 0;
  return Math.round((safeCents * SELLER_COMMISSION_RATE_BPS) / 10000);
}
