import fs from "fs";
import csv from "csv-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const results = [];

fs.createReadStream("./scripts/clientes_importacao_crm_v2_com_createdAt.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", async () => {
    console.log("Importando clientes:", results.length);

    for (const row of results) {
      try {
        const finalName =
          (row.name && String(row.name).trim()) ||
          (row.legalName && String(row.legalName).trim()) ||
          (row.tradeName && String(row.tradeName).trim()) ||
          null;

        if (!finalName) {
          console.log("❌ Cliente sem nome válido, pulado.");
          console.log(row);
          continue;
        }

        const client = await prisma.client.create({
          data: {
            name: finalName,
            tradeName: row.tradeName || null,
            legalName: row.legalName || null,

            personType: row.personType === "FISICA" ? "FISICA" : "JURIDICA",

            cpf: row.cpf || null,
            cnpj: row.cnpj || null,

            roleClient: String(row.roleClient).toLowerCase() === "true",
            roleSupplier: String(row.roleSupplier).toLowerCase() === "true",
            roleCarrier: String(row.roleCarrier).toLowerCase() === "true",

            registrationCode: row.registrationCode || null,
            billingEmail: row.billingEmail || null,
            whatsapp: row.whatsapp || null,

            stateRegistrationIndicator:
              row.stateRegistrationIndicator || "CONTRIBUINTE",

            stateRegistration: row.stateRegistration || null,
            municipalRegistration: row.municipalRegistration || null,
            suframaRegistration: row.suframaRegistration || null,

            country: row.country || "Brasil",

            cep: row.cep || null,
            street: row.street || null,
            number: row.number || null,
            district: row.district || null,
            city: row.city || null,
            state: row.state || null,
            complement: row.complement || null,

            notes: row.notes || null,

            createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
          },
        });

        console.log("✔ Cliente importado:", client.name);
      } catch (error) {
        console.log("❌ Erro cliente:", row.name || row.legalName || row.tradeName);
        console.log(error.message);
      }
    }

    console.log("Importação finalizada");
    await prisma.$disconnect();
  });
