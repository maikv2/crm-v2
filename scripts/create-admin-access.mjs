import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = "admin@v2crm.com";
  const password = "123456";
  const name = "Administrador";

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        role: "ADMIN",
        active: true,
        passwordHash,
      },
    });

    console.log("Admin atualizado com sucesso.");
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        role: "ADMIN",
        active: true,
        passwordHash,
      },
    });

    console.log("Admin criado com sucesso.");
  }

  console.log("Login:", email);
  console.log("Senha:", password);
}

main()
  .catch((error) => {
    console.error("Erro ao criar admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });