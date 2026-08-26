import { ExternalPaymentStatus } from "@prisma/client";

type EfiEnvironment = "production" | "homologation";

type EfiConfig = {
  environment: EfiEnvironment;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
};

type EfiAuthResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type EfiApiEnvelope<T> = {
  code?: number;
  data?: T;
};

export type EfiBilletCustomer = {
  name?: string;
  cpf?: string;
  email?: string;
  phone_number?: string;
  juridical_person?: {
    corporate_name: string;
    cnpj: string;
  };
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    zipcode: string;
    city: string;
    complement?: string;
    state: string;
  };
};

export type EfiChargePayload = {
  items: Array<{
    name: string;
    value: number;
    amount: number;
  }>;
  metadata?: {
    custom_id?: string;
    notification_url?: string;
  };
  payment: {
    banking_billet: {
      customer: EfiBilletCustomer;
      expire_at: string;
      configurations?: {
        days_to_write_off?: number;
        fine?: number;
        interest?:
          | number
          | {
              value: number;
              type: "daily" | "monthly";
            };
      };
      message?: string;
    };
  };
};

export type EfiChargeData = {
  charge_id?: number | string;
  id?: number | string;
  status?: string;
  total?: number;
  custom_id?: string | null;
  barcode?: string;
  link?: string;
  billet_link?: string;
  payment_url?: string;
  expire_at?: string;
  pdf?: {
    charge?: string;
  };
  pix?: {
    qrcode?: string;
    qrcode_image?: string;
  };
  payment?: {
    method?: string;
    payment_method?: string;
    banking_billet?: {
      barcode?: string;
      link?: string;
      billet_link?: string;
      expire_at?: string;
      pdf?: {
        charge?: string;
      };
      pix?: {
        qrcode?: string;
        qrcode_image?: string;
      };
    };
  };
};

export type EfiNotificationItem = {
  id?: number | string;
  type?: string;
  custom_id?: string | null;
  status?: {
    current?: string | null;
    previous?: string | null;
  };
  identifiers?: {
    charge_id?: number | string;
    carnet_id?: number | string;
  };
  created_at?: string;
};

export class EfiChargesConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EfiChargesConfigError";
  }
}

export class EfiChargesApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "EfiChargesApiError";
    this.status = status;
    this.payload = payload;
  }
}

let cachedToken:
  | {
      key: string;
      accessToken: string;
      expiresAt: number;
    }
  | null = null;

function normalizeEnvironment(value?: string | null): EfiEnvironment {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "production" || raw === "prod" ? "production" : "homologation";
}

function readConfig(): EfiConfig {
  const environment = normalizeEnvironment(
    process.env.EFI_CHARGES_ENV || process.env.EFI_ENV
  );

  const production = environment === "production";
  const clientId = (
    production
      ? process.env.EFI_CHARGES_PRODUCTION_CLIENT_ID ||
        process.env.EFI_CHARGES_CLIENT_ID
      : process.env.EFI_CHARGES_HOMOLOG_CLIENT_ID ||
        process.env.EFI_CHARGES_CLIENT_ID
  )?.trim();
  const clientSecret = (
    production
      ? process.env.EFI_CHARGES_PRODUCTION_CLIENT_SECRET ||
        process.env.EFI_CHARGES_CLIENT_SECRET
      : process.env.EFI_CHARGES_HOMOLOG_CLIENT_SECRET ||
        process.env.EFI_CHARGES_CLIENT_SECRET
  )?.trim();

  if (!clientId || !clientSecret) {
    throw new EfiChargesConfigError(
      "Credenciais da API Cobranças Efí não configuradas."
    );
  }

  return {
    environment,
    clientId,
    clientSecret,
    baseUrl: production
      ? "https://cobrancas.api.efipay.com.br"
      : "https://cobrancas-h.api.efipay.com.br",
  };
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getAccessToken(config: EfiConfig) {
  const key = `${config.environment}:${config.clientId}`;
  if (
    cachedToken?.key === key &&
    cachedToken.expiresAt > Date.now() + 30_000
  ) {
    return cachedToken.accessToken;
  }

  const auth = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
    "utf8"
  ).toString("base64");

  const res = await fetch(`${config.baseUrl}/v1/authorize`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  const payload = (await parseResponse(res)) as EfiAuthResponse | null;

  if (!res.ok || !payload?.access_token) {
    throw new EfiChargesApiError(
      `Autorização Efí falhou (${res.status}).`,
      res.status,
      payload
    );
  }

  const expiresInMs = Math.max(60, payload.expires_in ?? 600) * 1000;
  cachedToken = {
    key,
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresInMs,
  };

  return payload.access_token;
}

async function requestEfi<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<T> {
  const config = readConfig();
  const token = await getAccessToken(config);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });

  const payload = await parseResponse(res);

  if (!res.ok) {
    throw new EfiChargesApiError(
      `Efí ${method} ${path} falhou (${res.status}).`,
      res.status,
      payload
    );
  }

  return payload as T;
}

export async function createEfiBilletOneStep(payload: EfiChargePayload) {
  const response = await requestEfi<EfiApiEnvelope<EfiChargeData>>(
    "POST",
    "/v1/charge/one-step",
    payload
  );

  if (!response.data) {
    throw new EfiChargesApiError("Resposta Efí sem dados da cobrança.", 502, response);
  }

  return response.data;
}

export async function getEfiCharge(chargeId: string | number) {
  const response = await requestEfi<EfiApiEnvelope<EfiChargeData>>(
    "GET",
    `/v1/charge/${encodeURIComponent(String(chargeId))}`
  );

  if (!response.data) {
    throw new EfiChargesApiError("Resposta Efí sem dados da cobrança.", 502, response);
  }

  return response.data;
}

export async function updateEfiBilletDueDate(
  chargeId: string | number,
  expireAt: string
) {
  await requestEfi<EfiApiEnvelope<unknown>>(
    "PUT",
    `/v1/charge/${encodeURIComponent(String(chargeId))}/billet`,
    { expire_at: expireAt }
  );

  return getEfiCharge(chargeId);
}

export async function getEfiNotification(token: string) {
  const response = await requestEfi<EfiApiEnvelope<EfiNotificationItem[]>>(
    "GET",
    `/v1/notification/${encodeURIComponent(token)}`
  );

  return response.data ?? [];
}

export function mapEfiChargeStatus(status?: string | null): ExternalPaymentStatus {
  switch (String(status ?? "").toLowerCase()) {
    case "paid":
    case "settled":
      return ExternalPaymentStatus.PAID;
    case "unpaid":
      return ExternalPaymentStatus.OVERDUE;
    case "canceled":
    case "cancelled":
      return ExternalPaymentStatus.CANCELED;
    case "expired":
      return ExternalPaymentStatus.EXPIRED;
    case "new":
    case "waiting":
    case "identified":
    case "link":
    default:
      return ExternalPaymentStatus.PENDING;
  }
}

export function isEfiPaidStatus(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "paid" || normalized === "settled";
}

export function extractEfiPaymentArtifacts(data: EfiChargeData) {
  const billet = data.payment?.banking_billet;
  const pix = data.pix ?? billet?.pix;

  return {
    providerChargeId: String(data.charge_id ?? data.id ?? ""),
    status: mapEfiChargeStatus(data.status),
    amountCents: Number(data.total ?? 0),
    boletoLink: data.billet_link || data.link || billet?.billet_link || billet?.link || null,
    boletoPdfUrl: data.pdf?.charge || billet?.pdf?.charge || null,
    barcode: data.barcode || billet?.barcode || null,
    pixCopyPaste: pix?.qrcode || null,
    pixQrCodeImage: pix?.qrcode_image || null,
    paymentUrl: data.payment_url || null,
    expireAt: data.expire_at || billet?.expire_at || null,
  };
}
