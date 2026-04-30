"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ThemeColors = ReturnType<typeof getThemeColors>;

function inputStyle(colors: ThemeColors): React.CSSProperties {
  return {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
  };
}

function Label({ text, colors }: { text: string; colors: ThemeColors }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: colors.subtext,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {text}
    </div>
  );
}

export default function MobileRepEditProspectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/prospects/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar prospecto.");

        setName(data.name ?? "");
        setTradeName(data.tradeName ?? "");
        setCnpj(data.cnpj ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setContactName(data.contactName ?? "");
        setCep(data.cep ?? "");
        setStreet(data.street ?? "");
        setNumber(data.number ?? "");
        setDistrict(data.district ?? "");
        setCity(data.city ?? "");
        setStateValue(data.state ?? "");
        setNotes(data.notes ?? "");
        setStatus(data.status ?? "PENDING");
        setLatitude(data.latitude != null ? String(data.latitude) : "");
        setLongitude(data.longitude != null ? String(data.longitude) : "");
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar prospecto.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Informe o nome do prospecto.");
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
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar.");
      router.push("/m/rep/prospects");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar prospecto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <MobileRepPageFrame title="Editar Prospecto" subtitle="" desktopHref="/rep/prospects">
        <MobileCard>Carregando prospecto...</MobileCard>
      </MobileRepPageFrame>
    );
  }

  return (
    <MobileRepPageFrame
      title="Editar Prospecto"
      subtitle="Atualize os dados do prospecto"
      desktopHref="/rep/prospects"
    >
      {error ? (
        <MobileCard>
          <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{error}</div>
        </MobileCard>
      ) : null}

      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 14 }}>
          Status
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          style={inputStyle(colors)}
        >
          <option value="PENDING">Pendente</option>
          <option value="RETURN">Voltar</option>
          <option value="NO_RETURN">Não voltar</option>
          <option value="CONVERTED">Convertido</option>
        </select>
      </MobileCard>

      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 14 }}>
          Dados principais
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <Label text="Nome do local *" colors={colors} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do local" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Nome fantasia" colors={colors} />
            <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Nome fantasia" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="CNPJ" colors={colors} />
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Responsável" colors={colors} />
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome do responsável" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Telefone" colors={colors} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="E-mail" colors={colors} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" style={inputStyle(colors)} />
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 14 }}>
          Endereço
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <Label text="CEP" colors={colors} />
            <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Rua" colors={colors} />
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Nome da rua" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Número" colors={colors} />
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Bairro" colors={colors} />
            <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bairro" style={inputStyle(colors)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 92px", gap: 12 }}>
            <div>
              <Label text="Cidade" colors={colors} />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" style={inputStyle(colors)} />
            </div>
            <div>
              <Label text="UF" colors={colors} />
              <input value={stateValue} onChange={(e) => setStateValue(e.target.value)} placeholder="UF" maxLength={2} style={inputStyle(colors)} />
            </div>
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 14 }}>
          Localização no mapa
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Label text="Latitude" colors={colors} />
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-27.1004" style={inputStyle(colors)} />
          </div>
          <div>
            <Label text="Longitude" colors={colors} />
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="-52.6152" style={inputStyle(colors)} />
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, marginBottom: 14 }}>
          Observações
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações gerais..."
          rows={4}
          style={{
            ...inputStyle(colors),
            height: "auto",
            padding: 14,
            resize: "vertical",
          }}
        />
      </MobileCard>

      <div style={{ display: "grid", gap: 10, padding: "0 0 24px" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            height: 48,
            borderRadius: 16,
            border: "none",
            background: saving ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            height: 48,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            color: colors.text,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </MobileRepPageFrame>
  );
}