"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

type Region = { id: string; name: string };
type Representative = { id: string; name: string; regionId?: string | null };
type ThemeShape = ReturnType<typeof getThemeColors>;

function inputStyle(inputBg: string, theme: ThemeShape): React.CSSProperties {
  return {
    height: 42, width: "100%", borderRadius: 10,
    border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
    background: inputBg, color: theme.text,
    padding: "0 12px", outline: "none", fontSize: 14,
  };
}

function Label({ text, theme }: { text: string; theme: ThemeShape }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: theme.subtext,
      marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {text}
    </div>
  );
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: ThemeShape }) {
  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
      borderRadius: 18, padding: 22,
      boxShadow: theme.isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
    }}>
      <div style={{
        fontSize: 16, fontWeight: 800, color: theme.text,
        marginBottom: 18, paddingBottom: 12,
        borderBottom: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

function Grid3({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

export default function EditProspectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);

  // Vínculo
  const [regionId, setRegionId] = useState("");
  const [representativeId, setRepresentativeId] = useState("");
  const [status, setStatus] = useState<"PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED">("PENDING");

  // Identificação
  const [personType, setPersonType] = useState<"JURIDICA" | "FISICA">("JURIDICA");
  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [stateRegistration, setStateRegistration] = useState("");
  const [municipalRegistration, setMunicipalRegistration] = useState("");
  const [suframaRegistration, setSuframaRegistration] = useState("");

  // Contato
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [country, setCountry] = useState("Brasil");

  // Mapa
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Observações
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const [prospectRes, regionsRes] = await Promise.all([
          fetch(`/api/prospects/${id}`, { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
        ]);
        const p = await prospectRes.json();
        const regionsData = await regionsRes.json();
        if (!prospectRes.ok) throw new Error(p?.error || "Erro ao carregar prospecto.");

        setName(p.name ?? "");
        setTradeName(p.tradeName ?? "");
        setLegalName(p.legalName ?? "");
        setCnpj(p.cnpj ?? "");
        setCpf(p.cpf ?? "");
        setPersonType(p.cpf ? "FISICA" : "JURIDICA");
        setPhone(p.phone ?? "");
        setWhatsapp(p.whatsapp ?? "");
        setEmail(p.email ?? "");
        setBillingEmail(p.billingEmail ?? "");
        setContactName(p.contactName ?? "");
        setStateRegistration(p.stateRegistration ?? "");
        setMunicipalRegistration(p.municipalRegistration ?? "");
        setSuframaRegistration(p.suframaRegistration ?? "");
        setCep(p.cep ?? "");
        setStreet(p.street ?? "");
        setNumber(p.number ?? "");
        setComplement(p.complement ?? "");
        setDistrict(p.district ?? "");
        setCity(p.city ?? "");
        setStateValue(p.state ?? "");
        setCountry(p.country ?? "Brasil");
        setNotes(p.notes ?? "");
        setStatus(p.status ?? "PENDING");
        setRegionId(p.regionId ?? "");
        setRepresentativeId(p.representativeId ?? "");
        setLatitude(p.latitude != null ? String(p.latitude) : "");
        setLongitude(p.longitude != null ? String(p.longitude) : "");

        const list = Array.isArray(regionsData) ? regionsData : Array.isArray(regionsData?.items) ? regionsData.items : [];
        setRegions(list);

        if (p.regionId) {
          const repsRes = await fetch(`/api/representatives/by-region?regionId=${p.regionId}`, { cache: "no-store" });
          const repsData = await repsRes.json();
          setRepresentatives(Array.isArray(repsData) ? repsData : []);
        }
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar prospecto.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadReps() {
      if (!regionId) { setRepresentatives([]); return; }
      try {
        const res = await fetch(`/api/representatives/by-region?regionId=${regionId}`, { cache: "no-store" });
        const data = await res.json();
        setRepresentatives(Array.isArray(data) ? data : []);
      } catch { setRepresentatives([]); }
    }
    loadReps();
  }, [regionId]);

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError("Informe o nome do local."); return; }
    if (!regionId) { setError("Selecione a região."); return; }
    try {
      setSaving(true);
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tradeName: tradeName.trim() || null,
          legalName: legalName.trim() || null,
          cnpj: cnpj.trim() || null,
          cpf: cpf.trim() || null,
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          billingEmail: billingEmail.trim() || null,
          contactName: contactName.trim() || null,
          stateRegistration: stateRegistration.trim() || null,
          municipalRegistration: municipalRegistration.trim() || null,
          suframaRegistration: suframaRegistration.trim() || null,
          cep: cep.trim() || null,
          street: street.trim() || null,
          number: number.trim() || null,
          complement: complement.trim() || null,
          district: district.trim() || null,
          city: city.trim() || null,
          state: stateValue.trim().toUpperCase() || null,
          country: country.trim() || null,
          notes: notes.trim() || null,
          status,
          regionId,
          representativeId: representativeId || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar.");
      router.push("/prospects");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar prospecto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: theme.pageBg, minHeight: "100%", padding: 28, color: theme.subtext, fontWeight: 700 }}>
        Carregando prospecto...
      </div>
    );
  }

  return (
    <div style={{ background: theme.pageBg, color: theme.text, minHeight: "100%", padding: 28 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 16, marginBottom: 22, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.subtext, marginBottom: 10 }}>
            🎯 / Prospectos / Editar
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Editar Prospecto</div>
          <div style={{ marginTop: 6, fontSize: 13, color: theme.subtext }}>
            Atualize os dados do prospecto.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => router.back()} style={{
            height: 40, padding: "0 16px", borderRadius: 12,
            border: `1px solid ${theme.border}`, background: theme.cardBg,
            color: theme.text, fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{
            height: 40, padding: "0 20px", borderRadius: 12, border: "none",
            background: saving ? "#93c5fd" : "#2563eb", color: "#ffffff",
            fontWeight: 800, fontSize: 13, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      {error ? (
        <div style={{
          marginBottom: 16, padding: "12px 16px", borderRadius: 12,
          background: theme.isDark ? "rgba(239,68,68,0.12)" : "#fee2e2",
          color: "#dc2626", fontWeight: 700, fontSize: 13,
        }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>

        {/* Vínculo */}
        <Section title="Vínculo comercial" theme={theme}>
          <Grid3>
            <div>
              <Label text="Região *" theme={theme} />
              <select value={regionId} onChange={(e) => setRegionId(e.target.value)} style={inputStyle(inputBg, theme)}>
                <option value="">Selecione a região</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label text="Representante" theme={theme} />
              <select value={representativeId} onChange={(e) => setRepresentativeId(e.target.value)}
                disabled={!regionId} style={{ ...inputStyle(inputBg, theme), opacity: regionId ? 1 : 0.5 }}>
                <option value="">Sem representante</option>
                {representatives.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label text="Status" theme={theme} />
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={inputStyle(inputBg, theme)}>
                <option value="PENDING">Pendente</option>
                <option value="RETURN">Voltar</option>
                <option value="NO_RETURN">Não voltar</option>
                <option value="CONVERTED">Convertido</option>
              </select>
            </div>
          </Grid3>
        </Section>

        {/* Identificação */}
        <Section title="Identificação" theme={theme}>
          <div style={{ marginBottom: 14 }}>
            <Label text="Tipo de pessoa" theme={theme} />
            <div style={{ display: "flex", gap: 10 }}>
              {(["JURIDICA", "FISICA"] as const).map((type) => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14, color: theme.text }}>
                  <input type="radio" checked={personType === type} onChange={() => setPersonType(type)} />
                  {type === "JURIDICA" ? "Pessoa Jurídica" : "Pessoa Física"}
                </label>
              ))}
            </div>
          </div>
          <Grid2>
            {personType === "JURIDICA" ? (
              <div>
                <Label text="CNPJ" theme={theme} />
                <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" style={inputStyle(inputBg, theme)} />
              </div>
            ) : (
              <div>
                <Label text="CPF" theme={theme} />
                <input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" style={inputStyle(inputBg, theme)} />
              </div>
            )}
            <div>
              <Label text="Nome do local *" theme={theme} />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do local" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Nome fantasia" theme={theme} />
              <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Nome fantasia" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Razão social" theme={theme} />
              <input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Razão social" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Inscrição estadual" theme={theme} />
              <input value={stateRegistration} onChange={(e) => setStateRegistration(e.target.value)} placeholder="Inscrição estadual" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Inscrição municipal" theme={theme} />
              <input value={municipalRegistration} onChange={(e) => setMunicipalRegistration(e.target.value)} placeholder="Inscrição municipal" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Inscrição suframa" theme={theme} />
              <input value={suframaRegistration} onChange={(e) => setSuframaRegistration(e.target.value)} placeholder="Inscrição suframa" style={inputStyle(inputBg, theme)} />
            </div>
          </Grid2>
        </Section>

        {/* Contato */}
        <Section title="Contato" theme={theme}>
          <Grid2>
            <div>
              <Label text="Responsável" theme={theme} />
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome do responsável" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Telefone" theme={theme} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="WhatsApp" theme={theme} />
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="E-mail" theme={theme} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="E-mail financeiro" theme={theme} />
              <input value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="financeiro@exemplo.com" style={inputStyle(inputBg, theme)} />
            </div>
          </Grid2>
        </Section>

        {/* Endereço */}
        <Section title="Endereço" theme={theme}>
          <Grid2>
            <div>
              <Label text="CEP" theme={theme} />
              <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="País" theme={theme} />
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Brasil" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Rua" theme={theme} />
              <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Nome da rua" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Número" theme={theme} />
              <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Complemento" theme={theme} />
              <input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Bairro" theme={theme} />
              <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bairro" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Cidade" theme={theme} />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="UF" theme={theme} />
              <input value={stateValue} onChange={(e) => setStateValue(e.target.value)} placeholder="UF" maxLength={2} style={inputStyle(inputBg, theme)} />
            </div>
          </Grid2>
        </Section>

        {/* Localização */}
        <Section title="Localização no mapa" theme={theme}>
          <Grid2>
            <div>
              <Label text="Latitude" theme={theme} />
              <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-27.1004" style={inputStyle(inputBg, theme)} />
            </div>
            <div>
              <Label text="Longitude" theme={theme} />
              <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-52.6152" style={inputStyle(inputBg, theme)} />
            </div>
          </Grid2>
          <div style={{ marginTop: 10, fontSize: 12, color: theme.subtext }}>
            Se não preencher, o sistema tentará geocodificar pelo endereço automaticamente.
          </div>
        </Section>

        {/* Observações */}
        <Section title="Observações" theme={theme}>
          <Label text="Observação da visita" theme={theme} />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações gerais sobre o prospecto..."
            style={{ ...inputStyle(inputBg, theme), height: 110, paddingTop: 12, resize: "vertical" }}
          />
        </Section>

      </div>
    </div>
  );
}