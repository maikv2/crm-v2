"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowLeft, Eye, EyeOff } from "lucide-react";

function formatPhoneBR(value: string) {
  const v = value.replace(/\D/g, "").slice(0, 11);
  if (!v) return "";
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return v.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (v.length <= 10) return v.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return v.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

export default function NewFinanceUserPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/finance/finance-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.replace(/\D/g, "") || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Erro ao criar usuário.");
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: "0 24px" }}>
      <button
        onClick={() => router.back()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#6b7280",
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 24,
          padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          padding: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserPlus size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
              Novo Usuário Financeiro
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              Acesso restrito ao módulo financeiro
            </div>
          </div>
        </div>

        {success && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#15803d",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Usuário criado com sucesso!
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              color: "#dc2626",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maria Financeiro"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              WhatsApp{" "}
              <span style={{ fontWeight: 400, color: "#9ca3af" }}>
                — para receber fechamentos de comissão
              </span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
              placeholder="(00) 00000-0000"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Senha *</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ ...inputStyle, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .15s ease",
            }}
          >
            {loading ? "Criando..." : "Criar Usuário Financeiro"}
          </button>
        </div>
      </div>
    </div>
  );
}
