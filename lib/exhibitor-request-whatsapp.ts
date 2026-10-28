import { prisma } from "@/lib/prisma";
import { sendText, ZApiConfigError, ZApiRequestError } from "@/lib/zapi";
import { buildExhibitorRequestMessage } from "@/lib/exhibitor-requests";

export class ExhibitorRequestWhatsappError extends Error {}

/** Dados que as telas de solicitacao de expositor usam */
export const exhibitorRequestInclude = {
  client: {
    select: {
      id: true,
      name: true,
      tradeName: true,
      code: true,
      city: true,
      state: true,
      whatsapp: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
  },
  region: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, name: true } },
} as const;

export function whatsappErrorMessage(error: unknown) {
  if (error instanceof ExhibitorRequestWhatsappError) return error.message;
  if (error instanceof ZApiConfigError) return error.message;
  if (error instanceof ZApiRequestError) return error.message;
  return "Não foi possível enviar pelo WhatsApp.";
}

/** Envia a copia da solicitacao para o WhatsApp do cliente e marca o envio. */
export async function sendExhibitorRequestWhatsapp(requestId: string, phoneOverride?: string | null) {
  const request = await prisma.exhibitorRequest.findUnique({
    where: { id: requestId },
    include: {
      client: { select: { name: true, tradeName: true, whatsapp: true, phone: true } },
      requestedBy: { select: { name: true } },
    },
  });

  if (!request) {
    throw new ExhibitorRequestWhatsappError("Solicitação não encontrada.");
  }

  const phone = String(phoneOverride || request.client.whatsapp || request.client.phone || "").trim();
  if (!phone) {
    throw new ExhibitorRequestWhatsappError("Cliente sem WhatsApp/telefone cadastrado.");
  }

  const message = buildExhibitorRequestMessage({
    number: request.number,
    clientName: request.client.tradeName || request.client.name,
    material: request.material,
    mounting: request.mounting,
    quantity: request.quantity,
    expectedAt: request.expectedAt,
    notes: request.notes,
    sellerName: request.requestedBy?.name,
    createdAt: request.createdAt,
  });

  await sendText({ phone, message });

  await prisma.exhibitorRequest.update({
    where: { id: request.id },
    data: { whatsappSentAt: new Date() },
  });

  return { phone };
}
