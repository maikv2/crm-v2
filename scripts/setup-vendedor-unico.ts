// Script único: mantém só o Maiquiel como vendedor ativo, desativando os
// demais representantes (sem apagar nada — pedidos antigos continuam
// mostrando o vendedor original no histórico).
//
// Rodar com:
//   npx tsx scripts/setup-vendedor-unico.ts
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const maiquiel = await prisma.user.findFirst({
    where: {
      role: UserRole.REPRESENTATIVE,
      name: { contains: "Maiquiel", mode: "insensitive" },
    },
  });

  if (!maiquiel) {
    console.error(
      "Não encontrei nenhum representante com o nome 'Maiquiel'. Cadastre-o antes de rodar este script."
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Vendedor único: ${maiquiel.name} (id=${maiquiel.id})`);

  if (!maiquiel.active) {
    await prisma.user.update({
      where: { id: maiquiel.id },
      data: { active: true },
    });
    console.log("Reativado.");
  }

  const others = await prisma.user.findMany({
    where: {
      role: UserRole.REPRESENTATIVE,
      id: { not: maiquiel.id },
      active: true,
    },
    select: { id: true, name: true },
  });

  if (others.length === 0) {
    console.log("Nenhum outro vendedor ativo. Nada a fazer.");
    return;
  }

  console.log(`Desativando ${others.length} vendedor(es):`);
  for (const rep of others) {
    console.log(` - ${rep.name}`);
  }

  await prisma.user.updateMany({
    where: { id: { in: others.map((rep) => rep.id) } },
    data: { active: false },
  });

  console.log("Pronto.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
