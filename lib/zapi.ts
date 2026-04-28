/**
 * Cliente Z-API para envio de mensagens e documentos via WhatsApp.
 *
 * Configuração esperada (process.env):
 *   ZAPI_INSTANCE_ID   – ID da instância (ex: 3F25569A914C43387A7D26F49989160C)
 *   ZAPI_TOKEN         – Token da instância (no painel: "Token da instância")
 *   ZAPI_CLIENT_TOKEN  – Account security token (no painel: "Conta › Segurança")
 *
 * Docs: https://developer.z-api.io/
 */

const ZAPI_BASE = "https://api.z-api.io";

export class ZApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZApiConfigError";
  }
}

export class ZApiRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ZApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function getCredentials() {
  const instanceId = process.env.ZAPI_INSTANCE_ID?.trim();
  const token = process.env.ZAPI_TOKEN?.trim();
  const clientToken = process.env.ZAPI_CLIENT_TOKEN?.trim();

  if (!instanceId || !token) {
    throw new ZApiConfigError(
      "ZAPI_INSTANCE_ID e ZAPI_TOKEN precisam estar definidos no ambiente."
    );
  }

  if (!clientToken) {
    throw new ZApiConfigError(
      "ZAPI_CLIENT_TOKEN (Account security token) não configurado."
    );
  }

  return { instanceId, token, clientToken };
}

function buildUrl(path: string) {
  const { instanceId, token } = getCredentials();
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${ZAPI_BASE}/instances/${instanceId}/token/${token}/${trimmed}`;
}

async function postJson<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const { clientToken } = getCredentials();
  const url = buildUrl(path);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new ZApiRequestError(
      `Z-API ${path} falhou (${res.status}).`,
      res.status,
      parsed
    );
  }

  return parsed as T;
}

async function getJson<T = unknown>(path: string): Promise<T> {
  const { clientToken } = getCredentials();
  const url = buildUrl(path);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Client-Token": clientToken,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new ZApiRequestError(
      `Z-API ${path} falhou (${res.status}).`,
      res.status,
      parsed
    );
  }

  return parsed as T;
}

/**
 * Normaliza um número brasileiro para o padrão aceito pelo Z-API:
 *   apenas dígitos, com prefixo 55, sem o "+".
 */
export function normalizeBrazilPhone(input?: string | null): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return null;
}

export type SendTextResponse = {
  zaapId?: string;
  messageId?: string;
  id?: string;
};

export async function sendText(params: {
  phone: string;
  message: string;
}): Promise<SendTextResponse> {
  const phone = normalizeBrazilPhone(params.phone);
  if (!phone) {
    throw new ZApiRequestError("Telefone inválido.", 400, { phone: params.phone });
  }

  return postJson<SendTextResponse>("send-text", {
    phone,
    message: params.message,
  });
}

export type SendDocumentResponse = {
  zaapId?: string;
  messageId?: string;
  id?: string;
};

/**
 * Envia um documento (PDF, XML, etc) via WhatsApp.
 * `extension` é a extensão sem ponto (pdf, xml, jpg, ...).
 */
export async function sendDocument(params: {
  phone: string;
  document: Buffer | Uint8Array | string;
  fileName: string;
  extension: string;
  caption?: string;
}): Promise<SendDocumentResponse> {
  const phone = normalizeBrazilPhone(params.phone);
  if (!phone) {
    throw new ZApiRequestError("Telefone inválido.", 400, { phone: params.phone });
  }

  const extension = params.extension.replace(/^\./, "").toLowerCase();
  if (!extension) {
    throw new ZApiRequestError("Extensão do documento é obrigatória.", 400, {});
  }

  const mime = mimeForExtension(extension);
  const documentDataUrl = toDataUrl(params.document, mime);

  return postJson<SendDocumentResponse>(`send-document/${extension}`, {
    phone,
    document: documentDataUrl,
    fileName: params.fileName,
    ...(params.caption ? { caption: params.caption } : {}),
  });
}

function mimeForExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "xml":
      return "application/xml";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

function toDataUrl(
  document: Buffer | Uint8Array | string,
  mime: string
): string {
  if (typeof document === "string") {
    if (document.startsWith("data:")) return document;
    return `data:${mime};base64,${document}`;
  }
  const buf = Buffer.isBuffer(document) ? document : Buffer.from(document);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export type InstanceStatus = {
  connected?: boolean;
  smartphoneConnected?: boolean;
  session?: string;
  error?: string;
};

export async function getStatus(): Promise<InstanceStatus> {
  return getJson<InstanceStatus>("status");
}