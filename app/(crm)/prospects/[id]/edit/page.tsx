"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

type Region = {
  id: string;
  name: string;
};

type Representative = {
  id: string;
  name: string;
  email: string;
  regionId?: string | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function inputStyle(inputBg: string, theme: ThemeShape): React.CSSProperties {
  return {
    height: 42,
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
    background: inputBg,
    color: theme.text,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
  };
}

function Label({ text, theme }: { text: string; theme: ThemeShape }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: theme.subtext,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {text}
    </div>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 18,
          paddingBottom: 12,
          borderBottom: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        }}
      >
        {title}
      </div>
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

  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED">("PENDING");
  const [regionId, setRegionId] = useState("");
  const [representativeId, setRepresentativeId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);

        const [prospectRes, regionsRes] = await Promise.all([
          fetch(`/api/prospects/${id}`, { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
        ]);

        const prospectData = await prospectRes.json();
        const regionsData = await regionsRes.json();

        if (!prospectRes.ok) {
          throw new Error(prospectData?.error || "Prospecto não encontrado.");
        }

        const p = prospectData;
        setName(p.name ?? "");
        setTradeName(p.tradeName ?? "");
        setCnpj(p.cnpj ?? "");
        setPhone(p.phone ?? "");
        setEmail(p.email ?? "");
        setContactName(p.contactName ?? "");
        setCep(p.cep ?? "");
        setStreet(p.street ?? "");
        setNumber(p.number ?? "");
        setDistrict(p.district ?? "");
        setCity(p.city ?? "");
        setStateValue(p.state ?? "");
        setNotes(p.notes ?? "");
        setStatus(p.status ?? "PENDING");
        setRegionId(p.regionId ?? "");
        setRepresentativeId(p.representativeId ?? "");
        setLatitude(p.latitude != null ? String(p.latitude) : "");
        setLongitude(p.longitude != null ? String(p.longitude) : "");

        const list = Array.isArray(regionsData)
          ? regionsData
          : Array.isArray(regionsData?.items)
          ? regionsData.items
          : [];
        setRegions(list);

        if (p.regionId) {
          const repsRes = await fetch(
            `/api/representatives/by-region?regionId=${p.regionId}`,
            { cache: "no-store" }
          );
          const repsData = await repsRes.json();
          setRepresentatives(Array.isArray(repsData) ? repsData : []);
        }
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar prospecto.");
      } finally {
        setLoading(false);
      }
    }

    if (id) loadAll();
  }, [id]);

  useEffect(() => {
    async function loadReps() {
      if (!regionId) {
        setRepresentatives([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/representatives/by-region?regionId=${regionId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setRepresentatives(Array.isArray(data) ? data : []);
      } catch {
        setRepresentatives([]);
      }
    }
    loadReps();
  }, [regionId]);

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome do prospecto.");
      return;
    }

    if (!regionId) {
      setError("Selecione a região.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tradeName: tradeName.trim() || null,
          cnpj: cnpj.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          contactName: contactName.trim() || null,
          cep: cep.trim() || null,
          street: street.trim() || null,
          number: number.trim() || null,
          district: district.trim() || null,
          city: city.trim() || null,
          state: stateValue.trim().toUpperCase() || null,
          notes: notes.trim() || null,
          status,
          regionId,
          representativeId: representativeId || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar prospecto.");
      }

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
      <div
        style={{
          background: theme.pageBg,
          minHeight: "100%",
          padding: 28,
          color: theme.subtext,
          fontWeight: 700,
        }}
      >
        Carregando prospecto...
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
      {/* Header */}
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
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🎯 / Prospectos / Editar
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
            Editar Prospecto
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: theme.subtext }}>
            Atualize os dados do prospecto.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.cardBg,
              color: theme.text,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 40,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: saving ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 12,
            background: theme.isDark ? "rgba(239,68,68,0.12)" : "#fee2e2",
            color: "#dc2626",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>
        {/* Vínculo */}
        <Section title="Vínculo comercial" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <Label text="Região *" theme={theme} />
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                style={inputStyle(inputBg, theme)}
              >
                <option value="">Selecione a região</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label text="Representante" theme={theme} />
              <select
                value={representativeId}
                onChange={(e) => setRepresentativeId(e.target.value)}
                disabled={!regionId}
                style={{
                  ...inputStyle(inputBg, theme),
                  opacity: regionId ? 1 : 0.5,
                }}
              >
                <option value="">Sem representante</option>
                {representatives.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label text="Status" theme={theme} />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                style={inputStyle(inputBg, theme)}
              >
                <option value="PENDING">Pendente</option>
                <option value="RETURN">Voltar</option>
                <option value="NO_RETURN">Não voltar</option>
                <option value="CONVERTED">Convertido</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Dados principais */}
        <Section title="Dados principais" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <Label text="Nome do local *" theme={theme} />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do local"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Nome fantasia" theme={theme} />
              <input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Nome fantasia"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="CNPJ" theme={theme} />
              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Responsável" theme={theme} />
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nome do responsável"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Telefone" theme={theme} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="E-mail" theme={theme} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                style={inputStyle(inputBg, theme)}
              />
            </div>
          </div>
        </Section>

        {/* Endereço */}
        <Section title="Endereço" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <Label text="CEP" theme={theme} />
              <input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="00000-000"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Rua" theme={theme} />
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Nome da rua"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Número" theme={theme} />
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Número"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Bairro" theme={theme} />
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Bairro"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Cidade" theme={theme} />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="UF" theme={theme} />
              <input
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                placeholder="UF"
                maxLength={2}
                style={inputStyle(inputBg, theme)}
              />
            </div>
          </div>
        </Section>

        {/* Localização */}
        <Section title="Localização no mapa" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <Label text="Latitude" theme={theme} />
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-27.1004"
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div>
              <Label text="Longitude" theme={theme} />
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-52.6152"
                style={inputStyle(inputBg, theme)}
              />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: theme.subtext }}>
            Se não preencher latitude/longitude, o sistema tentará geocodificar pelo endereço automaticamente.
          </div>
        </Section>

        {/* Observações */}
        <Section title="Observações" theme={theme}>
          <Label text="Observação da visita" theme={theme} />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações gerais sobre o prospecto..."
            style={{
              ...inputStyle(inputBg, theme),
              height: 110,
              paddingTop: 12,
              resize: "vertical",
            }}
          />
        </Section>
      </div>
    </div>
  );
}