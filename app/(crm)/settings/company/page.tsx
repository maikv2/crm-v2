"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type CompanyProfile = {
  id?: string;
  tradeName: string;
  legalName: string;
  cnpj: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  logoUrl: string;
  primaryColor: string;
  notes: string;
  stateRegistration?: string;
  taxRegime?: string;
  nfeSeries?: string;
  nfeNextNumber?: number;
  nfeEnvironment?: string;
  nfeToken?: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCNPJ(value: string) {
  const v = onlyDigits(value).slice(0, 14);
  if (!v) return "";
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.replace(/^(\d{2})(\d+)/, "$1.$2");
  if (v.length <= 8) return v.replace(/^(\d{2})(\d{3})(\d+)/, "$1.$2.$3");
  if (v.length <= 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d+)/, "$1.$2.$3/$4");
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d+)/, "$1.$2.$3/$4-$5");
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

export default function CompanySettingsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [form, setForm] = useState<CompanyProfile>({
    tradeName: "",
    legalName: "",
    cnpj: "",
    phone: "",
    email: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Brasil",
    logoUrl: "",
    primaryColor: "#2563eb",
    notes: "",
    stateRegistration: "",
    taxRegime: "",
    nfeSeries: "1",
    nfeNextNumber: 1,
    nfeEnvironment: "homologation",
    nfeToken: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setPageError(null);

        const res = await fetch("/api/settings/company", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Não foi possível carregar os dados da empresa.");
        }

        if (active && json?.item) {
          setForm({
            id: json.item.id,
            tradeName: json.item.tradeName || "",
            legalName: json.item.legalName || "",
            cnpj: json.item.cnpj ? formatCNPJ(json.item.cnpj) : "",
            phone: json.item.phone ? formatPhoneBR(json.item.phone) : "",
            email: json.item.email || "",
            street: json.item.street || "",
            number: json.item.number || "",
            district: json.item.district || "",
            city: json.item.city || "",
            state: json.item.state || "",
            zipCode: json.item.zipCode ? formatCEP(json.item.zipCode) : "",
            country: json.item.country || "Brasil",
            logoUrl: json.item.logoUrl || "",
            primaryColor: json.item.primaryColor || "#2563eb",
            notes: json.item.notes || "",
            stateRegistration: json.item.stateRegistration || "",
            taxRegime: json.item.taxRegime || "",
            nfeSeries: json.item.nfeSeries || "1",
            nfeNextNumber: json.item.nfeNextNumber || 1,
            nfeEnvironment: json.item.nfeEnvironment || "homologation",
            nfeToken: json.item.nfeToken || "",
          });
        }
      } catch (err: any) {
        if (active) {
          setPageError(err?.message || "Não foi possível carregar os dados da empresa.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof CompanyProfile>(field: K, value: CompanyProfile[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setPageError(null);
      setPageSuccess(null);

      const payload = {
        tradeName: form.tradeName.trim(),
        legalName: form.legalName.trim() || null,
        cnpj: onlyDigits(form.cnpj) || null,
        phone: onlyDigits(form.phone) || null,
        email: form.email.trim().toLowerCase() || null,
        street: form.street.trim() || null,
        number: form.number.trim() || null,
        district: form.district.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        zipCode: onlyDigits(form.zipCode) || null,
        country: form.country.trim() || "Brasil",
        logoUrl: form.logoUrl.trim() || null,
        primaryColor: form.primaryColor.trim() || null,
        notes: form.notes.trim() || null,
        stateRegistration: onlyDigits(form.stateRegistration || "") || null,
        taxRegime: form.taxRegime || null,
        nfeSeries: form.nfeSeries || "1",
        nfeNextNumber: Number(form.nfeNextNumber) || 1,
        nfeEnvironment: form.nfeEnvironment || "homologation",
        nfeToken: form.nfeToken || null,
      };

      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível salvar os dados da empresa.");
      }

      setPageSuccess("Dados da empresa salvos com sucesso.");
    } catch (err: any) {
      setPageError(err?.message || "Não foi possível salvar os dados da empresa.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100%",
          padding: 28,
          background: theme.pageBg,
          color: theme.text,
        }}
      >
        Carregando dados da empresa...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100%",
        padding: 28,
        background: theme.pageBg,
        color: theme.text,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
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
            ⚙️ / Configurações / Empresa
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Dados da empresa
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            Informações institucionais usadas pelo CRM V2.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/settings")}
          style={secondaryButtonStyle(theme)}
        >
          Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <section style={sectionStyle(theme)}>
          <div style={grid2Style}>
            <Field label="Nome fantasia *" theme={theme}>
              <input
                style={{ ...inputStyle(theme, inputBg), height: 40 }}
                value={form.tradeName}
                onChange={(e) => updateField("tradeName", e.target.value)}
                placeholder="MP Comércio"
              />
            </Field>

            <Field label="Razão social" theme={theme}>
              <input
                style={{ ...inputStyle(theme, inputBg), height: 40 }}
                value={form.legalName}
                onChange={(e) => updateField("legalName", e.target.value)}
                placeholder="MP Comércio e Serviços LTDA"
              />
            </Field>

            <Field label="CNPJ" theme={theme}>
              <input
                style={{ ...inputStyle(theme, inputBg), height: 40 }}
                value={form.cnpj}
                onChange={(e) => updateField("cnpj", formatCNPJ(e.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </Field>

            <Field label="Telefone" theme={theme}>
              <input
                style={{ ...inputStyle(theme, inputBg), height: 40 }}
                value={form.phone}
                onChange={(e) => updateField("phone", formatPhoneBR(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </Field>

            <Field label="E-mail" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="contato@empresa.com"
              />
            </Field>

            <Field label="Logo URL" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.logoUrl}
                onChange={(e) => updateField("logoUrl", e.target.value)}
                placeholder="https://..."
              />
            </Field>
          </div>
        </section>

        <section style={sectionStyle(theme)}>
          <div style={grid3Style}>
            <Field label="CEP" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.zipCode}
                onChange={(e) => updateField("zipCode", formatCEP(e.target.value))}
                placeholder="00000-000"
              />
            </Field>

            <Field label="Estado" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.state}
                maxLength={2}
                onChange={(e) => updateField("state", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SC"
              />
            </Field>

            <Field label="Cidade" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Cordilheira Alta"
              />
            </Field>
          </div>

          <div style={grid4Style}>
            <Field label="Endereço" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
                placeholder="Rua..."
              />
            </Field>

            <Field label="Número" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.number}
                onChange={(e) => updateField("number", e.target.value)}
                placeholder="123"
              />
            </Field>

            <Field label="Bairro" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.district}
                onChange={(e) => updateField("district", e.target.value)}
                placeholder="Centro"
              />
            </Field>

            <Field label="País" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="Brasil"
              />
            </Field>
          </div>
        </section>

        <section style={sectionStyle(theme)}>
          <div style={grid2Style}>
            <Field label="Cor principal" theme={theme}>
              <input
                style={inputStyle(theme, inputBg)}
                value={form.primaryColor}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                placeholder="#2563eb"
              />
            </Field>

            <div />
          </div>

          <Field label="Observações" theme={theme}>
            <textarea
              style={textareaStyle(theme, inputBg)}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observações internas, dados institucionais, instruções..."
            />
          </Field>
        </section>

        <section style={sectionStyle(theme)}>
  <h3 style={{ margin: 0 }}>Dados fiscais / NF-e</h3>

  <div style={grid3Style}>
    <Field label="Inscrição Estadual" theme={theme}>
      <input
        style={{ ...inputStyle(theme, inputBg), height: 40 }}
        value={form.stateRegistration || ""}
        onChange={(e) => updateField("stateRegistration", onlyDigits(e.target.value))}
        placeholder="Somente números"
      />
    </Field>

    <Field label="Regime tributário" theme={theme}>
      <select
        style={{ ...inputStyle(theme, inputBg), height: 40 }}
        value={form.taxRegime || ""}
        onChange={(e) => updateField("taxRegime", e.target.value)}
      >
        <option value="">Selecione</option>
        <option value="1">Simples Nacional</option>
        <option value="2">Simples Excesso Sublimite</option>
        <option value="3">Regime Normal</option>
      </select>
    </Field>

    <Field label="Ambiente" theme={theme}>
      <select
         style={{ ...inputStyle(theme, inputBg), height: 40 }}
        value={form.nfeEnvironment || "homologation"}
        onChange={(e) => updateField("nfeEnvironment", e.target.value)}
      >
        <option value="homologation">Homologação</option>
        <option value="production">Produção</option>
      </select>
    </Field>
  </div>

  <div style={grid3Style}>
    <Field label="Série NF-e" theme={theme}>
      <input
        style={inputStyle(theme, inputBg)}
        value={form.nfeSeries || "1"}
        onChange={(e) => updateField("nfeSeries", e.target.value)}
      />
    </Field>

    <Field label="Próximo número" theme={theme}>
      <input
        type="number"
        style={inputStyle(theme, inputBg)}
        value={form.nfeNextNumber || 1}
        onChange={(e) =>
  updateField(
    "nfeNextNumber",
    e.target.value ? Number(e.target.value) : 1
  )
}
      />
    </Field>

    <Field label="Token Focus NFe" theme={theme}>
      <input
        style={inputStyle(theme, inputBg)}
        value={form.nfeToken || ""}
        onChange={(e) => updateField("nfeToken", e.target.value)}
        placeholder="Token de homologação/produção da Focus NFe"
      />
    </Field>
  </div>
</section>

        {pageError ? <MessageBox type="error" theme={theme} text={pageError} /> : null}
        {pageSuccess ? <MessageBox type="success" theme={theme} text={pageSuccess} /> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button type="button" onClick={() => router.push("/settings")} style={secondaryButtonStyle(theme)}>
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving || !form.tradeName.trim()}
            style={{
              ...primaryButtonStyle,
              opacity: saving || !form.tradeName.trim() ? 0.7 : 1,
              cursor: saving || !form.tradeName.trim() ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando..." : "Salvar dados"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof getThemeColors>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: theme.subtext,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function MessageBox({
  type,
  text,
  theme,
}: {
  type: "error" | "success";
  text: string;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const isError = type === "error";

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        border: isError
          ? theme.isDark
            ? "1px solid rgba(248,113,113,0.35)"
            : "1px solid #fecaca"
          : theme.isDark
            ? "1px solid rgba(74,222,128,0.35)"
            : "1px solid #bbf7d0",
        background: isError
          ? theme.isDark
            ? "rgba(127,29,29,0.25)"
            : "#fef2f2"
          : theme.isDark
            ? "rgba(20,83,45,0.25)"
            : "#f0fdf4",
        color: isError
          ? theme.isDark
            ? "#fecaca"
            : "#b91c1c"
          : theme.isDark
            ? "#bbf7d0"
            : "#166534",
      }}
    >
      {text}
    </div>
  );
}

function sectionStyle(theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    padding: 20,
    display: "grid",
    gap: 16,
  };
}

const grid2Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const grid3Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const grid4Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr",
  gap: 14,
};

function inputStyle(theme: ReturnType<typeof getThemeColors>, bg: string): React.CSSProperties {
  return {
    width: "100%",
    height: 40,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: bg,
    color: theme.text,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
  };
}

function textareaStyle(theme: ReturnType<typeof getThemeColors>, bg: string): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 110,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: bg,
    color: theme.text,
    padding: 12,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };
}

const primaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  padding: "0 16px",
  height: 42,
  fontWeight: 800,
};

function secondaryButtonStyle(theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    background: theme.cardBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "0 16px",
    height: 42,
    fontWeight: 800,
    cursor: "pointer",
  };
}