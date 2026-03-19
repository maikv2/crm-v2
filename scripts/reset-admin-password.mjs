import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = "admin@v2crm.com";
  const password = "123456";

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: hash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Senha atualizada com sucesso");
  console.log("Login:", email);
  console.log("Senha:", password);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });