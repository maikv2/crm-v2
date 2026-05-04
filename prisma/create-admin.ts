import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const username = "Maiquiel";
  const password = "123456";

  const existing = await prisma.user.findFirst({
    where: {
      name: username,
    },
  });

  if (existing) {
    console.log("Usuário já existe:", username);
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: username,
      email: "admin@v2.com",
      passwordHash: hash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("ADMIN CRIADO COM SUCESSO:");
  console.log(user);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });