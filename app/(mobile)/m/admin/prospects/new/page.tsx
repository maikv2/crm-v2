"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RegionItem = {
  id: string;
  name: string;
};

type RepresentativeItem = {
  id: string;
  name: string;
  email: string;
  regionId?: string | null;
  regionName?: string | null;
};

type ProspectStatus = "PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED";

export default function MobileAdminProspectsNewPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [representatives, setRepresentatives] = useState<RepresentativeItem[]>([]);

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
  const [status, setStatus] = useState<ProspectStatus>("PENDING");
  const [regionId, setRegionId] = useState("");
  const [representativeId, setRepresentativeId] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [regionsRes, repsRes] = await Promise.all([
          fetch("/api/regions", { cache: "no-store" }),
          fetch("/api/representatives", { cache: "no-store" }),
        ]);

        const regionsJson = await regionsRes.json().catch(() => null);
        const repsJson = await repsRes.json().catch(() => null);

        if (!regionsRes.ok) {
          throw new Error(regionsJson?.error || "Erro ao carregar regiões.");
        }

        if (!repsRes.ok) {
          throw new Error(
            repsJson?.error || "Erro ao carregar representantes."
          );
        }

        if (active) {
          const regionItems = Array.isArray(regionsJson?.items)
            ? regionsJson.items
                .filter((item: any) => item?.active)
                .map((item: any) => ({
                  id: item.id,
                  name: item.name,
                }))
            : [];

          const repItems = Array.isArray(repsJson?.items)
            ? repsJson.items
                .filter((item: any) => item?.active)
                .map((item: any) => ({
                  id: item.id,
                  name: item.name,
                  email: item.email,
                  regionId: item.regionId ?? null,
                  regionName: item.regionName ?? null,
                }))
            : [];

          setRegions(regionItems);
          setRepresentatives(repItems);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar formulário."
          );
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

  const filteredRepresentatives = useMemo(() => {
    if (!regionId) return representatives;
    return representatives.filter((item) => item.regionId === regionId);
  }, [representatives, regionId]);

  useEffect(() => {
    if (!representativeId) return;

    const exists = filteredRepresentatives.some(
      (item) => item.id === representativeId
    );

    if (!exists) {
      setRepresentativeId("");
    }
  }, [filteredRepresentatives, representativeId]);

  function inputStyle(multiline = false): React.CSSProperties {
    return {
      width: "100%",
      minHeight: multiline ? 110 : 46,
      height: multiline ? undefined : 46,
      borderRadius: 14,
      border: `1px solid ${colors.border}`,
      background: colors.inputBg,
      color: colors.text,
      padding: multiline ? "12px 14px" : "0 14px",
      outline: "none",
      fontSize: 14,
      resize: multiline ? "vertical" : "none",
    };
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (!name.trim()) {
        setError("Informe o nome do prospecto.");
        return;
      }

      if (!regionId) {
        setError("Selecione a região.");
        return;
      }

      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar prospecto.");
      }

      router.replace("/m/admin/prospects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar prospecto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobilePageFrame
      title="Novo prospecto"
      subtitle="Cadastro mobile de prospectos"
      desktopHref="/prospects"
    >
      {loading ? (
        <MobileCard>Carregando formulário...</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Dados principais" />

            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do prospecto"
                style={inputStyle()}
              />

              <input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="Nome fantasia"
                style={inputStyle()}
              />

              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contato"
                style={inputStyle()}
              />

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telefone"
                style={inputStyle()}
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                style={inputStyle()}
              />

              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="CNPJ"
                style={inputStyle()}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Localização" />

            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="CEP"
                style={inputStyle()}
              />

              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Rua"
                style={inputStyle()}
              />

              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Número"
                style={inputStyle()}
              />

              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Bairro"
                style={inputStyle()}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 92px",
                  gap: 12,
                }}
              >
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  style={inputStyle()}
                />

                <input
                  value={stateValue}
                  onChange={(e) => setStateValue(e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                  style={inputStyle()}
                />
              </div>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Vínculo comercial" />

            <div style={{ display: "grid", gap: 12 }}>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                style={inputStyle()}
              >
                <option value="">Selecione a região</option>
                {regions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={representativeId}
                onChange={(e) => setRepresentativeId(e.target.value)}
                style={inputStyle()}
              >
                <option value="">Sem representante</option>
                {filteredRepresentatives.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProspectStatus)}
                style={inputStyle()}
              >
                <option value="PENDING">Pendente</option>
                <option value="RETURN">Voltar</option>
                <option value="NO_RETURN">Não voltar</option>
                <option value="CONVERTED">Convertido</option>
              </select>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Observações" />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações gerais"
              style={inputStyle(true)}
            />
          </MobileCard>

          {error ? <MobileCard>{error}</MobileCard> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 16,
              border: "none",
              background: colors.primary,
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 900,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar prospecto"}
          </button>
        </>
      )}
    </MobilePageFrame>
  );
}