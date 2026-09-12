import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ExhibitorStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Login pro site (v2-storefront) usando as MESMAS credenciais que o cliente
 * ja tem no portal do CRM (mesmo usuario/senha - codigo de cadastro, CNPJ,
 * e-mail ou nome, + senha). Nao cria cookie/sessao do CRM (isso e so pro
 * portal em si) - so confere a senha e devolve os dados do cliente pro site
 * guardar a sessao dele mesmo.
 *
 * Reaproveita a mesma logica de busca de app/api/portal-auth/login (mesmos
 * criterios: codigo, e-mail, CNPJ/CPF ou nome exato), pra nao criar um
 * segundo jeito de logar diferente do que o cliente ja usa.
 */

function hasValidApiKey(request: Request) {
  const expectedKey = process.env.ECOMMERCE_API_KEY?.trim();
  if (!expectedKey) return false;

  const headerKey =
    request.headers.get("x-ecommerce-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerKey === expectedKey;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

const clientSelect = {
  id: true,
  name: true,
  tradeName: true,
  legalName: true,
  code: true,
  cnpj: true,
  cpf: true,
  email: true,
  billingEmail: true,
  whatsapp: true,
  phone: true,
  stateRegistration: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
  district: true,
  city: true,
  state: true,
  portalEnabled: true,
  portalPasswordHash: true,
  active: true,
};

type ClientCandidate = Awaited<ReturnType<typeof prisma.client.findFirst<{ select: typeof clientSelect }>>>;

async function findClientByExactIdentifier(username: string, normalizedEmail: string, normalizedDigits: string): Promise<ClientCandidate> {
  return prisma.client.findFirst({
    where: {
      portalEnabled: true,
      active: true,
      OR: [
        { code: username },
        { email: normalizedEmail },
        { billingEmail: normalizedEmail },
        ...(normalizedDigits ? [{ cnpj: normalizedDigits }, { cpf: normalizedDigits }] : []),
      ],
    },
    select: clientSelect,
    orderBy: { createdAt: "asc" },
  });
}

async function findClientByExactName(username: string): Promise<ClientCandidate | "AMBIGUOUS"> {
  const clients = await prisma.client.findMany({
    where: {
      portalEnabled: true,
      active: true,
      OR: [
        { name: { equals: username, mode: "insensitive" } },
        { tradeName: { equals: username, mode: "insensitive" } },
      ],
    },
    select: clientSelect,
    orderBy: { createdAt: "asc" },
    take: 2,
  });

  if (clients.length > 1) return "AMBIGUOUS";
  return clients[0] || null;
}

export async function POST(request: Request) {
  try {
    if (!hasValidApiKey(request)) {
      return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const username = normalizeText(body?.username);
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "Usuário e senha são obrigatórios." }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(username);
    const normalizedDigits = onlyDigits(username);

    const clientByIdentifier = await findClientByExactIdentifier(username, normalizedEmail, normalizedDigits);
    const client = clientByIdentifier || (await findClientByExactName(username));

    if (client === "AMBIGUOUS") {
      return NextResponse.json(
        { error: "Encontramos mais de uma empresa com esse nome. Use o código de cadastro, CNPJ ou e-mail." },
        { status: 409 },
      );
    }

    if (!client || !client.portalPasswordHash) {
      return NextResponse.json({ error: "Usuário inválido." }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, client.portalPasswordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Senha inválida." }, { status: 401 });
    }

    const activeExhibitor = await prisma.exhibitor.findFirst({
      where: { clientId: client.id, status: ExhibitorStatus.ACTIVE },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      client: {
        id: client.id,
        companyName: client.tradeName || client.legalName || client.name,
        legalName: client.legalName || client.name,
        code: client.code,
        cnpj: client.cnpj,
        cpf: client.cpf,
        email: client.email || client.billingEmail,
        whatsapp: client.whatsapp || client.phone,
        stateRegistration: client.stateRegistration,
        address: {
          cep: client.cep,
          street: client.street,
          number: client.number,
          complement: client.complement,
          district: client.district,
          city: client.city,
          state: client.state,
        },
        hasActiveDisplay: Boolean(activeExhibitor),
      },
    });
  } catch (error) {
    console.error("POST /api/ecommerce/auth/login error:", error);
    return NextResponse.json({ error: "Não foi possível autenticar." }, { status: 500 });
  }
}
