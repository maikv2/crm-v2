// Solicitacao de expositor novo: rotulos e mensagem enviada ao cliente.

export const EXHIBITOR_REQUEST_MATERIALS = {
  ACRYLIC: "Acrílico",
  IRON: "Ferro",
} as const;

export const EXHIBITOR_REQUEST_MOUNTINGS = {
  FLOOR: "Chão",
  COUNTER: "Balcão",
  WALL: "Parede",
} as const;

export const EXHIBITOR_REQUEST_STATUSES = {
  PENDING: "Aguardando entrega",
  DELIVERED: "Entregue",
  CANCELED: "Cancelada",
} as const;

export type ExhibitorRequestMaterial = keyof typeof EXHIBITOR_REQUEST_MATERIALS;
export type ExhibitorRequestMounting = keyof typeof EXHIBITOR_REQUEST_MOUNTINGS;
export type ExhibitorRequestStatus = keyof typeof EXHIBITOR_REQUEST_STATUSES;

export function isExhibitorRequestMaterial(value: unknown): value is ExhibitorRequestMaterial {
  return typeof value === "string" && value in EXHIBITOR_REQUEST_MATERIALS;
}

export function isExhibitorRequestMounting(value: unknown): value is ExhibitorRequestMounting {
  return typeof value === "string" && value in EXHIBITOR_REQUEST_MOUNTINGS;
}

export function isExhibitorRequestStatus(value: unknown): value is ExhibitorRequestStatus {
  return typeof value === "string" && value in EXHIBITOR_REQUEST_STATUSES;
}

export function materialLabel(value?: string | null) {
  return EXHIBITOR_REQUEST_MATERIALS[value as ExhibitorRequestMaterial] ?? value ?? "-";
}

export function mountingLabel(value?: string | null) {
  return EXHIBITOR_REQUEST_MOUNTINGS[value as ExhibitorRequestMounting] ?? value ?? "-";
}

export function statusLabel(value?: string | null) {
  return EXHIBITOR_REQUEST_STATUSES[value as ExhibitorRequestStatus] ?? value ?? "-";
}

/** Descricao curta: "Expositor de chão em acrílico" */
export function describeExhibitor(material?: string | null, mounting?: string | null) {
  return `Expositor de ${mountingLabel(mounting).toLowerCase()} em ${materialLabel(material).toLowerCase()}`;
}

export function formatRequestNumber(number: number) {
  return `SOL-${String(number).padStart(4, "0")}`;
}

/**
 * A data prevista e um dia (sem hora). Guardamos ao meio-dia UTC para que
 * continue no mesmo dia em qualquer fuso do Brasil.
 */
export function parseExpectedDate(value: unknown): Date | null {
  const text = String(value ?? "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatExpectedDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function buildExhibitorRequestMessage(params: {
  number: number;
  clientName: string;
  material: string;
  mounting: string;
  quantity: number;
  expectedAt: Date | string;
  notes?: string | null;
  sellerName?: string | null;
  createdAt: Date | string;
}) {
  const lines = [
    `Olá, ${params.clientName}!`,
    "",
    "Segue a cópia da sua solicitação de expositor V2:",
    "",
    `*Solicitação:* ${formatRequestNumber(params.number)}`,
    `*Data da solicitação:* ${new Date(params.createdAt).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    })}`,
    `*Expositor:* ${mountingLabel(params.mounting)} · ${materialLabel(params.material)}`,
    `*Quantidade:* ${params.quantity}`,
    `*Previsão de entrega:* ${formatExpectedDate(params.expectedAt)}`,
  ];

  if (params.sellerName) lines.push(`*Vendedor:* ${params.sellerName}`);
  if (params.notes) lines.push(`*Observações:* ${params.notes}`);

  lines.push("", "Qualquer dúvida, é só nos chamar por aqui.");

  return lines.join("\n");
}
