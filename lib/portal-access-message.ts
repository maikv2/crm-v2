export type PortalAccessMessageParams = {
  clientName: string;
  accessCode: string;
  portalUrl: string;
};

export function normalizeBrazilWhatsapp(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function buildPortalAccessMessage({
  clientName,
  accessCode,
  portalUrl,
}: PortalAccessMessageParams) {
  return [
    `Olá, ${clientName}!`,
    "",
    "Seu acesso ao Portal do Cliente V2 está liberado.",
    "",
    "Link de acesso:",
    portalUrl,
    "",
    `Usuário: ${accessCode}`,
    `Senha: ${accessCode}`,
    "",
    "No portal você pode:",
    "- Ver seus pedidos",
    "- Baixar o PDF dos pedidos",
    "- Baixar NF-e quando disponível",
    "- Solicitar novos pedidos",
    "- Solicitar visita",
    "- Solicitar manutenção do expositor",
    "",
    "Qualquer dúvida, é só nos chamar por aqui.",
  ].join("\n");
}

export function buildPortalAccessWhatsappUrl({
  phone,
  message,
}: {
  phone?: string | null;
  message: string;
}) {
  const whatsapp = normalizeBrazilWhatsapp(phone);
  if (!whatsapp) return "";
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}
