"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AuthResponse = {
  user?: {
    id: string;
    regionId?: string | null;
    role?: string;
  } | null;
};

type ProspectItem = {
  id: string;
  name?: string | null;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  contactName?: string | null;
};

export default function MobileRepProspectsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionId, setRegionId] = useState("");
  const [representativeId, setRepresentativeId] = useState("");
  const [items, setItems] = useState<ProspectItem[]>([]);

  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [city, setCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const authRes = await fetch("/api/auth/me", { cache: "no-store" });
    const authJson = (await authRes.json().catch(() => null)) as
      | AuthResponse
      | null;

    const user = authJson?.user;
    const nextRegionId = user?.regionId ?? "";
    const nextRepresentativeId = user?.id ?? "";

    setRegionId(nextRegionId);
    setRepresentativeId(nextRepresentativeId);

    const query = new URLSearchParams();
    if (nextRegionId) query.set("regionId", nextRegionId);
    if (nextRepresentativeId) query.set("representativeId", nextRepresentativeId);

    const res = await fetch(`/api/prospects?${query.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(json?.error || "Erro ao carregar prospectos.");
    }

    setItems(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        await load();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar prospectos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (!name.trim()) {
        setError("Informe o nome do prospecto.");
        return;
      }

      if (!regionId) {
        setError("Representante sem região vinculada.");
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
          phone: phone.trim() || null,
          contactName: contactName.trim() || null,
          city: city.trim() || null,
          state: stateValue.trim().toUpperCase() || null,
          notes: notes.trim() || null,
          regionId,
          representativeId: representativeId || null,
          status: "PENDING",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar prospecto.");
      }

      setName("");
      setTradeName("");
      setPhone("");
      setContactName("");
      setCity("");
      setStateValue("");
      setNotes("");

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar prospecto."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileRepPageFrame
      title="Prospectos"
      subtitle="Cadastro e acompanhamento de prospecções"
      desktopHref="/rep/prospects"
    >
      {loading ? (
        <MobileCard>Carregando prospectos...</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Novo prospecto" />

            <div style={{ display: "grid", gap: 12 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do prospecto"
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
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contato"
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
                  gridTemplateColumns: "1fr 92px",
                  gap: 12,
                }}
              >
                <input
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
                  value={stateValue}
                  onChange={(e) => setStateValue(e.target.value)}
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

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações"
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

              {error ? (
                <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
              ) : null}

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
                {saving ? "Salvando..." : "Salvar prospecto"}
              </button>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Lista de prospectos" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum prospecto encontrado.</div>
            ) : (
              items.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={item.tradeName?.trim() || item.name || "Prospecto"}
                  subtitle={`${item.city ?? "Sem cidade"}${
                    item.state ? `/${item.state}` : ""
                  } • ${item.status ?? "Sem status"}${
                    item.contactName ? ` • ${item.contactName}` : ""
                  }`}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}