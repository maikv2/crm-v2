"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type ThemeShape = ReturnType<typeof getThemeColors>;

type InvestorForm = {
  name: string;
  email: string;
  phone: string;
  document: string;
  notes: string;
  password: string;
  quotaCount: number;
  quotaValue: number;
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function Field({
  label,
  value,
  onChange,
  theme,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  theme: ThemeShape;
  type?: string;
  placeholder?: string;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const inputBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: theme.text,
        }}
      >
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 42,
          borderRadius: 10,
          border: `1px solid ${border}`,
          background: inputBg,
          padding: "0 12px",
          outline: "none",
          color: theme.text,
          fontSize: 14,
        }}
      />
    </div>
  );
}

export default function NewInvestorPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const border = theme.isDark ? "#1e293b" : theme.border;
  const inputBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<InvestorForm>({
    name: "",
    email: "",
    phone: "",
    document: "",
    notes: "",
    password: "",
    quotaCount: 1,
    quotaValue: 20000,
  });

  function update<K extends keyof InvestorForm>(field: K, value: InvestorForm[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  const totalInvested = useMemo(() => {
    return Math.max(0, form.quotaCount) * Math.max(0, form.quotaValue);
  }, [form.quotaCount, form.quotaValue]);

  async function save() {
    try {
      setLoading(true);
      setError(null);

      if (!form.name.trim()) {
        throw new Error("Informe o nome do investidor.");
      }

      if (!form.email.trim()) {
        throw new Error(
          "E-mail é obrigatório para o investidor acessar o portal."
        );
      }

      if (!form.password || form.password.length < 6) {
        throw new Error(
          "A senha deve ter pelo menos 6 caracteres."
        );
      }

      if (form.quotaCount <= 0) {
        throw new Error("Informe uma quantidade de cotas válida.");
      }

      if (form.quotaValue <= 0) {
        throw new Error("Informe um valor de cota válido.");
      }

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        document: form.document.trim() || null,
        notes: form.notes.trim() || null,
        password: form.password,
        quotaCount: form.quotaCount,
        quotaValueCents: Math.round(form.quotaValue * 100),
        totalInvestedCents: Math.round(totalInvested * 100),
      };

      const res = await fetch("/api/investors/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar investidor.");
      }

      router.push("/investors");
    } catch (error: any) {
      console.error(error);
      setError(error?.message || "Erro ao criar investidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        color: theme.text,
        background: theme.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.subtext,
          marginBottom: 10,
        }}
      >
        🏠 / Investidores / Novo Investidor
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Novo Investidor
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Cadastre os dados do investidor. O acesso ao portal do investidor é
            criado automaticamente com o e-mail e a senha informados.
          </div>
        </div>
      </div>

      <div
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 18,
          padding: 20,
          boxShadow: theme.isDark
            ? "0 10px 30px rgba(2,6,23,0.35)"
            : "0 8px 24px rgba(15,23,42,0.06)",
          maxWidth: 1100,
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Dados do investidor
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field
                  label="Nome completo"
                  value={form.name}
                  onChange={(value) => update("name", value)}
                  theme={theme}
                  placeholder="Ex: João da Silva"
                />

                <Field
                  label="CPF / CNPJ"
                  value={form.document}
                  onChange={(value) => update("document", value)}
                  theme={theme}
                  placeholder="Ex: 000.000.000-00"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field
                  label="E-mail *"
                  value={form.email}
                  onChange={(value) => update("email", value)}
                  theme={theme}
                  type="email"
                  placeholder="Ex: investidor@email.com"
                />

                <Field
                  label="Telefone"
                  value={form.phone}
                  onChange={(value) => update("phone", value)}
                  theme={theme}
                  placeholder="Ex: (49) 99999-9999"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 16,
                }}
              >
                <Field
                  label="Senha de acesso ao portal *"
                  value={form.password}
                  onChange={(value) => update("password", value)}
                  theme={theme}
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <Field
                  label="Quantidade de cotas"
                  value={form.quotaCount}
                  onChange={(value) =>
                    update("quotaCount", Math.max(0, Number(value) || 0))
                  }
                  theme={theme}
                  type="number"
                  placeholder="Ex: 1"
                />

                <Field
                  label="Valor de cada cota"
                  value={form.quotaValue}
                  onChange={(value) =>
                    update("quotaValue", Math.max(0, Number(value) || 0))
                  }
                  theme={theme}
                  type="number"
                  placeholder="Ex: 20000"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: theme.text,
                  }}
                >
                  Observações
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${border}`,
                    background: inputBg,
                    padding: 12,
                    outline: "none",
                    color: theme.text,
                    minHeight: 120,
                    resize: "vertical",
                    fontSize: 14,
                  }}
                  placeholder="Informações complementares sobre o investidor, forma de entrada, condições, observações internas..."
                />
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 18,
                background: subtleCard,
                display: "grid",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: theme.text,
                }}
              >
                Resumo do investimento
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.subtext,
                    marginBottom: 6,
                  }}
                >
                  Investidor
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: theme.text,
                  }}
                >
                  {form.name || "Não informado"}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.subtext,
                    marginBottom: 6,
                  }}
                >
                  Quantidade de cotas
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: theme.text,
                  }}
                >
                  {form.quotaCount}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.subtext,
                    marginBottom: 6,
                  }}
                >
                  Valor por cota
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: theme.text,
                  }}
                >
                  {money(form.quotaValue)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.subtext,
                    marginBottom: 6,
                  }}
                >
                  Valor total investido
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: theme.primary,
                  }}
                >
                  {money(totalInvested)}
                </div>
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: theme.subtext,
                  lineHeight: 1.5,
                }}
              >
                Este valor é calculado automaticamente com base na quantidade de cotas
                multiplicada pelo valor de cada cota.
              </div>
            </div>
          </div>

          {error ? (
            <div
              style={{
                color: "#ef4444",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 4,
              display: "flex",
              gap: 12,
            }}
          >
            <button
              onClick={save}
              disabled={loading}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 10,
                height: 40,
                padding: "0 20px",
                fontWeight: 800,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>

            <button
              onClick={() => router.back()}
              type="button"
              style={{
                borderRadius: 10,
                height: 40,
                padding: "0 20px",
                border: `1px solid ${border}`,
                background: "transparent",
                color: theme.text,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}