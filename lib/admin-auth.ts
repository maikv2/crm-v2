import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function requireAdminUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get("crm_session")?.value?.trim();

  if (!session) {
    throw new Error("Usuário não autenticado");
  }

  const user = await prisma.user.findUnique({
    where: { id: session },
    select: {
      id: true,
      role: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    throw new Error("Usuário inválido");
  }

  if (user.role !== "ADMIN") {
    throw new Error("Acesso permitido apenas para administradores");
  }

  return user;
}