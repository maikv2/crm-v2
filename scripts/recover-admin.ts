import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@v2.com";
  const password = "123456";

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name: "Administrador",
        passwordHash,
        role: "ADMIN",
        active: true,
      },
    });

    console.log("Admin atualizado com sucesso.");
    console.log("Email:", email);
    console.log("Senha:", password);
    return;
  }

  await prisma.user.create({
    data: {
      name: "Administrador",
      email,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Admin criado com sucesso.");
  console.log("Email:", email);
  console.log("Senha:", password);
}

main()
  .catch((error) => {
    console.error("Erro ao recuperar admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });