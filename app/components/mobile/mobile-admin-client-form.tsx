"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  User2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";

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

const PERSON_TYPES = [
  { value: "JURIDICA", label: "Pessoa jurídica" },
  { value: "FISICA", label: "Pessoa física" },
] as const;

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export default function MobileAdminClientForm() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [savedClient, setSavedClient] = useState<ClientCreateResponse | null>(null);

  const [personType, setPersonType] = useState<"JURIDICA" | "FISICA">("JURIDICA");
  const [regionId, setRegionId] = useState("");

  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [name, setName] = useState("");

  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");

  const [billingEmail, setBillingEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [complement, setComplement] = useState("");

  const [notes, setNotes] = useState("");

  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastFetchedCep, setLastFetchedCep] = useState("");

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
      if (data.state && !state) setState(String(data.state).toUpperCase());
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

    async function loadBase() {
      try {
        setLoading(true);
        setError(null);

        const [authRes, regionsRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
        ]);

        const authJson = (await authRes.json().catch(() => null)) as AuthResponse | null;
        const regionsJson = await regionsRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/clients/new");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const nextRegions: RegionItem[] = Array.isArray(regionsJson?.items)
          ? regionsJson.items
          : [];

        if (!active) return;

        setRegions(nextRegions);

        if (authJson?.user?.regionId) {
          setRegionId(authJson.user.regionId);
        } else if (nextRegions.length > 0) {
          setRegionId(nextRegions[0].id);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar dados do cliente."
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
  }, [router]);

  const selectedRegion = useMemo(() => {
    return regions.find((item) => item.id === regionId) ?? null;
  }, [regions, regionId]);

  function resetForm() {
    setSavedClient(null);
    setPersonType("JURIDICA");
    setTradeName("");
    setLegalName("");
    setName("");
    setCnpj("");
    setCpf("");
    setBillingEmail("");
    setPhone("");
    setWhatsapp("");
    setCep("");
    setStreet("");
    setNumber("");
    setDistrict("");
    setCity("");
    setState("");
    setComplement("");
    setNotes("");
  }

  async function handleSave() {
    try {
      setError(null);

      const finalName =
        name.trim() ||
        (personType === "JURIDICA" ? legalName.trim() || tradeName.trim() : tradeName.trim());

      if (!finalName) {
        setError("Informe o nome principal do cliente.");
        return;
      }

      if (!regionId) {
        setError("Selecione a região.");
        return;
      }

      if (personType === "FISICA" && digitsOnly(cpf).length !== 11) {
        setError("Para pessoa física, informe um CPF válido com 11 dígitos.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personType,
          name: finalName,
          tradeName: tradeName.trim() || null,
          legalName: legalName.trim() || null,
          cpf: personType === "FISICA" ? digitsOnly(cpf) : null,
          cnpj: personType === "JURIDICA" ? digitsOnly(cnpj) || null : null,
          regionId,
          billingEmail: billingEmail.trim() || null,
          phone: digitsOnly(phone) || null,
          whatsapp: digitsOnly(whatsapp) || null,
          cep: digitsOnly(cep) || null,
          street: street.trim() || null,
          number: number.trim() || null,
          district: district.trim() || null,
          city: city.trim() || null,
          state: state.trim().toUpperCase() || null,
          complement: complement.trim() || null,
          notes: notes.trim() || null,
          roleClient: true,
          roleSupplier: false,
          roleCarrier: false,
          stateRegistrationIndicator: "CONTRIBUINTE",
          country: "Brasil",
          simpleTaxOption: null,
          publicAgency: null,
          registrationCode: null,
          stateRegistration: null,
          municipalRegistration: null,
          suframaRegistration: null,
          otherContacts: [],
        }),
      });

      const json = (await res.json().catch(() => null)) as ClientCreateResponse | null;

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar cliente.");
      }

      setSavedClient(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Carregando dados do cadastro...</div>
      </MobileCard>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error ? (
        <MobileCard style={{ borderColor: "#ef4444" }}>
          <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 800 }}>{error}</div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <CheckCircle2 size={22} />
            <div style={{ fontSize: 18, fontWeight: 900 }}>Cliente salvo com sucesso</div>
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            <strong>{savedClient.name || "Cliente"}</strong>
            {savedClient.code ? ` • código ${savedClient.code}` : ""}
          </div>

          {(savedClient.portalUsername || savedClient.portalInitialPassword) ? (
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
                <strong>Usuário portal:</strong> {savedClient.portalUsername || "-"}
              </div>
              <div>
                <strong>Senha inicial:</strong> {savedClient.portalInitialPassword || "-"}
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
            <Link href="/m/admin/clients">
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
        <MobileSectionTitle title="Tipo e região" />

        <div style={{ display: "grid", gap: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 10,
            }}
          >
            {PERSON_TYPES.map((item) => {
              const active = personType === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPersonType(item.value)}
                  style={{
                    minHeight: 46,
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
                  {item.label}
                </button>
              );
            })}
          </div>

          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          >
            <option value="">Selecione a região</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
                {region.stockLocationName ? ` • ${region.stockLocationName}` : ""}
              </option>
            ))}
          </select>

          {selectedRegion ? (
            <div
              style={{
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.isDark ? "#0f172a" : "#f8fafc",
                padding: 14,
                display: "grid",
                gap: 6,
                fontSize: 12,
                color: colors.subtext,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={14} />
                Região: {selectedRegion.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={14} />
                Estoque: {selectedRegion.stockLocationName || "Não vinculado"}
              </div>
            </div>
          ) : null}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Dados principais" />

        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome principal / nome do cliente"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <input
            type="text"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="Nome fantasia"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <input
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Razão social / nome civil"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          {personType === "JURIDICA" ? (
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="CNPJ (opcional)"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px",
                outline: "none",
                fontSize: 14,
              }}
            />
          ) : (
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="CPF"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px",
                outline: "none",
                fontSize: 14,
              }}
            />
          )}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Contato" />

        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder="E-mail de cobrança (opcional)"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <input
            type="text"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 10,
            }}
          >
            <div
              style={{
                minHeight: 42,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: colors.subtext,
              }}
            >
              <Phone size={14} />
              contato rápido
            </div>

            <div
              style={{
                minHeight: 42,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: colors.subtext,
              }}
            >
              <MessageCircle size={14} />
              WhatsApp
            </div>
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Endereço" />

        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="text"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            placeholder="CEP"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          {cepLoading ? (
            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
                fontWeight: 600,
                marginTop: -4,
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
                marginTop: -4,
              }}
            >
              {cepFeedback.text}
            </div>
          ) : null}

          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Rua / avenida"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px minmax(0,1fr)",
              gap: 10,
            }}
          >
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Número"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px",
                outline: "none",
                fontSize: 14,
              }}
            />

            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Bairro"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px",
                outline: "none",
                fontSize: 14,
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 86px",
              gap: 10,
            }}
          >
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cidade"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px",
                outline: "none",
                fontSize: 14,
              }}
            />

            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="UF"
              maxLength={2}
              style={{
                width: "100%",
                height: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 14px",
                outline: "none",
                fontSize: 14,
                textTransform: "uppercase",
              }}
            />
          </div>

          <input
            type="text"
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
            placeholder="Complemento"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Observações" />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações do cliente"
          rows={4}
          style={{
            width: "100%",
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            padding: 14,
            outline: "none",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </MobileCard>

      <MobileCard>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 10,
          }}
        >
          <Link href="/m/admin/clients">
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
            disabled={saving}
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
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.75 : 1,
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