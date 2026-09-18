import crypto from "crypto";

type OrderApprovalPayload = {
  requestId: string;
  exp: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function getSecret() {
  return process.env.PASSWORD_RESET_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "crm-v2-order-approval-secret";
}

function sign(payload: string) {
  return base64UrlEncode(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  );
}

// Link mandado pro WhatsApp da empresa - validade generosa (14 dias) porque
// o financeiro pode nao aprovar na hora, diferente de um link de senha.
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function createOrderApprovalToken(requestId: string) {
  const payload = base64UrlEncode(
    JSON.stringify({
      requestId,
      exp: Date.now() + TOKEN_TTL_MS,
    } satisfies OrderApprovalPayload)
  );

  return `${payload}.${sign(payload)}`;
}

export function readOrderApprovalToken(token: string): OrderApprovalPayload | null {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature) return null;
  if (signature !== sign(payload)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as OrderApprovalPayload;

    if (!parsed.requestId || typeof parsed.requestId !== "string") return null;
    if (!parsed.exp || parsed.exp < Date.now()) return null;

    return parsed;
  } catch {
    return null;
  }
}
