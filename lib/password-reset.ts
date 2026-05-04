import crypto from "crypto";

type PasswordResetPayload = {
  subjectType: "USER" | "CLIENT";
  subjectId: string;
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
  return process.env.PASSWORD_RESET_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "crm-v2-password-reset-secret";
}

function sign(payload: string) {
  return base64UrlEncode(
    crypto.createHmac("sha256", getSecret()).update(payload).digest()
  );
}

export function createPasswordResetToken(
  subjectType: PasswordResetPayload["subjectType"],
  subjectId: string
) {
  const payload = base64UrlEncode(
    JSON.stringify({
      subjectType,
      subjectId,
      exp: Date.now() + 1000 * 60 * 30,
    } satisfies PasswordResetPayload)
  );

  return `${payload}.${sign(payload)}`;
}

export function readPasswordResetToken(token: string): PasswordResetPayload | null {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature) return null;
  if (signature !== sign(payload)) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as PasswordResetPayload;

    if (parsed.subjectType !== "USER" && parsed.subjectType !== "CLIENT") {
      return null;
    }

    if (!parsed.subjectId || typeof parsed.subjectId !== "string") {
      return null;
    }

    if (!parsed.exp || parsed.exp < Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
