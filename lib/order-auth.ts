import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export class OrderAccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderAccessError";
    this.status = status;
  }
}

export type OrderAccessUser = {
  id: string;
  role: "ADMIN" | "REPRESENTATIVE";
  regionId: string | null;
};

/**
 * Permite acesso ao pedido se:
 *   - Usuário for ADMIN, OU
 *   - Usuário for REPRESENTATIVE e for o vendedor do pedido
 *     OU pertencer à região do pedido.
 */
export async function requireOrderAccess(
  orderId: string
): Promise<OrderAccessUser> {
  const cookieStore = await cookies();
  const session = cookieStore.get("crm_session")?.value?.trim();
  if (!session) {
    throw new OrderAccessError("Usuário não autenticado.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session },
    select: { id: true, role: true, active: true, regionId: true },
  });
  if (!user || !user.active) {
    throw new OrderAccessError("Usuário inválido.", 401);
  }

  if (user.role === "ADMIN") {
    return { id: user.id, role: "ADMIN", regionId: user.regionId };
  }

  if (user.role === "REPRESENTATIVE") {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { sellerId: true, regionId: true },
    });
    if (!order) {
      throw new OrderAccessError("Pedido não encontrado.", 404);
    }
    const ownsAsSeller = order.sellerId === user.id;
    const ownsAsRegion =
      !!order.regionId && !!user.regionId && order.regionId === user.regionId;
    if (ownsAsSeller || ownsAsRegion) {
      return {
        id: user.id,
        role: "REPRESENTATIVE",
        regionId: user.regionId,
      };
    }
    throw new OrderAccessError(
      "Você não tem acesso a este pedido.",
      403
    );
  }

  throw new OrderAccessError("Acesso negado.", 403);
}