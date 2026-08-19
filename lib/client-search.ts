export type SearchableClient = {
  name?: string | null;
  tradeName?: string | null;
  legalName?: string | null;
  code?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  region?: {
    name?: string | null;
  } | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function clientMatchesSearch(client: SearchableClient, rawSearch: string) {
  const search = normalizeText(rawSearch);
  if (!search) return true;

  const textHaystack = [
    client.name,
    client.tradeName,
    client.legalName,
    client.code,
    client.city,
    client.state,
    client.district,
    client.email,
    client.region?.name,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(String(value)))
    .join(" ");

  if (textHaystack.includes(search)) return true;

  const searchDigits = onlyDigits(rawSearch);
  if (!searchDigits) return false;

  const digitHaystack = [
    client.code,
    client.phone,
    client.whatsapp,
    client.cnpj,
    client.cpf,
  ]
    .filter(Boolean)
    .map((value) => onlyDigits(String(value)))
    .join(" ");

  return digitHaystack.includes(searchDigits);
}
