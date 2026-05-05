"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AuthResponse = {
  user?: {
    id: string;
    role?: string;
    regionId?: string | null;
  } | null;
};

export default function MobileRepNewClientPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personType, setPersonType] = useState<"JURIDICA" | "FISICA">("JURIDICA");
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");

  const [billingEmail, setBillingEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [contactName, setContactName] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [complement, setComplement] = useState("");

  const [notes, setNotes] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastFetchedCep, setLastFetchedCep] = useState("");

  function digitsOnly(value: string) {
    return String(value ?? "").replace(/\D/g, "");
  }

  async function fetchCEPData(rawValue?: string) {
    const cleanCep = digitsOnly(rawValue ?? cep);

    if (cleanCep.length !== 8) {
      setCepFeedback({ type: "error", text: "Informe um CEP com 8 dígitos." });
      return;
    }

    if (cepLoading) return;
    if (cleanCep === lastFetchedCep) return;

    try {
      setCepLoading(true);
      setCepFeedback(null);

      const response = await fetch(`/api/cep/${cleanCep}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível consultar o CEP.");
      }

      if (data.street && !street) setStreet(data.street);
      if (data.district && !district) setDistrict(data.district);
      if (data.city && !city) setCity(data.city);
      if (data.state && !stateValue) setStateValue(String(data.state).toUpperCase());
      if (data.complement && !complement) setComplement(data.complement);

      setLastFetchedCep(cleanCep);
      setCepFeedback({ type: "success", text: "Endereço preenchido pelo CEP." });
    } catch (err: any) {
      setCepFeedback({
        type: "error",
        text: err?.message || "Erro ao consultar CEP.",
      });
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    const cleanCep = digitsOnly(cep);
    if (cleanCep.length !== 8) return;
    if (cleanCep === lastFetchedCep) return;

    const timer = setTimeout(() => {
      fetchCEPData(cleanCep);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep, lastFetchedCep]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as AuthResponse | null;

        if (res.status === 401) {
          router.push("/login?redirect=/m/rep/clients/new");
          return;
        }

        if (json?.user?.role !== "REPRESENTATIVE") {
          router.push("/m/rep/clients");
          return;
        }

        if (!active) return;
      } catch {
        if (active) {
          setError("Erro ao validar usuário.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personType,
          name: name.trim() || tradeName.trim() || legalName.trim(),
          tradeName: tradeName.trim() || null,
          legalName: legalName.trim() || null,
          cnpj: cnpj.trim() || null,
          cpf: cpf.trim() || null,
          billingEmail: billingEmail.trim() || null,
          whatsapp: whatsapp.trim() || null,
          phone: phone.trim() || null,
          stateRegistration: stateRegistration.trim() || null,
          contactName: contactName.trim() || null,
          cep: cep.trim() || null,
          street: street.trim() || null,
          number: number.trim() || null,
          district: district.trim() || null,
          city: city.trim() || null,
          state: stateValue.trim().toUpperCase() || null,
          complement: complement.trim() || null,
          notes: notes.trim() || null,
          roleClient: true,
          roleSupplier: false,
          roleCarrier: false,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar cliente.");
      }

      router.push("/m/rep/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    padding: 14,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };

  return (
    <MobileRepPageFrame
      title="Novo cliente"
      subtitle="Cadastro mobile do representante"
      desktopHref="/clients/new"
    >
      {loading ? (
        <MobileCard>Carregando...</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Dados principais" />

            <div style={{ display: "grid", gap: 12 }}>
              <select
                value={personType}
                onChange={(e) =>
                  setPersonType(e.target.value as "JURIDICA" | "FISICA")
                }
                style={inputStyle}
              >
                <option value="JURIDICA">Pessoa jurídica</option>
                <option value="FISICA">Pessoa física</option>
              </select>

              <input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Nome fantasia"
                style={inputStyle}
              />

              <input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Razão social / nome"
                style={inputStyle}
              />

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome principal"
                style={inputStyle}
              />

              {personType === "JURIDICA" ? (
                <input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="CNPJ"
                  style={inputStyle}
                />
              ) : (
                <input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="CPF"
                  style={inputStyle}
                />
              )}

              <input
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="E-mail"
                style={inputStyle}
              />

              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp"
                style={inputStyle}
              />

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefone"
                style={inputStyle}
              />

              <input
                value={stateRegistration}
                onChange={(e) => setStateRegistration(e.target.value)}
                placeholder="Inscrição estadual"
                style={inputStyle}
              />

              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contato responsável"
                style={inputStyle}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Endereço" />

            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="CEP"
                style={inputStyle}
              />

              {cepLoading ? (
                <div
                  style={{
                    fontSize: 12,
                    color: colors.subtext,
                    fontWeight: 600,
                    marginTop: -6,
                  }}
                >
                  Buscando endereço pelo CEP...
                </div>
              ) : cepFeedback ? (
                <div
                  style={{
                    fontSize: 12,
                    color: cepFeedback.type === "error" ? "#dc2626" : "#16a34a",
                    fontWeight: 600,
                    marginTop: -6,
                  }}
                >
                  {cepFeedback.text}
                </div>
              ) : null}

              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Rua"
                style={inputStyle}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px",
                  gap: 12,
                }}
              >
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Número"
                  style={inputStyle}
                />
                <input
                  value={stateValue}
                  onChange={(e) => setStateValue(e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                  style={inputStyle}
                />
              </div>

              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Bairro"
                style={inputStyle}
              />

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                style={inputStyle}
              />

              <input
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Complemento"
                style={inputStyle}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Observações" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Observações"
              style={textareaStyle}
            />
          </MobileCard>

          {error ? <MobileCard>{error}</MobileCard> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 46,
              borderRadius: 14,
              border: "none",
              background: colors.primary,
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar cliente"}
          </button>
        </>
      )}
    </MobileRepPageFrame>
  );
}