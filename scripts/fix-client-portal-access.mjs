import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function padClientCode(value) {
  const digits = onlyDigits(value);
  if (!digits) return null;
  return digits.padStart(4, "0");
}

async function getNextClientCode() {
  const clientsWithCode = await prisma.client.findMany({
    where: {
      code: {
        not: null,
      },
    },
    select: {
      code: true,
    },
  });

  const numericCodes = clientsWithCode
    .map((client) => Number(onlyDigits(client.code)))
    .filter((value) => Number.isFinite(value) && value > 0);

  const nextNumber =
    numericCodes.length > 0 ? Math.max(...numericCodes) + 1 : 1;

  return String(nextNumber).padStart(4, "0");
}

async function main() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      tradeName: true,
      code: true,
      portalEnabled: true,
      portalPasswordHash: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!clients.length) {
    console.log("Nenhum cliente encontrado.");
    return;
  }

  console.log(`Clientes encontrados: ${clients.length}`);
  console.log("Iniciando atualização do acesso ao portal...\n");

  let updatedCount = 0;
  let generatedCodeCount = 0;

  for (const client of clients) {
    let finalCode = padClientCode(client.code);

    if (!finalCode) {
      finalCode = await getNextClientCode();
      generatedCodeCount += 1;
    }

    const portalUsername =
      normalizeText(client.tradeName) ||
      normalizeText(client.name) ||
      `cliente-${finalCode}`;

    const portalPasswordHash = await bcrypt.hash(finalCode, 10);

    await prisma.client.update({
      where: { id: client.id },
      data: {
        code: finalCode,
        portalEnabled: true,
        portalPasswordHash,
      },
    });

    updatedCount += 1;

    console.log(
      [
        `✔ Cliente atualizado`,
        `Nome: ${portalUsername}`,
        `Código: ${finalCode}`,
        `Senha inicial: ${finalCode}`,
      ].join(" | ")
    );
  }

  console.log("\nAtualização concluída com sucesso.");
  console.log(`Total atualizado: ${updatedCount}`);
  console.log(`Códigos gerados automaticamente: ${generatedCodeCount}`);
  console.log(
    "Regra aplicada: usuário = nome fantasia (ou nome), senha inicial = código do cliente."
  );
}

main()
  .catch((error) => {
    console.error("Erro ao atualizar acessos do portal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });