"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RegionItem = {
  id: string;
  name: string;
  active: boolean;
  stockLocationId?: string | null;
  stockLocationName?: string | null;
};

type RepresentativeItem = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  pixKey?: string | null;
  pixName?: string | null;
  pixType?: string | null;
  active: boolean;
  regionId?: string | null;
  stockLocationId?: string | null;
  regionName?: string | null;
  stockLocationName?: string | null;
};

export default function EditRepresentativePage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const inputBg = colors.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = colors.isDark ? "#0e1728" : "#f8fafc";
  const warningBg = colors.isDark ? "rgba(245, 158, 11, 0.12)" : "#fff7ed";
  const warningBorder = colors.isDark
    ? "rgba(245, 158, 11, 0.28)"
    : "#fdba74";
  const successBg = colors.isDark ? "rgba(34, 197, 94, 0.10)" : "#f0fdf4";
  const successBorder = colors.isDark
    ? "rgba(34, 197, 94, 0.24)"
    : "#86efac";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regionId, setRegionId] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixName, setPixName] = useState("");
  const [pixType, setPixType] = useState("");

  const [regions, setRegions] = useState<RegionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === regionId) ?? null,
    [regions, regionId]
  );

  const selectedStockLocationName = selectedRegion?.stockLocationName ?? null;
  const regionHasStock = Boolean(selectedRegion?.stockLocationId);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [repsRes, regionsRes] = await Promise.all([
          fetch("/api/representatives", { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
        ]);

        if (!repsRes.ok) {
          throw new Error("Não foi possível carregar o representante.");
        }
        if (!regionsRes.ok) {
          throw new Error("Não foi possível carregar as regiões.");
        }

        const repsJson = await repsRes.json();
        const regionsJson = await regionsRes.json();

        if (!active) return;

        const items: RepresentativeItem[] = repsJson?.items ?? [];
        const found = items.find((r) => r.id === id);

        if (!found) {
          throw new Error("Representante não encontrado.");
        }

        setRegions(regionsJson?.items ?? []);
        setName(found.name ?? "");
        setEmail(found.email ?? "");
        setPhone(found.phone ?? "");
        setRegionId(found.regionId ?? "");
        setPixKey(found.pixKey ?? "");
        setPixName(found.pixName ?? "");
        setPixType(found.pixType ?? "");
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar representante."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) load();

    return () => {
      active = false;
    };
  }, [id]);

  async function saveAll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome do representante.");
      return;
    }

    if (!regionId) {
      setError("Selecione uma região.");
      return;
    }

    if (!regionHasStock) {
      setError(
        "A região selecionada não possui local de estoque. Vincule um estoque à região antes de salvar."
      );
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/representatives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: name.trim(),
          phone: phone.trim() || null,
          regionId,
          pixKey: pixKey.trim() || null,
          pixName: pixName.trim() || null,
          pixType: pixType.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar representante.");
      }

      router.push("/representatives");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar representante."
      );
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 13,
    color: colors.text,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: inputBg,
    color: colors.text,
    outline: "none",
    fontSize: 14,
  };

  const disabledInputStyle: React.CSSProperties = {
    ...inputStyle,
    background: subtleCard,
    color: colors.subtext,
    cursor: "not-allowed",
  };

  const cardStyle: React.CSSProperties = {
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 20,
    boxShadow: colors.isDark
      ? "0 10px 30px rgba(2,6,23,0.35)"
      : "0 8px 24px rgba(15,23,42,0.06)",
  };

  return (
    <div
      style={{
        padding: 24,
        color: colors.text,
        background: colors.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: colors.subtext,
          marginBottom: 10,
        }}
      >
        👤 / Representantes / Editar
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
              fontSize: 22,
              fontWeight: 900,
              color: colors.text,
            }}
          >
            Editar Representante
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: colors.subtext,
            }}
          >
            Atualize os dados do representante. O estoque é puxado
            automaticamente da região selecionada.
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/representatives")}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 10,
            background: colors.cardBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Voltar
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 18, color: colors.subtext, fontWeight: 700 }}>
          Carregando representante...
        </div>
      ) : (
        <form
          onSubmit={saveAll}
          style={{ display: "grid", gap: 18, maxWidth: 1100 }}
        >
          {error ? (
            <div
              style={{
                border: `1px solid ${
                  colors.isDark ? "rgba(248,113,113,0.35)" : "#fecaca"
                }`,
                background: colors.isDark
                  ? "rgba(127,29,29,0.25)"
                  : "#fef2f2",
                color: colors.isDark ? "#fecaca" : "#b91c1c",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}

          <div style={cardStyle}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Dados do Representante
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.3fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Telefone</label>
                <input
                  style={inputStyle}
                  placeholder="Ex: (49) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={labelStyle}>E-mail (não editável)</label>
                <input style={disabledInputStyle} value={email} disabled />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Região *</label>
                <select
                  style={inputStyle}
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                >
                  <option value="">Selecione uma região</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Local de estoque (definido pela região)
                </label>
                <input
                  style={disabledInputStyle}
                  value={selectedStockLocationName || "Selecione uma região"}
                  disabled
                />
              </div>
            </div>

            {selectedRegion && regionHasStock ? (
              <div
                style={{
                  marginTop: 14,
                  border: `1px solid ${successBorder}`,
                  background: successBg,
                  color: colors.text,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Estoque definido automaticamente pela região:{" "}
                {selectedStockLocationName}
              </div>
            ) : selectedRegion && !regionHasStock ? (
              <div
                style={{
                  marginTop: 14,
                  border: `1px solid ${warningBorder}`,
                  background: warningBg,
                  color: colors.text,
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                A região selecionada não possui local de estoque vinculado.
                Vincule um estoque na região antes de salvar.
              </div>
            ) : null}

            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  marginBottom: 12,
                }}
              >
                Dados Pix para Comissão
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>Nome do favorecido Pix</label>
                  <input
                    style={inputStyle}
                    placeholder="Ex: João da Silva"
                    value={pixName}
                    onChange={(e) => setPixName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Tipo da chave Pix</label>
                  <select
                    style={inputStyle}
                    value={pixType}
                    onChange={(e) => setPixType(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="CELULAR">Celular</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="ALEATORIA">Chave aleatória</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Chave Pix</label>
                  <input
                    style={inputStyle}
                    placeholder="Informe a chave Pix"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/representatives")}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 10,
                background: colors.cardBg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || !regionId || !regionHasStock}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 10,
                background: colors.primary,
                color: "white",
                border: "none",
                fontWeight: 700,
                cursor:
                  saving || !regionId || !regionHasStock
                    ? "not-allowed"
                    : "pointer",
                opacity: saving || !regionId || !regionHasStock ? 0.7 : 1,
              }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
