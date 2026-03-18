"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type InvestorItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
};

type InvestorsResponse = {
  items: InvestorItem[];
};

export default function InvestorAccessPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [items, setItems] = useState<InvestorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [investorId, setInvestorId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/investors", {
        cache: "no-store",
      });

      const json = (await res.json()) as InvestorsResponse;

      if (!res.ok) {
        throw new Error("Erro ao carregar investidores.");
      }

      setItems(
        (json.items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          email: item.email,
          phone: item.phone,
          document: item.document,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar investidores."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return items;

    return items.filter((item) => {
      const haystack = [
        item.name,
        item.email,
        item.phone,
        item.document,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [items, search]);

  function selectInvestor(item: InvestorItem) {
    setInvestorId(item.id);
    setEmail(item.email ?? "");
    setPassword("");
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/investors/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          investorId,
          email,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao salvar acesso.");
      }

      setSuccess("Senha do investidor salva com sucesso.");
      setPassword("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar acesso.");
    } finally {
      setSaving(false);
    }
  }

  const selectedInvestor = items.find((item) => item.id === investorId) ?? null;

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "100vh",
        width: "100%",
        padding: 24,
      }}
    >
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
              color: muted,
              marginBottom: 10,
            }}
          >
            🔐 / Investidores / Acesso
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Acesso do Investidor
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Defina e atualize e-mail e senha dos investidores já cadastrados.
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/investors")}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: cardBg,
            color: theme.text,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Voltar
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Investidores
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou documento..."
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: cardBg,
              color: theme.text,
              padding: "0 12px",
              outline: "none",
              marginBottom: 14,
            }}
          />

          {loading ? (
            <div style={{ color: muted }}>Carregando investidores...</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ color: muted }}>Nenhum investidor encontrado.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filteredItems.map((item) => {
                const active = investorId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectInvestor(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: `1px solid ${active ? "#2563eb" : border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: active
                        ? theme.isDark
                          ? "#172036"
                          : "#eff6ff"
                        : cardBg,
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      {item.email || "Sem e-mail"}{" "}
                      {item.phone ? `• ${item.phone}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            Definir acesso
          </div>

          {!selectedInvestor ? (
            <div style={{ color: muted }}>
              Selecione um investidor na lista ao lado.
            </div>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  Investidor
                </div>
                <div
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: theme.isDark ? "#111827" : "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{selectedInvestor.name}</div>
                  <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                    {selectedInvestor.document || "Sem documento"}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  E-mail de acesso
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite o e-mail do investidor"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    color: theme.text,
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                  Senha
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${border}`,
                    background: cardBg,
                    color: theme.text,
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              {error ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                  }}
                >
                  {error}
                </div>
              ) : null}

              {success ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #22c55e",
                    color: "#22c55e",
                  }}
                >
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Salvando..." : "Salvar acesso"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}