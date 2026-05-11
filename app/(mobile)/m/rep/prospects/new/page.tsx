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

export default function MobileRepNewProspectPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [repRegionId, setRepRegionId] = useState("");
  const [repId, setRepId] = useState("");

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

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
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
      const response = await fetch(`/api/cep/${cleanCep}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Não foi possível consultar o CEP.");
      if (data.street && !street) setStreet(data.street);
      if (data.district && !district) setDistrict(data.district);
      if (data.city && !city) setCity(data.city);
      if (data.state && !stateValue) setStateValue(String(data.state).toUpperCase());
      setLastFetchedCep(cleanCep);
      setCepFeedback({ type: "success", text: "Endereço preenchido pelo CEP." });
    } catch (err: any) {
      setCepFeedback({ type: "error", text: err?.message || "Erro ao consultar CEP." });
    } finally {
      setCepLoading(false);
    }
  }

  useEffect(() => {
    const cleanCep = digitsOnly(cep);
    if (cleanCep.length !== 8) return;
    if (cleanCep === lastFetchedCep) return;
    const timer = setTimeout(() => fetchCEPData(cleanCep), 600);
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
          router.push("/login?redirect=/m/rep/prospects/new");
          return;
        }
        if (json?.user?.role !== "REPRESENTATIVE") {
          router.push("/m/rep/prospects");
          return;
        }
        if (!active) return;
        setRepRegionId(json?.user?.regionId ?? "");
        setRepId(json?.user?.id ?? "");
      } catch {
        if (active) setError("Erro ao validar usuário.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [router]);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Informe o nome do prospecto.");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/prospects", {
        method: "POST",
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
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          notes: notes.trim() || null,
          status: "PENDING",
          regionId: repRegionId || null,
          representativeId: repId || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar prospecto.");
      router.push("/m/rep/prospects");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar prospecto.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
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

  return (
    <MobileRepPageFrame
      title="Novo prospecto"
      subtitle="Cadastro de prospecto"
      desktopHref="/prospects/new"
    >
      {loading ? (
        <MobileCard>Carregando...</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Dados principais" />
            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do local *"
                style={inputStyle}
              />
              <input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Nome fantasia"
                style={inputStyle}
              />
              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="CNPJ"
                style={inputStyle}
              />
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Responsável"
                style={inputStyle}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefone"
                style={inputStyle}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
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
                <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 600, marginTop: -6 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 12 }}>
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
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Localização no mapa" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Latitude"
                inputMode="decimal"
                style={inputStyle}
              />
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Longitude"
                inputMode="decimal"
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

          {error ? (
            <MobileCard>
              <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{error}</div>
            </MobileCard>
          ) : null}

          <div style={{ display: "grid", gap: 10, paddingBottom: 24 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                height: 48,
                borderRadius: 16,
                border: "none",
                background: saving ? "#93c5fd" : colors.primary,
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Salvando..." : "Salvar prospecto"}
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
        </>
      )}
    </MobileRepPageFrame>
  );
}
