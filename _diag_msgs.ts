import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { prisma } from "./lib/prisma";

// READ-ONLY. Levanta escopo dos disparos por dia (BRT).
const BRT = -3 * 60 * 60 * 1000;
function brtDay(d: Date): string {
  const l = new Date(d.getTime() + BRT);
  return `${l.getUTCFullYear()}-${String(l.getUTCMonth()+1).padStart(2,"0")}-${String(l.getUTCDate()).padStart(2,"0")}`;
}

async function main() {
  const from = new Date("2026-07-11T03:00:00.000Z"); // 11/07 00:00 BRT
  const to = new Date("2026-07-15T02:59:59.999Z");   // 14/07 23:59 BRT
  const orders = await prisma.order.findMany({
    where: { type: "SALE", issuedAt: { gte: from, lte: to } },
    select: {
      number: true, issuedAt: true, paymentMethod: true, nfeStatus: true, nfeNumber: true, totalCents: true,
      client: { select: { name: true, whatsapp: true, phone: true } },
    },
    orderBy: { issuedAt: "asc" },
  });

  const days: Record<string, any[]> = {};
  for (const o of orders) {
    const d = brtDay(o.issuedAt);
    (days[d] ??= []).push(o);
  }

  for (const d of Object.keys(days).sort()) {
    const list = days[d];
    const withPhone = list.filter(o => o.client?.whatsapp || o.client?.phone).length;
    const nfeAuth = list.filter(o => o.nfeStatus === "AUTHORIZED" || o.nfeStatus === "ISSUED").length;
    const boleto = list.filter(o => o.paymentMethod === "BOLETO").length;
    const noPhone = list.length - withPhone;
    console.log(`\n=== ${d} : ${list.length} pedidos ===`);
    console.log(`  Pedido->cliente: ${withPhone} com WhatsApp (${noPhone} SEM telefone)`);
    console.log(`  NF-e autorizada->cliente: ${nfeAuth}`);
    console.log(`  Boleto->financeiro: ${boleto}`);
    for (const o of list) {
      const tel = o.client?.whatsapp || o.client?.phone || "SEM TELEFONE";
      console.log(`    PED-${String(o.number).padStart(4,"0")} | ${o.client?.name ?? "?"} | ${o.paymentMethod} | NFe:${o.nfeStatus ?? "-"}${o.nfeNumber?` #${o.nfeNumber}`:""} | ${tel}`);
    }
  }

  // feasibility: quais envs de zapi/telefones existem (só nomes, sem valores)
  const keys = ["ZAPI_INSTANCE_ID","ZAPI_TOKEN","ZAPI_CLIENT_TOKEN","FINANCIAL_WHATSAPP","FINANCEIRO_WHATSAPP","CRON_SECRET","NEXT_PUBLIC_APP_URL","APP_URL"];
  console.log("\n=== ENV disponível localmente (nomes) ===");
  for (const k of keys) console.log(`  ${k}: ${process.env[k] ? "definido" : "NÃO definido"}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
