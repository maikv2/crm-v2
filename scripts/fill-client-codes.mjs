import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function extractNumericCode(code) {
  const digits = String(code ?? "").replace(/\D/g, "");
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function main() {
  const allClients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
    },
    orderBy: [
      { createdAt: "asc" },
      { name: "asc" },
    ],
  });

  const usedNumbers = allClients
    .map((client) => extractNumericCode(client.code))
    .filter((value) => value > 0);

  let nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

  const clientsWithoutCode = allClients.filter((client) => !client.code);

  if (clientsWithoutCode.length === 0) {
    console.log("Nenhum cliente sem código encontrado.");
    return;
  }

  console.log(`Clientes sem código: ${clientsWithoutCode.length}`);

  for (const client of clientsWithoutCode) {
    let generatedCode = String(nextNumber).padStart(4, "0");

    while (usedNumbers.includes(nextNumber)) {
      nextNumber += 1;
      generatedCode = String(nextNumber).padStart(4, "0");
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { code: generatedCode },
    });

    usedNumbers.push(nextNumber);

    console.log(`Cliente ${client.name} -> código ${generatedCode}`);

    nextNumber += 1;
  }

  console.log("Preenchimento concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error("Erro ao preencher códigos dos clientes:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
