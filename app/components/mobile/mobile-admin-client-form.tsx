"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";

type AccessMode = "admin" | "representative";

type MobileClientFormProps = {
  access?: AccessMode;
  listHref?: string;
  loginRedirect?: string;
  unauthorizedHref?: string;
};

type RegionItem = {
  id: string;
  name: string;
  stockLocationId?: string | null;
  stockLocationName?: string | null;
};

type AuthResponse = {
  user?: {
    id: string;
    role: string;
    regionId?: string | null;
    region?: {
      id: string;
      name: string;
      stockLocation?: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
};

type ClientCreateResponse = {
  id?: string;
  name?: string;
  code?: string | null;
  portalUsername?: string | null;
  portalInitialPassword?: string | null;
  error?: string;
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
  name: string;
  roleClient: boolean;
  roleSupplier: boolean;
  roleCarrier: boolean;
  registrationCode: string;
  billingEmail: string;
  phone: string;
  whatsapp: string;
  simpleTaxOption: boolean;
  publicAgency: boolean;
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
};

type CnpjResponse = {
  error?: string;
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  email?: string;
  telefone?: string;
};

type CepResponse = {
  error?: string;
  cep?: string | null;
  street?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
};

const PERSON_TYPES = [
  { value: "JURIDICA", label: "Pessoa juridica" },
  { value: "FISICA", label: "Pessoa fisica" },
] as const;

function createInitialForm(regionId = ""): ClientForm {
  return {
    personType: "JURIDICA",
    cnpj: "",
    cpf: "",
    tradeName: "",
    legalName: "",
    name: "",
    roleClient: true,
    roleSupplier: false,
    roleCarrier: false,
    registrationCode: "",
    billingEmail: "",
    phone: "",
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
    regionId,
    notes: "",
    otherContacts: [createEmptyContact()],
  };
}

function createEmptyContact(): OtherContact {
  return {
    person: "",
    email: "",
    phone: "",
    mobile: "",
    role: "",
  };
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCNPJ(value: string) {
  const v = digitsOnly(value).slice(0, 14);
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
  const v = digitsOnly(value).slice(0, 11);
  if (!v) return "";
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.replace(/^(\d{3})(\d+)/, "$1.$2");
  if (v.length <= 9) return v.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  return v.replace(/^(\d{3})(\d{3})(\d{3})(\d+)/, "$1.$2.$3-$4");
}

function formatCEP(value: string) {
  const v = digitsOnly(value).slice(0, 8);
  if (v.length <= 5) return v;
  return v.replace(/^(\d{5})(\d+)/, "$1-$2");
}

function formatPhoneBR(value: string) {
  const v = digitsOnly(value).slice(0, 11);
  if (!v) return "";
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return v.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (v.length <= 10) return v.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return v.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

function isValidCNPJ(cnpj: string) {
  cnpj = digitsOnly(cnpj);

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

  length += 1;
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

function hasContactValue(contact: OtherContact) {
  return (
    contact.person.trim() ||
    contact.email.trim() ||
    contact.phone.trim() ||
    contact.mobile.trim() ||
    contact.role.trim()
  );
}

export default function MobileAdminClientForm({
  access = "admin",
  listHref,
  loginRedirect,
  unauthorizedHref,
}: MobileClientFormProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const isRepresentativeAccess = access === "representative";
  const expectedRole = isRepresentativeAccess ? "REPRESENTATIVE" : "ADMIN";
  const resolvedListHref =
    listHref ?? (isRepresentativeAccess ? "/m/rep/clients" : "/m/admin/clients");
  const resolvedLoginRedirect =
    loginRedirect ??
    (isRepresentativeAccess ? "/m/rep/clients/new" : "/m/admin/clients/new");
  const resolvedUnauthorizedHref =
    unauthorizedHref ?? (isRepresentativeAccess ? "/m/rep" : "/m/admin");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedClient, setSavedClient] = useState<ClientCreateResponse | null>(null);
  const [form, setForm] = useState<ClientForm>(() => createInitialForm());

  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjFeedback, setCnpjFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastFetchedCnpj, setLastFetchedCnpj] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastFetchedCep, setLastFetchedCep] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBase() {
      try {
        setLoading(true);
        setError(null);

        const [authRes, regionsRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
        ]);

        const authJson = (await authRes.json().catch(() => null)) as
          | AuthResponse
          | null;
        const regionsJson = await regionsRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(resolvedLoginRedirect)}`);
          return;
        }

        if (authJson?.user?.role !== expectedRole) {
          router.push(resolvedUnauthorizedHref);
          return;
        }

        const nextRegions: RegionItem[] = Array.isArray(regionsJson?.items)
          ? regionsJson.items
          : [];

        if (!regionsRes.ok && !isRepresentativeAccess) {
          throw new Error("Nao foi possivel carregar as regioes.");
        }

        const userRegionId = authJson.user.regionId ?? "";
        const initialRegionId = isRepresentativeAccess
          ? userRegionId
          : userRegionId || nextRegions[0]?.id || "";

        if (isRepresentativeAccess && !initialRegionId) {
          throw new Error("Seu usuario nao possui regiao vinculada.");
        }

        if (!active) return;

        setRegions(nextRegions);
        setForm((prev) => ({
          ...prev,
          regionId: initialRegionId,
        }));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar dados do cadastro."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBase();

    return () => {
      active = false;
    };
  }, [
    expectedRole,
    isRepresentativeAccess,
    resolvedLoginRedirect,
    resolvedUnauthorizedHref,
    router,
  ]);

  const selectedRegion = useMemo(() => {
    return regions.find((item) => item.id === form.regionId) ?? null;
  }, [regions, form.regionId]);

  const inputStyle: CSSProperties = {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const textareaStyle: CSSProperties = {
    width: "100%",
    minHeight: 108,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: 14,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
  };

  const labelStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: colors.subtext,
  };

  const fieldStyle: CSSProperties = {
    display: "grid",
    gap: 7,
    minWidth: 0,
  };

  const twoColumnStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  };

  function updateField<K extends keyof ClientForm>(field: K, value: ClientForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateContact(
    index: number,
    field: keyof OtherContact,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      otherContacts: prev.otherContacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact
      ),
    }));
  }

  function addContact() {
    setForm((prev) => ({
      ...prev,
      otherContacts: [...prev.otherContacts, createEmptyContact()],
    }));
  }

  function removeContact(index: number) {
    setForm((prev) => ({
      ...prev,
      otherContacts:
        prev.otherContacts.length === 1
          ? prev.otherContacts
          : prev.otherContacts.filter((_, contactIndex) => contactIndex !== index),
    }));
  }

  async function fetchCNPJData(rawValue?: string) {
    const cnpj = digitsOnly(rawValue ?? form.cnpj);

    if (form.personType !== "JURIDICA") return;
    if (cnpj.length !== 14) {
      setCnpjFeedback({ type: "error", text: "Informe um CNPJ com 14 digitos." });
      return;
    }

    if (!isValidCNPJ(cnpj)) {
      setCnpjFeedback({ type: "error", text: "CNPJ invalido." });
      return;
    }

    if (cnpjLoading || cnpj === lastFetchedCnpj) return;

    try {
      setCnpjLoading(true);
      setCnpjFeedback(null);

      const response = await fetch(`/api/cnpj/${cnpj}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as
        | CnpjResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel consultar o CNPJ.");
      }

      setForm((prev) => ({
        ...prev,
        cnpj: formatCNPJ(data?.cnpj || cnpj),
        legalName: prev.legalName || data?.razaoSocial || "",
        tradeName: prev.tradeName || data?.nomeFantasia || "",
        name: prev.name || data?.nomeFantasia || data?.razaoSocial || "",
        billingEmail: prev.billingEmail || data?.email || "",
        whatsapp: prev.whatsapp
          ? prev.whatsapp
          : data?.telefone
            ? formatPhoneBR(data.telefone)
            : "",
        cep: prev.cep ? prev.cep : data?.cep ? formatCEP(data.cep) : "",
        street: prev.street || data?.logradouro || "",
        number: prev.number || data?.numero || "",
        complement: prev.complement || data?.complemento || "",
        district: prev.district || data?.bairro || "",
        city: prev.city || data?.municipio || "",
        state: prev.state || data?.uf?.toUpperCase() || "",
      }));

      setLastFetchedCnpj(cnpj);
      setCnpjFeedback({
        type: "success",
        text: "Dados preenchidos automaticamente pelo CNPJ.",
      });
    } catch (err) {
      setCnpjFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Nao foi possivel consultar o CNPJ.",
      });
    } finally {
      setCnpjLoading(false);
    }
  }

  useEffect(() => {
    const cnpj = digitsOnly(form.cnpj);

    if (form.personType !== "JURIDICA") return;
    if (cnpj.length !== 14) return;
    if (!isValidCNPJ(cnpj)) return;
    if (cnpj === lastFetchedCnpj) return;

    const timer = setTimeout(() => {
      fetchCNPJData(cnpj);
    }, 700);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cnpj, form.personType, lastFetchedCnpj]);

  async function fetchCEPData(rawValue?: string) {
    const cep = digitsOnly(rawValue ?? form.cep);

    if (cep.length !== 8) {
      setCepFeedback({ type: "error", text: "Informe um CEP com 8 digitos." });
      return;
    }

    if (cepLoading || cep === lastFetchedCep) return;

    try {
      setCepLoading(true);
      setCepFeedback(null);

      const response = await fetch(`/api/cep/${cep}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as CepResponse | null;

      if (!response.ok) {
        throw new Error(data?.error || "Nao foi possivel consultar o CEP.");
      }

      setForm((prev) => ({
        ...prev,
        cep: data?.cep ? formatCEP(data.cep) : prev.cep,
        street: prev.street || data?.street || "",
        district: prev.district || data?.district || "",
        city: prev.city || data?.city || "",
        state: prev.state || data?.state?.toUpperCase() || "",
        complement: prev.complement || data?.complement || "",
      }));

      setLastFetchedCep(cep);
      setCepFeedback({ type: "success", text: "Endereco preenchido pelo CEP." });
    } catch (err) {
      setCepFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao consultar CEP.",
      });
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    const cep = digitsOnly(form.cep);

    if (cep.length !== 8) return;
    if (cep === lastFetchedCep) return;

    const timer = setTimeout(() => {
      fetchCEPData(cep);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cep, lastFetchedCep]);

  const finalName = useMemo(() => {
    return (
      form.name.trim() ||
      (form.personType === "JURIDICA"
        ? form.legalName.trim() || form.tradeName.trim()
        : form.tradeName.trim() || form.legalName.trim())
    );
  }, [form.legalName, form.name, form.personType, form.tradeName]);

  const canSubmit = useMemo(() => {
    if (!finalName) return false;
    if (!form.regionId) return false;
    if (form.personType === "FISICA" && digitsOnly(form.cpf).length !== 11) {
      return false;
    }
    return true;
  }, [finalName, form.cpf, form.personType, form.regionId]);

  function resetForm() {
    setSavedClient(null);
    setError(null);
    setCnpjFeedback(null);
    setCepFeedback(null);
    setLastFetchedCnpj("");
    setLastFetchedCep("");
    setForm(createInitialForm(form.regionId));
  }

  async function handleSave() {
    try {
      setError(null);

      if (!finalName) {
        setError("Informe o nome principal do cliente.");
        return;
      }

      if (!form.regionId) {
        setError("Selecione a regiao.");
        return;
      }

      if (
        form.personType === "JURIDICA" &&
        digitsOnly(form.cnpj) &&
        !isValidCNPJ(form.cnpj)
      ) {
        setError("Informe um CNPJ valido ou deixe o campo em branco.");
        return;
      }

      if (form.personType === "FISICA" && digitsOnly(form.cpf).length !== 11) {
        setError("Para pessoa fisica, informe um CPF valido com 11 digitos.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personType: form.personType,
          name: finalName,
          tradeName: form.tradeName.trim() || null,
          legalName: form.legalName.trim() || null,
          cpf: form.personType === "FISICA" ? digitsOnly(form.cpf) || null : null,
          cnpj:
            form.personType === "JURIDICA" ? digitsOnly(form.cnpj) || null : null,
          regionId: form.regionId || null,
          roleClient: form.roleClient,
          roleSupplier: form.roleSupplier,
          roleCarrier: form.roleCarrier,
          registrationCode: form.registrationCode.trim() || null,
          billingEmail: form.billingEmail.trim() || null,
          phone: digitsOnly(form.phone) || null,
          whatsapp: digitsOnly(form.whatsapp) || null,
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
          cep: digitsOnly(form.cep) || null,
          street: form.street.trim() || null,
          number: form.number.trim() || null,
          district: form.district.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
          complement: form.complement.trim() || null,
          notes: form.notes.trim() || null,
          otherContacts: form.otherContacts
            .filter(hasContactValue)
            .map((contact) => ({
              person: contact.person.trim() || null,
              email: contact.email.trim().toLowerCase() || null,
              phone: digitsOnly(contact.phone) || null,
              mobile: digitsOnly(contact.mobile) || null,
              role: contact.role.trim() || null,
            })),
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | ClientCreateResponse
        | null;

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar cliente.");
      }

      setSavedClient(json);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  function renderFeedback(
    feedback: { type: "success" | "error"; text: string } | null
  ) {
    if (!feedback) return null;

    return (
      <div
        style={{
          fontSize: 12,
          color: feedback.type === "error" ? "#dc2626" : "#16a34a",
          fontWeight: 800,
        }}
      >
        {feedback.text}
      </div>
    );
  }

  function renderToggleButton(
    active: boolean,
    label: string,
    onClick: () => void
  ) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          minHeight: 44,
          borderRadius: 14,
          border: `1px solid ${active ? colors.primary : colors.border}`,
          background: active
            ? colors.isDark
              ? "#111f39"
              : "#e8f0ff"
            : colors.cardBg,
          color: active ? colors.primary : colors.text,
          fontSize: 13,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }

  if (loading) {
    return (
      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 900 }}>Carregando cadastro...</div>
      </MobileCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error ? (
        <MobileCard style={{ borderColor: "#ef4444" }}>
          <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 900 }}>
            {error}
          </div>
        </MobileCard>
      ) : null}

      {savedClient ? (
        <MobileCard
          style={{
            background: colors.isDark
              ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
              : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <CheckCircle2 size={22} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              Cliente salvo com sucesso
            </div>
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            <strong>{savedClient.name || "Cliente"}</strong>
            {savedClient.code ? ` - codigo ${savedClient.code}` : ""}
          </div>

          {savedClient.portalUsername || savedClient.portalInitialPassword ? (
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                background: colors.cardBg,
                border: `1px solid ${colors.border}`,
                padding: 14,
                display: "grid",
                gap: 6,
                fontSize: 13,
              }}
            >
              <div>
                <strong>Usuario portal:</strong>{" "}
                {savedClient.portalUsername || "-"}
              </div>
              <div>
                <strong>Senha inicial:</strong>{" "}
                {savedClient.portalInitialPassword || "-"}
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 10,
            }}
          >
            <Link href={resolvedListHref}>
              <div
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  background: colors.cardBg,
                  color: colors.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Ver clientes
              </div>
            </Link>

            <button
              type="button"
              onClick={resetForm}
              style={{
                minHeight: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.text,
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Novo cadastro
            </button>
          </div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <MobileSectionTitle title="Tipo e regiao" />

        <div style={{ display: "grid", gap: 12 }}>
          <div style={twoColumnStyle}>
            {PERSON_TYPES.map((item) =>
              renderToggleButton(form.personType === item.value, item.label, () => {
                updateField("personType", item.value);
                setCnpjFeedback(null);
              })
            )}
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              {isRepresentativeAccess ? "Regiao do vendedor" : "Regiao"}
            </span>
            <select
              value={form.regionId}
              disabled={isRepresentativeAccess}
              onChange={(event) => updateField("regionId", event.target.value)}
              style={{
                ...inputStyle,
                opacity: isRepresentativeAccess ? 0.75 : 1,
              }}
            >
              <option value="">
                {isRepresentativeAccess ? "Regiao vinculada" : "Selecione a regiao"}
              </option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                  {region.stockLocationName ? ` - ${region.stockLocationName}` : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedRegion ? (
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.isDark ? "#0f172a" : "#f8fafc",
                padding: 14,
                display: "grid",
                gap: 7,
                fontSize: 12,
                color: colors.subtext,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} />
                Regiao: {selectedRegion.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={14} />
                Estoque: {selectedRegion.stockLocationName || "Nao vinculado"}
              </div>
            </div>
          ) : null}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Identificacao" />

        <div style={{ display: "grid", gap: 12 }}>
          {form.personType === "JURIDICA" ? (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 46px", gap: 10 }}>
              <label style={fieldStyle}>
                <span style={labelStyle}>CNPJ</span>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(event) => {
                    updateField("cnpj", formatCNPJ(event.target.value));
                    setLastFetchedCnpj("");
                    setCnpjFeedback(null);
                  }}
                  onBlur={() => fetchCNPJData(form.cnpj)}
                  placeholder="00.000.000/0000-00"
                  style={inputStyle}
                />
              </label>

              <button
                type="button"
                onClick={() => fetchCNPJData(form.cnpj)}
                disabled={cnpjLoading}
                aria-label="Buscar CNPJ"
                title="Buscar CNPJ"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  border: "none",
                  alignSelf: "end",
                  background: colors.primary,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: cnpjLoading ? "not-allowed" : "pointer",
                  opacity: cnpjLoading ? 0.75 : 1,
                }}
              >
                <Search size={17} />
              </button>
            </div>
          ) : (
            <label style={fieldStyle}>
              <span style={labelStyle}>CPF *</span>
              <input
                type="text"
                value={form.cpf}
                onChange={(event) => updateField("cpf", formatCPF(event.target.value))}
                placeholder="000.000.000-00"
                style={inputStyle}
              />
            </label>
          )}

          {cnpjLoading ? (
            <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 800 }}>
              Buscando dados do CNPJ...
            </div>
          ) : (
            renderFeedback(cnpjFeedback)
          )}

          <label style={fieldStyle}>
            <span style={labelStyle}>Nome principal *</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Nome usado nas listas"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Nome fantasia</span>
            <input
              type="text"
              value={form.tradeName}
              onChange={(event) => updateField("tradeName", event.target.value)}
              placeholder="Nome fantasia"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              {form.personType === "JURIDICA" ? "Razao social" : "Nome civil"}
            </span>
            <input
              type="text"
              value={form.legalName}
              onChange={(event) => updateField("legalName", event.target.value)}
              placeholder={
                form.personType === "JURIDICA" ? "Razao social" : "Nome civil"
              }
              style={inputStyle}
            />
          </label>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Papeis e codigo" />

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
            {renderToggleButton(form.roleClient, "Cliente", () =>
              updateField("roleClient", !form.roleClient)
            )}
            {renderToggleButton(form.roleSupplier, "Fornecedor", () =>
              updateField("roleSupplier", !form.roleSupplier)
            )}
            {renderToggleButton(form.roleCarrier, "Transp.", () =>
              updateField("roleCarrier", !form.roleCarrier)
            )}
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>Codigo interno</span>
            <input
              type="text"
              value={form.registrationCode}
              onChange={(event) =>
                updateField("registrationCode", event.target.value)
              }
              placeholder="Codigo interno"
              style={inputStyle}
            />
          </label>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Contato" />

        <div style={{ display: "grid", gap: 12 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>E-mail de cobranca</span>
            <input
              type="email"
              value={form.billingEmail}
              onChange={(event) => updateField("billingEmail", event.target.value)}
              placeholder="email@cliente.com"
              style={inputStyle}
            />
          </label>

          <div style={twoColumnStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Telefone</span>
              <input
                type="text"
                value={form.phone}
                onChange={(event) =>
                  updateField("phone", formatPhoneBR(event.target.value))
                }
                placeholder="(00) 0000-0000"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>WhatsApp</span>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(event) =>
                  updateField("whatsapp", formatPhoneBR(event.target.value))
                }
                placeholder="(00) 00000-0000"
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Fiscal" />

        <div style={{ display: "grid", gap: 12 }}>
          <div style={twoColumnStyle}>
            <div style={fieldStyle}>
              <span style={labelStyle}>Optante simples</span>
              <div style={twoColumnStyle}>
                {renderToggleButton(!form.simpleTaxOption, "Nao", () =>
                  updateField("simpleTaxOption", false)
                )}
                {renderToggleButton(form.simpleTaxOption, "Sim", () =>
                  updateField("simpleTaxOption", true)
                )}
              </div>
            </div>

            <div style={fieldStyle}>
              <span style={labelStyle}>Orgao publico</span>
              <div style={twoColumnStyle}>
                {renderToggleButton(!form.publicAgency, "Nao", () =>
                  updateField("publicAgency", false)
                )}
                {renderToggleButton(form.publicAgency, "Sim", () =>
                  updateField("publicAgency", true)
                )}
              </div>
            </div>
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>Indicador de inscricao estadual</span>
            <select
              value={form.stateRegistrationIndicator}
              onChange={(event) =>
                updateField(
                  "stateRegistrationIndicator",
                  event.target.value as ClientForm["stateRegistrationIndicator"]
                )
              }
              style={inputStyle}
            >
              <option value="CONTRIBUINTE">Contribuinte</option>
              <option value="ISENTO">Isento</option>
              <option value="NAO_CONTRIBUINTE">Nao contribuinte</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Inscricao estadual</span>
            <input
              type="text"
              value={form.stateRegistration}
              disabled={form.stateRegistrationIndicator === "ISENTO"}
              onChange={(event) =>
                updateField("stateRegistration", event.target.value)
              }
              placeholder="Inscricao estadual"
              style={{
                ...inputStyle,
                opacity: form.stateRegistrationIndicator === "ISENTO" ? 0.55 : 1,
              }}
            />
          </label>

          <div style={twoColumnStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Inscricao municipal</span>
              <input
                type="text"
                value={form.municipalRegistration}
                onChange={(event) =>
                  updateField("municipalRegistration", event.target.value)
                }
                placeholder="Municipal"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>SUFRAMA</span>
              <input
                type="text"
                value={form.suframaRegistration}
                onChange={(event) =>
                  updateField("suframaRegistration", event.target.value)
                }
                placeholder="SUFRAMA"
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Endereco" />

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 46px", gap: 10 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>CEP</span>
              <input
                type="text"
                value={form.cep}
                onChange={(event) => {
                  updateField("cep", formatCEP(event.target.value));
                  setLastFetchedCep("");
                  setCepFeedback(null);
                }}
                placeholder="00000-000"
                style={inputStyle}
              />
            </label>

            <button
              type="button"
              onClick={() => fetchCEPData(form.cep)}
              disabled={cepLoading}
              aria-label="Buscar CEP"
              title="Buscar CEP"
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                border: "none",
                alignSelf: "end",
                background: colors.primary,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: cepLoading ? "not-allowed" : "pointer",
                opacity: cepLoading ? 0.75 : 1,
              }}
            >
              <Search size={17} />
            </button>
          </div>

          {cepLoading ? (
            <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 800 }}>
              Buscando endereco pelo CEP...
            </div>
          ) : (
            renderFeedback(cepFeedback)
          )}

          <label style={fieldStyle}>
            <span style={labelStyle}>Pais</span>
            <input
              type="text"
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              placeholder="Brasil"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Endereco</span>
            <input
              type="text"
              value={form.street}
              onChange={(event) => updateField("street", event.target.value)}
              placeholder="Rua, avenida, etc."
              style={inputStyle}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", gap: 10 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Numero</span>
              <input
                type="text"
                value={form.number}
                onChange={(event) => updateField("number", event.target.value)}
                placeholder="N."
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Bairro</span>
              <input
                type="text"
                value={form.district}
                onChange={(event) => updateField("district", event.target.value)}
                placeholder="Bairro"
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 86px", gap: 10 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Cidade</span>
              <input
                type="text"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="Cidade"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>UF</span>
              <input
                type="text"
                value={form.state}
                onChange={(event) =>
                  updateField("state", event.target.value.toUpperCase().slice(0, 2))
                }
                placeholder="UF"
                maxLength={2}
                style={{
                  ...inputStyle,
                  textTransform: "uppercase",
                }}
              />
            </label>
          </div>

          <label style={fieldStyle}>
            <span style={labelStyle}>Complemento</span>
            <input
              type="text"
              value={form.complement}
              onChange={(event) => updateField("complement", event.target.value)}
              placeholder="Complemento"
              style={inputStyle}
            />
          </label>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle
          title="Outros contatos"
          action={
            <button
              type="button"
              onClick={addContact}
              aria-label="Adicionar contato"
              title="Adicionar contato"
              style={{
                width: 38,
                height: 38,
                borderRadius: 13,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Plus size={17} />
            </button>
          }
        />

        <div style={{ display: "grid", gap: 14 }}>
          {form.otherContacts.map((contact, index) => (
            <div
              key={index}
              style={{
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.isDark ? "#0f172a" : "#f8fafc",
                padding: 14,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: colors.text }}>
                  Contato {index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removeContact(index)}
                  disabled={form.otherContacts.length === 1}
                  aria-label="Remover contato"
                  title="Remover contato"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    color:
                      form.otherContacts.length === 1 ? colors.subtext : "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:
                      form.otherContacts.length === 1 ? "not-allowed" : "pointer",
                    opacity: form.otherContacts.length === 1 ? 0.55 : 1,
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <label style={fieldStyle}>
                <span style={labelStyle}>Pessoa de contato</span>
                <input
                  type="text"
                  value={contact.person}
                  onChange={(event) =>
                    updateContact(index, "person", event.target.value)
                  }
                  placeholder="Nome"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                <span style={labelStyle}>E-mail</span>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(event) =>
                    updateContact(index, "email", event.target.value)
                  }
                  placeholder="email@contato.com"
                  style={inputStyle}
                />
              </label>

              <div style={twoColumnStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Telefone</span>
                  <input
                    type="text"
                    value={contact.phone}
                    onChange={(event) =>
                      updateContact(index, "phone", formatPhoneBR(event.target.value))
                    }
                    placeholder="Comercial"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Celular</span>
                  <input
                    type="text"
                    value={contact.mobile}
                    onChange={(event) =>
                      updateContact(
                        index,
                        "mobile",
                        formatPhoneBR(event.target.value)
                      )
                    }
                    placeholder="Celular"
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={fieldStyle}>
                <span style={labelStyle}>Cargo</span>
                <input
                  type="text"
                  value={contact.role}
                  onChange={(event) =>
                    updateContact(index, "role", event.target.value)
                  }
                  placeholder="Cargo"
                  style={inputStyle}
                />
              </label>
            </div>
          ))}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Observacoes" />

        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Observacoes do cliente"
          rows={4}
          style={textareaStyle}
        />
      </MobileCard>

      <MobileCard>
        <div style={twoColumnStyle}>
          <Link href={resolvedListHref}>
            <div
              style={{
                minHeight: 48,
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              <ChevronLeft size={16} />
              Voltar
            </div>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSubmit}
            style={{
              minHeight: 48,
              borderRadius: 16,
              border: "none",
              background: colors.primary,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 900,
              cursor: saving || !canSubmit ? "not-allowed" : "pointer",
              opacity: saving || !canSubmit ? 0.75 : 1,
            }}
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>
      </MobileCard>
    </div>
  );
}
