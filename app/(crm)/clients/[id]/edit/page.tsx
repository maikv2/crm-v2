"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

type Region = {
  id: string;
  name: string;
};

type OtherContact = {
  person: string;
  email: string;
  phone: string;
  mobile: string;
  role: string;
};

type ClientForm = {
  personType: "JURIDICA" | "FISICA";
  cnpj: string;
  cpf: string;
  tradeName: string;
  legalName: string;
  roleClient: boolean;
  roleSupplier: boolean;
  roleCarrier: boolean;
  registrationCode: string;
  billingEmail: string;
  whatsapp: string;
  simpleTaxOption: boolean | null;
  publicAgency: boolean | null;
  stateRegistrationIndicator: "CONTRIBUINTE" | "ISENTO" | "NAO_CONTRIBUINTE";
  stateRegistration: string;
  municipalRegistration: string;
  suframaRegistration: string;
  country: string;
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  complement: string;
  regionId: string;
  notes: string;
  otherContacts: OtherContact[];
  active: boolean;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCNPJ(value: string) {
  const v = onlyDigits(value).slice(0, 14);
  if (!v) return "";
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.replace(/^(\d{2})(\d+)/, "$1.$2");
  if (v.length <= 8) return v.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
  if (v.length <= 12) {
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  }
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, "$1.$2.$3/$4-$5");
}

function formatCPF(value: string) {
  const v = onlyDigits(value).slice(0, 11);
  if (!v) return "";
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.replace(/^(\d{3})(\d+)/, "$1.$2");
  if (v.length <= 9) return v.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  return v.replace(/^(\d{3})(\d{3})(\d{3})(\d+)/, "$1.$2.$3-$4");
}

function formatCEP(value: string) {
  const v = onlyDigits(value).slice(0, 8);
  if (v.length <= 5) return v;
  return v.replace(/^(\d{5})(\d+)/, "$1-$2");
}

function formatPhoneBR(value: string) {
  const v = onlyDigits(value).slice(0, 11);

  if (!v) return "";
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return v.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (v.length <= 10) return v.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return v.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

function isValidCNPJ(cnpj: string) {
  cnpj = onlyDigits(cnpj);

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === Number(digits.charAt(1));
}

function Section({
  title,
  children,
  theme,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 20,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 0,
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 18, color: theme.subtext }}>{open ? "⌃" : "⌄"}</span>
      </button>

      {open ? <div style={{ marginTop: 18 }}>{children}</div> : null}
    </div>
  );
}

function normalizePersonType(value: any): "JURIDICA" | "FISICA" {
  if (value === "FISICA" || value === "PF" || value === "CPF") return "FISICA";
  return "JURIDICA";
}

function normalizeStateRegistrationIndicator(
  value: any
): "CONTRIBUINTE" | "ISENTO" | "NAO_CONTRIBUINTE" {
  if (value === "ISENTO") return "ISENTO";
  if (value === "NAO_CONTRIBUINTE") return "NAO_CONTRIBUINTE";
  return "CONTRIBUINTE";
}

function mapClientToForm(client: any): ClientForm {
  const otherContactsRaw = Array.isArray(client?.otherContacts)
    ? client.otherContacts
    : [];

  const otherContacts: OtherContact[] =
    otherContactsRaw.length > 0
      ? otherContactsRaw.map((item: any) => ({
          person: item?.person ?? "",
          email: item?.email ?? "",
          phone: item?.phone ? formatPhoneBR(String(item.phone)) : "",
          mobile: item?.mobile ? formatPhoneBR(String(item.mobile)) : "",
          role: item?.role ?? "",
        }))
      : [
          {
            person: "",
            email: "",
            phone: "",
            mobile: "",
            role: "",
          },
        ];

  return {
    personType: normalizePersonType(client?.personType),
    cnpj: client?.cnpj ? formatCNPJ(String(client.cnpj)) : "",
    cpf: client?.cpf ? formatCPF(String(client.cpf)) : "",
    tradeName: client?.tradeName ?? "",
    legalName: client?.legalName ?? client?.name ?? "",
    roleClient: client?.roleClient ?? true,
    roleSupplier: client?.roleSupplier ?? false,
    roleCarrier: client?.roleCarrier ?? false,
    registrationCode: client?.registrationCode ?? "",
    billingEmail: client?.billingEmail ?? client?.email ?? "",
    whatsapp: client?.whatsapp ? formatPhoneBR(String(client.whatsapp)) : "",
    simpleTaxOption:
      typeof client?.simpleTaxOption === "boolean" ? client.simpleTaxOption : false,
    publicAgency:
      typeof client?.publicAgency === "boolean" ? client.publicAgency : false,
    stateRegistrationIndicator: normalizeStateRegistrationIndicator(
      client?.stateRegistrationIndicator
    ),
    stateRegistration: client?.stateRegistration ?? "",
    municipalRegistration: client?.municipalRegistration ?? "",
    suframaRegistration: client?.suframaRegistration ?? "",
    country: client?.country ?? "Brasil",
    cep: client?.cep ? formatCEP(String(client.cep)) : "",
    street: client?.street ?? "",
    number: client?.number ?? "",
    district: client?.district ?? "",
    city: client?.city ?? "",
    state: client?.state ?? "",
    complement: client?.complement ?? "",
    regionId: client?.regionId ?? "",
    notes: client?.notes ?? "",
    otherContacts,
    active: client?.active ?? true,
  };
}

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const from = searchParams.get("from");
  const isRepresentativeFlow = from === "rep-client";

  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<ClientForm>({
    personType: "JURIDICA",
    cnpj: "",
    cpf: "",
    tradeName: "",
    legalName: "",
    roleClient: true,
    roleSupplier: false,
    roleCarrier: false,
    registrationCode: "",
    billingEmail: "",
    whatsapp: "",
    simpleTaxOption: false,
    publicAgency: false,
    stateRegistrationIndicator: "CONTRIBUINTE",
    stateRegistration: "",
    municipalRegistration: "",
    suframaRegistration: "",
    country: "Brasil",
    cep: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    complement: "",
    regionId: "",
    notes: "",
    otherContacts: [
      {
        person: "",
        email: "",
        phone: "",
        mobile: "",
        role: "",
      },
    ],
    active: true,
  });

  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjSuccess, setCnpjSuccess] = useState<string | null>(null);
  const [lastFetchedCnpj, setLastFetchedCnpj] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepSuccess, setCepSuccess] = useState<string | null>(null);
  const [lastFetchedCep, setLastFetchedCep] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      if (!id) return;

      try {
        setLoading(true);
        setPageError(null);
        setRegionsLoading(true);

        const [clientResponse, regionsResponse] = await Promise.all([
          fetch(`/api/clients/${id}`, { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
        ]);

        if (!clientResponse.ok) {
          const txt = await clientResponse.text();
          throw new Error(txt || "Não foi possível carregar o cliente");
        }

        const clientData = await clientResponse.json();
        const regionsData = regionsResponse.ok ? await regionsResponse.json() : [];
        const regionsList = Array.isArray(regionsData)
          ? regionsData
          : regionsData?.items ?? regionsData?.regions ?? [];

        if (!active) return;

        const mappedForm = mapClientToForm(clientData);

        setForm(mappedForm);
        setRegions(regionsList);
        setLastFetchedCnpj(onlyDigits(mappedForm.cnpj));
      } catch (err: any) {
        if (!active) return;
        setPageError(err?.message || "Erro ao carregar cliente");
        setRegions([]);
      } finally {
        if (active) {
          setLoading(false);
          setRegionsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [id]);

  const canSubmit = useMemo(() => {
    const mainName =
      form.personType === "JURIDICA" ? form.legalName.trim() : form.tradeName.trim();
    return !!mainName;
  }, [form]);

  function updateField<K extends keyof ClientForm>(field: K, value: ClientForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateOtherContact(
    index: number,
    field: keyof OtherContact,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      otherContacts: prev.otherContacts.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function addOtherContact() {
    setForm((prev) => ({
      ...prev,
      otherContacts: [
        ...prev.otherContacts,
        {
          person: "",
          email: "",
          phone: "",
          mobile: "",
          role: "",
        },
      ],
    }));
  }

  function removeOtherContact(index: number) {
    setForm((prev) => ({
      ...prev,
      otherContacts:
        prev.otherContacts.length === 1
          ? prev.otherContacts
          : prev.otherContacts.filter((_, i) => i !== index),
    }));
  }

  async function fetchCNPJData(rawValue?: string) {
    const cnpj = onlyDigits(rawValue ?? form.cnpj);

    if (form.personType !== "JURIDICA") return;
    if (cnpj.length !== 14) return;

    if (!isValidCNPJ(cnpj)) {
      setCnpjError("CNPJ inválido");
      setCnpjSuccess(null);
      return;
    }

    if (cnpjLoading) return;

    try {
      setCnpjLoading(true);
      setCnpjError(null);
      setCnpjSuccess(null);

      const response = await fetch(`/api/cnpj/${cnpj}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível consultar o CNPJ");
      }

      setForm((prev) => ({
        ...prev,
        cnpj: formatCNPJ(data.cnpj || cnpj),
        legalName: prev.legalName || data.razaoSocial || "",
        tradeName: prev.tradeName || data.nomeFantasia || "",
        billingEmail: prev.billingEmail || data.email || "",
        whatsapp: prev.whatsapp
          ? prev.whatsapp
          : data.telefone
          ? formatPhoneBR(data.telefone)
          : "",
        cep: prev.cep ? prev.cep : data.cep ? formatCEP(data.cep) : "",
        street: prev.street || data.logradouro || "",
        number: prev.number || data.numero || "",
        complement: prev.complement || data.complemento || "",
        district: prev.district || data.bairro || "",
        city: prev.city || data.municipio || "",
        state: prev.state || data.uf || "",
      }));

      setLastFetchedCnpj(cnpj);
      setCnpjSuccess("Dados preenchidos automaticamente pelo CNPJ.");
    } catch (err: any) {
      setCnpjError(err?.message || "Não foi possível consultar o CNPJ");
      setCnpjSuccess(null);
    } finally {
      setCnpjLoading(false);
    }
  }

  useEffect(() => {
    const cnpj = onlyDigits(form.cnpj);

    if (form.personType !== "JURIDICA") return;
    if (cnpj.length !== 14) return;
    if (!isValidCNPJ(cnpj)) return;
    if (cnpj === lastFetchedCnpj) return;

    const timer = setTimeout(() => {
      fetchCNPJData(cnpj);
    }, 700);

    return () => clearTimeout(timer);
  }, [form.cnpj, form.personType, lastFetchedCnpj]);

  async function fetchCEPData(rawValue?: string) {
    const cep = onlyDigits(rawValue ?? form.cep);

    if (cep.length !== 8) {
      setCepError("Informe um CEP com 8 dígitos.");
      setCepSuccess(null);
      return;
    }

    if (cepLoading) return;
    if (cep === lastFetchedCep) return;

    try {
      setCepLoading(true);
      setCepError(null);
      setCepSuccess(null);

      const response = await fetch(`/api/cep/${cep}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível consultar o CEP.");
      }

      setForm((prev) => ({
        ...prev,
        cep: data.cep ? formatCEP(data.cep) : prev.cep,
        street: prev.street || data.street || "",
        district: prev.district || data.district || "",
        city: prev.city || data.city || "",
        state: prev.state || data.state || "",
        complement: prev.complement || data.complement || "",
      }));

      setLastFetchedCep(cep);
      setCepSuccess("Endereço preenchido pelo CEP.");
    } catch (err: any) {
      setCepError(err?.message || "Erro ao consultar CEP.");
      setCepSuccess(null);
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    const cep = onlyDigits(form.cep);

    if (cep.length !== 8) return;
    if (cep === lastFetchedCep) return;

    const timer = setTimeout(() => {
      fetchCEPData(cep);
    }, 600);

    return () => clearTimeout(timer);
  }, [form.cep, lastFetchedCep]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!id) return;

    try {
      setSaving(true);
      setPageError(null);

      const payload = {
        name:
          form.personType === "JURIDICA"
            ? form.legalName.trim() || form.tradeName.trim()
            : form.tradeName.trim(),
        tradeName: form.tradeName.trim() || null,
        legalName: form.legalName.trim() || null,
        personType: form.personType,
        cpf: form.personType === "FISICA" ? onlyDigits(form.cpf) || null : null,
        cnpj: form.personType === "JURIDICA" ? onlyDigits(form.cnpj) || null : null,
        roleClient: form.roleClient,
        roleSupplier: form.roleSupplier,
        roleCarrier: form.roleCarrier,
        registrationCode: form.registrationCode.trim() || null,
        billingEmail: form.billingEmail.trim() || null,
        whatsapp: onlyDigits(form.whatsapp) || null,
        simpleTaxOption: form.simpleTaxOption,
        publicAgency: form.publicAgency,
        stateRegistrationIndicator: form.stateRegistrationIndicator,
        stateRegistration:
          form.stateRegistrationIndicator === "ISENTO"
            ? null
            : form.stateRegistration.trim() || null,
        municipalRegistration: form.municipalRegistration.trim() || null,
        suframaRegistration: form.suframaRegistration.trim() || null,
        country: form.country.trim() || "Brasil",
        cep: onlyDigits(form.cep) || null,
        street: form.street.trim() || null,
        number: form.number.trim() || null,
        district: form.district.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        complement: form.complement.trim() || null,
        regionId: form.regionId || null,
        notes: form.notes.trim() || null,
        active: form.active,
        otherContacts: form.otherContacts.filter(
          (item) =>
            item.person.trim() ||
            item.email.trim() ||
            item.phone.trim() ||
            item.mobile.trim() ||
            item.role.trim()
        ),
      };

      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível salvar o cliente");
      }

      router.push(isRepresentativeFlow ? `/rep/clients/${id}` : `/clients/${id}`);
    } catch (err: any) {
      setPageError(err?.message || "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          background: theme.pageBg,
          color: theme.text,
          minHeight: "100%",
          padding: 28,
        }}
      >
        Carregando cliente...
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Cadastros / Clientes
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            Editar cliente
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: theme.subtext,
              fontSize: 14,
            }}
          >
            Atualize os dados completos do cliente.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              router.push(isRepresentativeFlow ? `/rep/clients/${id}` : `/clients/${id}`)
            }
            style={{
              ...secondaryButtonStyle,
              background: theme.cardBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          >
            Voltar
          </button>

          <button
            type="submit"
            form="edit-client-form"
            style={{
              ...primaryButtonStyle,
              opacity: !canSubmit || saving ? 0.7 : 1,
              cursor: !canSubmit || saving ? "not-allowed" : "pointer",
            }}
            disabled={!canSubmit || saving}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      <form
        id="edit-client-form"
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 16 }}
      >
        <Section title="Dados gerais" theme={theme}>
          <div style={grid4Style}>
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Tipo de pessoa *</label>
              <select
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                value={form.personType}
                onChange={(e) =>
                  updateField("personType", e.target.value as "JURIDICA" | "FISICA")
                }
              >
                <option value="JURIDICA">Jurídica</option>
                <option value="FISICA">Física</option>
              </select>
            </div>

            {form.personType === "JURIDICA" ? (
              <>
                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>CNPJ</label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={(e) => {
                      const formatted = formatCNPJ(e.target.value);
                      updateField("cnpj", formatted);
                      setCnpjError(null);
                      setCnpjSuccess(null);

                      if (onlyDigits(formatted).length < 14) {
                        setLastFetchedCnpj("");
                      }
                    }}
                    onBlur={() => fetchCNPJData(form.cnpj)}
                  />
                  {cnpjLoading && <div style={infoBlueStyle}>Buscando dados do CNPJ...</div>}
                  {!cnpjLoading && cnpjSuccess && (
                    <div style={infoGreenStyle}>{cnpjSuccess}</div>
                  )}
                  {!cnpjLoading && cnpjError && <div style={infoRedStyle}>{cnpjError}</div>}
                </div>

                <div style={{ ...fieldStyle, alignSelf: "end" }}>
                  <button
                    type="button"
                    style={primaryButtonStyle}
                    onClick={() => fetchCNPJData(form.cnpj)}
                  >
                    Buscar dados
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>CPF</label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
                  />
                </div>

                <div />
              </>
            )}

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Nome fantasia *</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Nome fantasia"
                value={form.tradeName}
                onChange={(e) => updateField("tradeName", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Região</label>
              <select
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                value={form.regionId}
                onChange={(e) => updateField("regionId", e.target.value)}
              >
                <option value="">
                  {regionsLoading ? "Carregando regiões..." : "Selecione"}
                </option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Consultar no Serasa</label>
              <button
                type="button"
                style={{
                  ...inputButtonStyle,
                  background: inputBg,
                  color: theme.primary,
                  border: `1px solid ${theme.border}`,
                }}
              >
                Consultar no Serasa
              </button>
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Código do cadastro</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Código interno"
                value={form.registrationCode}
                onChange={(e) => updateField("registrationCode", e.target.value)}
              />
            </div>
          </div>

          <div style={checkboxRowStyle}>
            <label style={{ ...checkboxLabelStyle, color: theme.text }}>
              <input
                type="checkbox"
                checked={form.roleClient}
                onChange={(e) => updateField("roleClient", e.target.checked)}
              />
              Cliente
            </label>

            <label style={{ ...checkboxLabelStyle, color: theme.text }}>
              <input
                type="checkbox"
                checked={form.roleSupplier}
                onChange={(e) => updateField("roleSupplier", e.target.checked)}
              />
              Fornecedor
            </label>

            <label style={{ ...checkboxLabelStyle, color: theme.text }}>
              <input
                type="checkbox"
                checked={form.roleCarrier}
                onChange={(e) => updateField("roleCarrier", e.target.checked)}
              />
              Transportadora
            </label>

            <label style={{ ...checkboxLabelStyle, color: theme.text }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
              />
              Cliente ativo
            </label>
          </div>
        </Section>

        <Section title="Informações adicionais" theme={theme} defaultOpen={false}>
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, color: theme.subtext }}>Observações</label>
            <textarea
              style={{
                ...textareaStyle,
                background: inputBg,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
              placeholder="Observações gerais sobre o cliente"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </Section>

        <Section title="Contato para cobrança e faturamento" theme={theme}>
          <div style={grid2Style}>
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>E-mail</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="financeiro@cliente.com"
                value={form.billingEmail}
                onChange={(e) => updateField("billingEmail", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Número do WhatsApp</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="(00) 00000-0000"
                value={form.whatsapp}
                onChange={(e) => updateField("whatsapp", formatPhoneBR(e.target.value))}
              />
            </div>
          </div>
        </Section>

        <Section title="Informações fiscais" theme={theme}>
          <div style={grid3Style}>
            <div style={{ ...fieldStyle, gridColumn: "span 2" }}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Razão social</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Razão social"
                value={form.legalName}
                onChange={(e) => updateField("legalName", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>
                Optante pelo Simples?
              </label>
              <div style={radioGroupStyle}>
                <label style={{ ...radioLabelStyle, color: theme.text }}>
                  <input
                    type="radio"
                    checked={form.simpleTaxOption === false}
                    onChange={() => updateField("simpleTaxOption", false)}
                  />
                  Não
                </label>
                <label style={{ ...radioLabelStyle, color: theme.text }}>
                  <input
                    type="radio"
                    checked={form.simpleTaxOption === true}
                    onChange={() => updateField("simpleTaxOption", true)}
                  />
                  Sim
                </label>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Órgão público?</label>
              <div style={radioGroupStyle}>
                <label style={{ ...radioLabelStyle, color: theme.text }}>
                  <input
                    type="radio"
                    checked={form.publicAgency === false}
                    onChange={() => updateField("publicAgency", false)}
                  />
                  Não
                </label>
                <label style={{ ...radioLabelStyle, color: theme.text }}>
                  <input
                    type="radio"
                    checked={form.publicAgency === true}
                    onChange={() => updateField("publicAgency", true)}
                  />
                  Sim
                </label>
              </div>
            </div>
          </div>

          <div
            style={{
              ...helpBoxStyle,
              background: theme.isDark ? "#0f172a" : "#eff6ff",
              border: theme.isDark ? `1px solid ${theme.border}` : "1px solid #dbeafe",
              color: theme.isDark ? "#cbd5e1" : "#1e3a8a",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Precisa de ajuda?</div>
            <div style={{ fontSize: 13 }}>
              Você pode validar e atualizar a inscrição estadual do cliente manualmente
              quando necessário.
            </div>
          </div>

          <div style={grid4Style}>
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>
                Indicador de inscrição estadual
              </label>
              <select
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                value={form.stateRegistrationIndicator}
                onChange={(e) =>
                  updateField(
                    "stateRegistrationIndicator",
                    e.target.value as
                      | "CONTRIBUINTE"
                      | "ISENTO"
                      | "NAO_CONTRIBUINTE"
                  )
                }
              >
                <option value="CONTRIBUINTE">Contribuinte</option>
                <option value="ISENTO">Isento</option>
                <option value="NAO_CONTRIBUINTE">Não contribuinte</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Inscrição estadual</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  opacity: form.stateRegistrationIndicator === "ISENTO" ? 0.6 : 1,
                }}
                placeholder="Inscrição estadual"
                value={form.stateRegistration}
                disabled={form.stateRegistrationIndicator === "ISENTO"}
                onChange={(e) => updateField("stateRegistration", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>
                Inscrição municipal
              </label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Inscrição municipal"
                value={form.municipalRegistration}
                onChange={(e) => updateField("municipalRegistration", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Inscrição SUFRAMA</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Inscrição suframa"
                value={form.suframaRegistration}
                onChange={(e) => updateField("suframaRegistration", e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section title="Endereço" theme={theme}>
          <div style={grid5Style}>
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>País</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="País"
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>CEP</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="00000-000"
                value={form.cep}
                onChange={(e) => updateField("cep", formatCEP(e.target.value))}
              />
            </div>

            <div style={{ ...fieldStyle, alignSelf: "end" }}>
              <button
                type="button"
                onClick={() => fetchCEPData()}
                disabled={cepLoading}
                style={{
                  ...primaryButtonStyle,
                  opacity: cepLoading ? 0.7 : 1,
                  cursor: cepLoading ? "not-allowed" : "pointer",
                }}
              >
                {cepLoading ? "Buscando..." : "Buscar CEP"}
              </button>
              {cepError ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {cepError}
                </div>
              ) : cepSuccess ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#16a34a",
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  {cepSuccess}
                </div>
              ) : null}
            </div>

            <div style={{ ...fieldStyle, gridColumn: "span 2" }}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Endereço</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Rua, avenida, etc."
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Número</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Número"
                value={form.number}
                onChange={(e) => updateField("number", e.target.value)}
              />
            </div>
          </div>

          <div style={grid4Style}>
            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Estado</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="UF"
                maxLength={2}
                value={form.state}
                onChange={(e) =>
                  updateField("state", e.target.value.toUpperCase().slice(0, 2))
                }
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Cidade</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Cidade"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Bairro</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Bairro"
                value={form.district}
                onChange={(e) => updateField("district", e.target.value)}
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: theme.subtext }}>Complemento</label>
              <input
                style={{
                  ...inputStyle,
                  background: inputBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                placeholder="Complemento"
                value={form.complement}
                onChange={(e) => updateField("complement", e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section title="Outros contatos" theme={theme}>
          <div style={{ display: "grid", gap: 14 }}>
            {form.otherContacts.map((contact, index) => (
              <div
                key={index}
                style={{
                  ...contactRowStyle,
                  background: subtleCard,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>
                    Pessoa de contato
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="Nome"
                    value={contact.person}
                    onChange={(e) => updateOtherContact(index, "person", e.target.value)}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>E-mail</label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="email@contato.com"
                    value={contact.email}
                    onChange={(e) => updateOtherContact(index, "email", e.target.value)}
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>
                    Telefone comercial
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="(00) 0000-0000"
                    value={contact.phone}
                    onChange={(e) =>
                      updateOtherContact(index, "phone", formatPhoneBR(e.target.value))
                    }
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>
                    Telefone celular
                  </label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="(00) 00000-0000"
                    value={contact.mobile}
                    onChange={(e) =>
                      updateOtherContact(index, "mobile", formatPhoneBR(e.target.value))
                    }
                  />
                </div>

                <div style={fieldStyle}>
                  <label style={{ ...labelStyle, color: theme.subtext }}>Cargo</label>
                  <input
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                    placeholder="Cargo"
                    value={contact.role}
                    onChange={(e) => updateOtherContact(index, "role", e.target.value)}
                  />
                </div>

                <div style={{ ...fieldStyle, alignSelf: "end" }}>
                  <button
                    type="button"
                    style={{
                      ...dangerGhostButtonStyle,
                      background: theme.isDark ? "rgba(127,29,29,0.18)" : "#fff1f2",
                      border: theme.isDark
                        ? "1px solid rgba(248,113,113,0.3)"
                        : "1px solid #fecaca",
                      color: theme.isDark ? "#fca5a5" : "#dc2626",
                    }}
                    onClick={() => removeOtherContact(index)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}

            <div>
              <button
                type="button"
                style={{
                  ...secondaryButtonStyle,
                  background: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
                onClick={addOtherContact}
              >
                + Adicionar contato
              </button>
            </div>
          </div>
        </Section>

        {pageError && (
          <div
            style={{
              ...errorBoxStyle,
              background: theme.isDark ? "rgba(127, 29, 29, 0.25)" : "#fef2f2",
              border: theme.isDark
                ? "1px solid rgba(248, 113, 113, 0.35)"
                : "1px solid #fecaca",
              color: theme.isDark ? "#fecaca" : "#b91c1c",
            }}
          >
            {pageError}
          </div>
        )}

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={() =>
              router.push(isRepresentativeFlow ? `/rep/clients/${id}` : `/clients/${id}`)
            }
            style={{
              ...secondaryButtonStyle,
              background: theme.cardBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="submit"
            style={{
              ...primaryButtonStyle,
              opacity: !canSubmit || saving ? 0.7 : 1,
              cursor: !canSubmit || saving ? "not-allowed" : "pointer",
            }}
            disabled={!canSubmit || saving}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  padding: "0 10px",
  outline: "none",
  fontSize: 14,
};

const inputButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 10px",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: 8,
  padding: 12,
  outline: "none",
  fontSize: 14,
  resize: "vertical",
};

const grid2Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const grid3Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  gap: 14,
};

const grid4Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const grid5Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 140px 2fr 1fr",
  gap: 14,
  marginBottom: 14,
};

const checkboxRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 22,
  marginTop: 16,
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};

const radioGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: 18,
  minHeight: 40,
  alignItems: "center",
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};

const helpBoxStyle: React.CSSProperties = {
  margin: "18px 0",
  borderRadius: 10,
  padding: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  height: 40,
};

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: "10px 16px",
  fontWeight: 600,
  height: 40,
  cursor: "pointer",
};

const dangerGhostButtonStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  fontWeight: 700,
  padding: "0 14px",
  cursor: "pointer",
};

const contactRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 110px",
  gap: 12,
  alignItems: "start",
  padding: 14,
  borderRadius: 12,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 12,
  marginTop: 8,
};

const infoBlueStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#2563eb",
};

const infoGreenStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#16a34a",
};

const infoRedStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#dc2626",
};

const errorBoxStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: 12,
  fontSize: 14,
};