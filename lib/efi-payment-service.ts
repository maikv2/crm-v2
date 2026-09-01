import {
  ExternalPayment,
  ExternalPaymentStatus,
  ExternalPaymentType,
  PaymentMethod,
  PaymentProvider,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  EfiChargeData,
  EfiChargeLinkPayload,
  EfiChargesApiError,
  EfiChargesConfigError,
  createEfiBilletOneStep,
  createEfiChargeLink,
  extractEfiPaymentArtifacts,
  getEfiCharge,
  getEfiNotification,
  isEfiPaidStatus,
  mapEfiChargeStatus,
} from "@/lib/efi-charges";
import { markReceivableInstallmentPaid } from "@/lib/receivables";

type ClientForBillet = {
  name: string;
  legalName?: string | null;
  tradeName?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  billingEmail?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  complement?: string | null;
};

type InstallmentForBillet = {
  id: string;
  installmentNumber: number;
  installmentCount: number;
  amountCents: number;
  dueDate: Date;
  status: string;
  receivedCents: number;
  accountsReceivableId: string;
};

type OrderForBillet = {
  id: string;
  number: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  client: ClientForBillet;
  accountsReceivables: Array<{
    id: string;
    installmentCount: number;
    installments: Array<{
      id: string;
      installmentNumber: number;
      installmentCount: number;
      amountCents: number;
      dueDate: Date;
      status: string;
      receivedCents: number;
    }>;
  }>;
};

export type EfiPaymentResult = {
  payment: ExternalPayment;
  created: boolean;
  synced: boolean;
};

const OPEN_EXTERNAL_STATUSES = [
  ExternalPaymentStatus.PENDING,
  ExternalPaymentStatus.OVERDUE,
] as const;

function digits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeEfiPhone(value?: string | null) {
  const onlyDigits = digits(value);
  if (!onlyDigits) return undefined;
  if (onlyDigits.startsWith("55") && onlyDigits.length >= 12) {
    return onlyDigits.slice(2);
  }
  return onlyDigits;
}

function trimText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function formatDateForEfi(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function dateFromEfi(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAppBaseUrl(requestUrl: string) {
  const explicit =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (explicit) {
    const withProtocol = explicit.startsWith("http")
      ? explicit
      : `https://${explicit}`;
    return withProtocol.replace(/\/+$/, "");
  }

  return new URL(requestUrl).origin;
}

function buildNotificationUrl(requestUrl: string) {
  const url = new URL("/api/webhooks/efi/charges", getAppBaseUrl(requestUrl));
  const secret = process.env.EFI_WEBHOOK_SECRET?.trim();
  if (secret) url.searchParams.set("secret", secret);
  return url.toString();
}

function parsePercentEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}

function boletoMessage(orderNumber: number) {
  const configured = process.env.EFI_BOLETO_MESSAGE?.trim();
  const message =
    configured ||
    [
      "V2 Distribuidora",
      `Pedido ${String(orderNumber).padStart(6, "0")}`,
      "Pague pelo codigo de barras ou pelo link.",
    ].join("\n");

  return message
    .split(/\r?\n/)
    .slice(0, 4)
    .map((line) => line.slice(0, 100))
    .join("\n");
}

function buildCustomer(client: ClientForBillet) {
  const cnpj = digits(client.cnpj);
  const cpf = digits(client.cpf);

  if (cnpj.length !== 14 && cpf.length !== 11) {
    throw new Error("Cliente precisa ter CNPJ ou CPF válido para emitir boleto.");
  }

  const street = trimText(client.street);
  const number = trimText(client.number) || "S/N";
  const neighborhood = trimText(client.district);
  const zipcode = digits(client.cep);
  const city = trimText(client.city);
  const state = trimText(client.state)?.toUpperCase();

  if (!street || !neighborhood || zipcode.length !== 8 || !city || !state) {
    throw new Error(
      "Cliente precisa ter endereço completo com rua, bairro, CEP, cidade e UF para emitir boleto."
    );
  }

  const email = trimText(client.billingEmail) || trimText(client.email);
  const phone = normalizeEfiPhone(client.whatsapp || client.phone);

  const address = {
    street,
    number,
    neighborhood,
    zipcode,
    city,
    complement: trimText(client.complement) || "",
    state,
  };

  if (cnpj.length === 14) {
    return {
      ...(email ? { email } : {}),
      ...(phone ? { phone_number: phone } : {}),
      juridical_person: {
        corporate_name:
          trimText(client.legalName) || trimText(client.tradeName) || client.name,
        cnpj,
      },
      address,
    };
  }

  return {
    name: trimText(client.legalName) || trimText(client.name) || "Cliente",
    cpf,
    ...(email ? { email } : {}),
    ...(phone ? { phone_number: phone } : {}),
    address,
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeInstallments(order: OrderForBillet): InstallmentForBillet[] {
  return order.accountsReceivables.flatMap((receivable) =>
    receivable.installments.map((installment) => ({
      ...installment,
      accountsReceivableId: receivable.id,
      installmentCount: receivable.installmentCount,
    }))
  );
}

function buildCustomId(installmentId: string) {
  return `v2-${installmentId}`;
}

function buildItemName(order: OrderForBillet, installment: InstallmentForBillet) {
  const number = String(order.number).padStart(6, "0");
  const suffix =
    installment.installmentCount > 1
      ? ` - Parcela ${installment.installmentNumber}/${installment.installmentCount}`
      : "";
  return `Pedido ${number}${suffix}`.slice(0, 255);
}

async function findOrderForBillet(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      totalCents: true,
      paymentMethod: true,
      client: {
        select: {
          name: true,
          legalName: true,
          tradeName: true,
          cpf: true,
          cnpj: true,
          email: true,
          billingEmail: true,
          phone: true,
          whatsapp: true,
          street: true,
          number: true,
          district: true,
          city: true,
          state: true,
          cep: true,
          complement: true,
        },
      },
      accountsReceivables: {
        select: {
          id: true,
          installmentCount: true,
          installments: {
            orderBy: { installmentNumber: "asc" },
            select: {
              id: true,
              installmentNumber: true,
              installmentCount: true,
              amountCents: true,
              dueDate: true,
              status: true,
              receivedCents: true,
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error("Pedido não encontrado.");
  if (
    order.paymentMethod !== PaymentMethod.BOLETO &&
    order.paymentMethod !== PaymentMethod.PIX
  ) {
    throw new Error("Este pedido não está marcado como boleto ou Pix.");
  }

  return order;
}

type ClientForLink = {
  name: string;
  email?: string | null;
  billingEmail?: string | null;
};

type OrderForLink = {
  id: string;
  number: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  client: ClientForLink;
};

function buildLinkCustomId(orderId: string) {
  return `v2-link-${orderId}`;
}

function buildLinkItemName(order: { number: number }) {
  return `Pedido ${String(order.number).padStart(6, "0")}`;
}

async function findOrderForCardLink(orderId: string): Promise<OrderForLink> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      totalCents: true,
      paymentMethod: true,
      client: {
        select: {
          name: true,
          email: true,
          billingEmail: true,
        },
      },
    },
  });

  if (!order) throw new Error("Pedido não encontrado.");
  if (order.paymentMethod !== PaymentMethod.CARD_CREDIT) {
    throw new Error("Este pedido não está marcado como cartão de crédito.");
  }

  return order;
}

async function markOrderInstallmentsPaidFromLink(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    providerChargeId: string | null;
  }
) {
  const openInstallments = await tx.accountsReceivableInstallment.findMany({
    where: {
      status: { not: "PAID" },
      accountsReceivable: { orderId: params.orderId },
    },
    orderBy: { installmentNumber: "asc" },
  });

  for (const installment of openInstallments) {
    await markReceivableInstallmentPaid(tx, {
      installmentId: installment.id,
      paymentMethod: PaymentMethod.CARD_CREDIT,
      amountCents: installment.amountCents,
      externalReference: params.providerChargeId
        ? `EFI:${params.providerChargeId}:${installment.id}`
        : null,
      notes: params.providerChargeId
        ? `Baixa automática Efí (link de pagamento) da cobrança ${params.providerChargeId}.`
        : "Baixa automática Efí (link de pagamento).",
    });
  }
}

async function updateExternalPaymentFromLinkCharge(
  payment: ExternalPayment,
  charge: EfiChargeData
) {
  const artifacts = extractEfiPaymentArtifacts(charge);
  const providerChargeId =
    artifacts.providerChargeId || payment.providerChargeId || null;
  const paid = isEfiPaidStatus(charge.status);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.externalPayment.update({
      where: { id: payment.id },
      data: {
        status: artifacts.status,
        providerChargeId,
        amountCents: artifacts.amountCents || payment.amountCents,
        paidCents: paid ? artifacts.amountCents || payment.amountCents : payment.paidCents,
        paidAt: paid ? new Date() : payment.paidAt,
        paymentUrl: artifacts.paymentUrl ?? payment.paymentUrl,
        rawResponse: toJson(charge),
        lastSyncedAt: new Date(),
      },
    });

    if (paid) {
      await markOrderInstallmentsPaidFromLink(tx, {
        orderId: payment.orderId,
        providerChargeId,
      });
    }

    return updated;
  });
}

export async function ensureEfiPaymentLinkForOrder(
  orderId: string,
  requestUrl: string
): Promise<{ payment: ExternalPayment; created: boolean; synced: boolean }> {
  const order = await findOrderForCardLink(orderId);

  const existing = await prisma.externalPayment.findFirst({
    where: {
      provider: PaymentProvider.EFI,
      orderId: order.id,
      type: ExternalPaymentType.PAYMENT_LINK,
      status: { in: [...OPEN_EXTERNAL_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.providerChargeId) {
    const charge = await getEfiCharge(existing.providerChargeId);
    const payment = await updateExternalPaymentFromLinkCharge(existing, charge);
    return { payment, created: false, synced: true };
  }

  const customId = buildLinkCustomId(order.id);
  const email = trimText(order.client.billingEmail) || trimText(order.client.email);
  const expireAt = formatDateForEfi(
    new Date(
      Date.now() +
        parsePercentEnv("EFI_PAYMENT_LINK_EXPIRE_DAYS", 7) * 24 * 60 * 60 * 1000
    )
  );

  const payload: EfiChargeLinkPayload = {
    items: [
      {
        name: buildLinkItemName(order),
        value: order.totalCents,
        amount: 1,
      },
    ],
    metadata: {
      custom_id: customId,
      notification_url: buildNotificationUrl(requestUrl),
    },
    ...(email ? { customer: { email } } : {}),
    settings: {
      payment_method: "credit_card",
      expire_at: expireAt,
      message: `V2 Distribuidora - Pedido ${String(order.number).padStart(6, "0")}`.slice(
        0,
        80
      ),
    },
  };

  const charge = await createEfiChargeLink(payload);
  const artifacts = extractEfiPaymentArtifacts(charge);

  if (!artifacts.providerChargeId || !artifacts.paymentUrl) {
    throw new EfiChargesApiError(
      "Efí não retornou o link de pagamento.",
      502,
      charge
    );
  }

  const payment = await prisma.externalPayment.create({
    data: {
      provider: PaymentProvider.EFI,
      type: ExternalPaymentType.PAYMENT_LINK,
      status: artifacts.status,
      orderId: order.id,
      providerChargeId: artifacts.providerChargeId,
      customId,
      amountCents: artifacts.amountCents || order.totalCents,
      dueDate: dateFromEfi(artifacts.expireAt),
      paymentUrl: artifacts.paymentUrl,
      rawResponse: toJson(charge),
      lastSyncedAt: new Date(),
    },
  });

  return { payment, created: true, synced: false };
}

async function updateExternalPaymentFromCharge(
  payment: ExternalPayment,
  charge: EfiChargeData
) {
  const artifacts = extractEfiPaymentArtifacts(charge);
  const status = artifacts.status;
  const providerChargeId =
    artifacts.providerChargeId || payment.providerChargeId || null;
  const paid = isEfiPaidStatus(charge.status);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.externalPayment.update({
      where: { id: payment.id },
      data: {
        status,
        providerChargeId,
        amountCents: artifacts.amountCents || payment.amountCents,
        paidCents: paid ? artifacts.amountCents || payment.amountCents : payment.paidCents,
        paidAt: paid ? new Date() : payment.paidAt,
        dueDate: dateFromEfi(artifacts.expireAt) ?? payment.dueDate,
        boletoLink: artifacts.boletoLink,
        boletoPdfUrl: artifacts.boletoPdfUrl,
        barcode: artifacts.barcode,
        pixCopyPaste: artifacts.pixCopyPaste,
        pixQrCodeImage: artifacts.pixQrCodeImage,
        paymentUrl: artifacts.paymentUrl,
        rawResponse: toJson(charge),
        lastSyncedAt: new Date(),
      },
    });

    if (paid && payment.installmentId) {
      await markReceivableInstallmentPaid(tx, {
        installmentId: payment.installmentId,
        paymentMethod: PaymentMethod.BOLETO,
        amountCents: artifacts.amountCents || payment.amountCents,
        externalReference: providerChargeId ? `EFI:${providerChargeId}` : null,
        notes: `Baixa automática Efí da cobrança ${providerChargeId ?? payment.id}.`,
      });
    }

    return updated;
  });
}

async function createBilletForInstallment(
  order: OrderForBillet,
  installment: InstallmentForBillet,
  requestUrl: string
) {
  const customId = buildCustomId(installment.id);
  const customer = buildCustomer(order.client);
  const expireAt = formatDateForEfi(installment.dueDate);
  const payload = {
    items: [
      {
        name: buildItemName(order, installment),
        value: installment.amountCents,
        amount: 1,
      },
    ],
    metadata: {
      custom_id: customId,
      notification_url: buildNotificationUrl(requestUrl),
    },
    payment: {
      banking_billet: {
        customer,
        expire_at: expireAt,
        configurations: {
          days_to_write_off: parsePercentEnv("EFI_BOLETO_DAYS_TO_WRITE_OFF", 30),
          fine: parsePercentEnv("EFI_BOLETO_FINE", 200),
          interest: parsePercentEnv("EFI_BOLETO_INTEREST", 33),
        },
        message: boletoMessage(order.number),
      },
    },
  };

  const charge = await createEfiBilletOneStep(payload);
  const artifacts = extractEfiPaymentArtifacts(charge);
  const providerChargeId = artifacts.providerChargeId;

  if (!providerChargeId) {
    throw new EfiChargesApiError(
      "Efí não retornou o identificador da cobrança.",
      502,
      charge
    );
  }

  const type = artifacts.pixCopyPaste
    ? ExternalPaymentType.BOLIX
    : ExternalPaymentType.BOLETO;

  const payment = await prisma.externalPayment.create({
    data: {
      provider: PaymentProvider.EFI,
      type,
      status: artifacts.status,
      orderId: order.id,
      accountsReceivableId: installment.accountsReceivableId,
      installmentId: installment.id,
      providerChargeId,
      customId,
      amountCents: artifacts.amountCents || installment.amountCents,
      dueDate: dateFromEfi(artifacts.expireAt) ?? installment.dueDate,
      boletoLink: artifacts.boletoLink,
      boletoPdfUrl: artifacts.boletoPdfUrl,
      barcode: artifacts.barcode,
      pixCopyPaste: artifacts.pixCopyPaste,
      pixQrCodeImage: artifacts.pixQrCodeImage,
      paymentUrl: artifacts.paymentUrl,
      rawResponse: toJson(charge),
      lastSyncedAt: new Date(),
    },
  });

  return payment;
}

export async function ensureEfiBilletsForOrder(
  orderId: string,
  requestUrl: string,
  installmentId?: string | null
): Promise<EfiPaymentResult[]> {
  const order = await findOrderForBillet(orderId);
  const installments = normalizeInstallments(order).filter((installment) => {
    if (installmentId && installment.id !== installmentId) return false;
    if (installment.status === "PAID") return false;
    return installment.amountCents - installment.receivedCents > 0;
  });

  if (!installments.length) {
    throw new Error("Não há parcelas em aberto para emitir boleto.");
  }

  const results: EfiPaymentResult[] = [];

  for (const installment of installments) {
    const existing = await prisma.externalPayment.findFirst({
      where: {
        provider: PaymentProvider.EFI,
        installmentId: installment.id,
        type: { in: [ExternalPaymentType.BOLETO, ExternalPaymentType.BOLIX] },
        status: { in: [...OPEN_EXTERNAL_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing?.providerChargeId) {
      const charge = await getEfiCharge(existing.providerChargeId);
      const payment = await updateExternalPaymentFromCharge(existing, charge);
      results.push({ payment, created: false, synced: true });
      continue;
    }

    const payment = await createBilletForInstallment(
      order,
      installment,
      requestUrl
    );
    results.push({ payment, created: true, synced: false });
  }

  return results;
}

export async function processEfiChargesNotification(token: string) {
  const items = await getEfiNotification(token);
  const processed = [];

  for (const [index, item] of items.entries()) {
    const chargeId = item.identifiers?.charge_id;
    const eventKey = `efi:charges:${token}:${item.id ?? chargeId ?? index}`;

    const result = await prisma.$transaction(async (tx) => {
      const previousEvent = await tx.paymentWebhookEvent.findUnique({
        where: { eventKey },
        select: { id: true, processedAt: true },
      });

      if (previousEvent?.processedAt) {
        return { skipped: true, eventId: previousEvent.id };
      }

      const externalPayment = chargeId
        ? await tx.externalPayment.findFirst({
            where: {
              provider: PaymentProvider.EFI,
              providerChargeId: String(chargeId),
            },
          })
        : item.custom_id
        ? await tx.externalPayment.findFirst({
            where: {
              provider: PaymentProvider.EFI,
              customId: item.custom_id,
            },
          })
        : null;

      const currentStatus = item.status?.current ?? null;
      const mappedStatus = mapEfiChargeStatus(currentStatus);

      const event = previousEvent
        ? await tx.paymentWebhookEvent.update({
            where: { id: previousEvent.id },
            data: {
              token,
              type: item.type ?? null,
              externalPaymentId: externalPayment?.id ?? null,
              payload: toJson(item),
            },
          })
        : await tx.paymentWebhookEvent.create({
            data: {
              provider: PaymentProvider.EFI,
              source: "charges",
              eventKey,
              token,
              type: item.type ?? null,
              externalPaymentId: externalPayment?.id ?? null,
              payload: toJson(item),
            },
          });

      if (!externalPayment) {
        await tx.paymentWebhookEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            error: "Cobrança Efí não encontrada no sistema.",
          },
        });
        return { skipped: true, eventId: event.id };
      }

      await tx.externalPayment.update({
        where: { id: externalPayment.id },
        data: {
          status: mappedStatus,
          rawNotification: toJson(item),
          lastSyncedAt: new Date(),
          ...(mappedStatus === ExternalPaymentStatus.PAID
            ? {
                paidAt: new Date(),
                paidCents: externalPayment.amountCents,
              }
            : {}),
        },
      });

      if (isEfiPaidStatus(currentStatus)) {
        if (externalPayment.installmentId) {
          await markReceivableInstallmentPaid(tx, {
            installmentId: externalPayment.installmentId,
            paymentMethod:
              externalPayment.type === ExternalPaymentType.BOLIX
                ? PaymentMethod.PIX
                : PaymentMethod.BOLETO,
            amountCents: externalPayment.amountCents,
            externalReference: externalPayment.providerChargeId
              ? `EFI:${externalPayment.providerChargeId}`
              : null,
            notes: externalPayment.providerChargeId
              ? `Baixa automática Efí da cobrança ${externalPayment.providerChargeId}.`
              : "Baixa automática Efí.",
          });
        } else if (externalPayment.type === ExternalPaymentType.PAYMENT_LINK) {
          await markOrderInstallmentsPaidFromLink(tx, {
            orderId: externalPayment.orderId,
            providerChargeId: externalPayment.providerChargeId,
          });
        }
      }

      await tx.paymentWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), error: null },
      });

      return { skipped: false, eventId: event.id };
    });

    processed.push(result);
  }

  return {
    token,
    items: items.length,
    processed,
  };
}

export { EfiChargesApiError, EfiChargesConfigError };
