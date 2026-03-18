import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@v2crm.com";
  const password = "123456";

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("Usuário já existe:", email);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Administrador",
      email,
      role: "ADMIN",
      passwordHash,
      active: true,
    },
  });

  console.log("ADMIN criado com sucesso");
  console.log("Email:", email);
  console.log("Senha:", password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());