"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useTheme } from "../providers/theme-provider";
import { getThemeColors } from "../../lib/theme";

// Assistente de IA flutuante (voz + texto). Fica disponivel em todas as
// telas do CRM para admin, financeiro e representantes. Toda consulta passa
// pelo servidor (/api/ai/assistant), que aplica as permissoes de cada perfil.

type Table = {
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string>[];
  footer?: Record<string, string>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  tables?: Table[];
  error?: boolean;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATIVE", "REPRESENTATIVE"];

const SUGGESTIONS = [
  "Quanto vendemos este mês?",
  "Vendas por produto no mês passado",
  "Clientes sem comprar há 60 dias",
  "Parcelas vencidas",
  "Me dê insights e dicas para vender mais",
];

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Markdown bem simples: **negrito**, listas com "-" e quebras de linha.
function renderText(text: string) {
  const html = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .split("\n")
    .map((line) => (/^\s*[-•]\s+/.test(line) ? `• ${line.replace(/^\s*[-•]\s+/, "")}` : line))
    .join("<br/>");
  return { __html: html };
}

function plainText(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[-•]\s+/gm, "");
}

function downloadCsv(table: Table) {
  const cols = table.columns;
  const lines = [cols.map((c) => c.label)];
  for (const row of table.rows) lines.push(cols.map((c) => row[c.key] ?? ""));
  if (table.footer) lines.push(cols.map((c) => table.footer?.[c.key] ?? ""));
  const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${table.title.replace(/[^\w\-]+/g, "_").slice(0, 60) || "relatorio"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AiAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const mobile = pathname?.startsWith("/m/") ?? false;

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active) setEnabled(ALLOWED_ROLES.includes(json?.user?.role));
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    setSpeechSupported(Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
    try {
      setSpeakReplies(localStorage.getItem("v2_ai_speak") === "1");
    } catch {
      /* noop */
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!speakReplies || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(plainText(text));
      utter.lang = "pt-BR";
      window.speechSynthesis.speak(utter);
    },
    [speakReplies]
  );

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || loading) return;
      setInput("");
      setOpen(true);

      const next: ChatMessage[] = [...messagesRef.current, { role: "user", content: text }];
      setMessages(next);
      setLoading(true);

      try {
        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname,
            messages: next
              .filter((m) => !m.error)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.reply) {
          setMessages((cur) => [
            ...cur,
            { role: "assistant", content: json?.error || "Não foi possível falar com o assistente.", error: true },
          ]);
          return;
        }

        setMessages((cur) => [...cur, { role: "assistant", content: json.reply, tables: json.tables ?? [] }]);
        speak(json.reply);
        if (json.navigate && typeof json.navigate === "string" && json.navigate.startsWith("/")) {
          router.push(json.navigate);
        }
      } catch {
        setMessages((cur) => [
          ...cur,
          { role: "assistant", content: "Sem conexão com o servidor. Tente de novo.", error: true },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, pathname, router, speak]
  );

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR || loading) return;
    window.speechSynthesis?.cancel();

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMessages((cur) => [
          ...cur,
          { role: "assistant", content: "Permita o uso do microfone no navegador para usar comandos de voz.", error: true },
        ]);
      }
    };
    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (finalText.trim()) send(finalText);
    };

    recognitionRef.current = rec;
    setOpen(true);
    setInput("");
    setListening(true);
    rec.start();
  }, [loading, send]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  function toggleSpeak() {
    setSpeakReplies((cur) => {
      const next = !cur;
      try {
        localStorage.setItem("v2_ai_speak", next ? "1" : "0");
      } catch {
        /* noop */
      }
      if (!next) window.speechSynthesis?.cancel();
      return next;
    });
  }

  if (!enabled) return null;

  const fabBottom = mobile ? 92 : 24;
  const panelWidth = mobile ? "calc(100vw - 24px)" : 440;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Assistente V2 (IA)"
          aria-label="Abrir assistente de IA"
          style={{
            position: "fixed",
            right: mobile ? 14 : 24,
            bottom: fabBottom,
            zIndex: 1000,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: 0,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#fff",
            boxShadow: "0 10px 28px rgba(37,99,235,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Sparkles size={24} />
        </button>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label="Assistente V2"
          style={{
            position: "fixed",
            right: 12,
            bottom: mobile ? 84 : 20,
            zIndex: 1000,
            width: panelWidth,
            maxWidth: "calc(100vw - 24px)",
            height: mobile ? "min(72vh, 620px)" : "min(78vh, 680px)",
            background: colors.cardBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderBottom: `1px solid ${colors.border}`,
              background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.10))",
            }}
          >
            <Sparkles size={18} color="#7c3aed" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Assistente V2</div>
              <div style={{ fontSize: 11, color: colors.subtext }}>Fale ou digite: relatórios, clientes, telas, dicas</div>
            </div>
            <button
              type="button"
              onClick={toggleSpeak}
              title={speakReplies ? "Não ler respostas em voz alta" : "Ler respostas em voz alta"}
              style={iconButton(colors)}
            >
              {speakReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                recognitionRef.current?.abort();
                window.speechSynthesis?.cancel();
              }}
              title="Fechar"
              style={iconButton(colors)}
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext, lineHeight: 1.5 }}>
                <div style={{ marginBottom: 10 }}>
                  Toque no microfone e fale, por exemplo: <em>“relatório de vendas por região de setembro”</em>,{" "}
                  <em>“procura o cliente Casa Castro”</em> ou <em>“abre contas a receber”</em>.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      style={{
                        border: `1px solid ${colors.border}`,
                        background: colors.hoverBg,
                        color: colors.text,
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "stretch", gap: 8 }}>
                <div
                  style={{
                    maxWidth: m.role === "user" ? "85%" : "100%",
                    padding: "9px 12px",
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.45,
                    background: m.role === "user" ? "#2563eb" : m.error ? "rgba(239,68,68,0.12)" : colors.hoverBg,
                    color: m.role === "user" ? "#fff" : m.error ? "#ef4444" : colors.text,
                  }}
                  dangerouslySetInnerHTML={renderText(m.content)}
                />
                {m.tables?.map((t, ti) => (
                  <ReportTable key={ti} table={t} colors={colors} />
                ))}
              </div>
            ))}

            {loading ? <div style={{ fontSize: 13, color: colors.subtext }}>Consultando o sistema…</div> : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={{ display: "flex", gap: 8, padding: 10, borderTop: `1px solid ${colors.border}` }}
          >
            {speechSupported ? (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                title={listening ? "Parar de ouvir" : "Falar"}
                aria-label={listening ? "Parar de ouvir" : "Falar comando de voz"}
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 12,
                  border: 0,
                  background: listening ? "#ef4444" : "#7c3aed",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                  animation: listening ? "v2-ai-pulse 1.2s ease-in-out infinite" : undefined,
                }}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            ) : null}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Ouvindo…" : "Pergunte ou peça algo…"}
              maxLength={2000}
              style={{
                flex: 1,
                minWidth: 0,
                height: 44,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.inputBg,
                color: colors.text,
                padding: "0 12px",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 12,
                border: 0,
                background: "#2563eb",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              <Send size={17} />
            </button>
          </form>
          <style>{`@keyframes v2-ai-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }`}</style>
        </div>
      ) : null}
    </>
  );
}

function ReportTable({ table, colors }: { table: Table; colors: ReturnType<typeof getThemeColors> }) {
  const visible = table.rows.slice(0, 50);
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: colors.hoverBg }}>
        <div style={{ flex: 1, fontSize: 12, fontWeight: 800 }}>{table.title}</div>
        <button
          type="button"
          onClick={() => downloadCsv(table)}
          title="Baixar planilha (CSV)"
          style={{ ...iconButton(colors), width: "auto", padding: "0 8px", gap: 4, fontSize: 11, fontWeight: 700 }}
        >
          <Download size={13} /> CSV
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th
                  key={c.key}
                  style={{
                    textAlign: c.align ?? "left",
                    padding: "6px 8px",
                    color: colors.subtext,
                    fontWeight: 700,
                    borderBottom: `1px solid ${colors.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={ri}>
                {table.columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      textAlign: c.align ?? "left",
                      padding: "6px 8px",
                      borderBottom: `1px solid ${colors.border}`,
                      whiteSpace: c.align === "right" ? "nowrap" : undefined,
                    }}
                  >
                    {row[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
            {table.footer ? (
              <tr>
                {table.columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? "left", padding: "6px 8px", fontWeight: 800, whiteSpace: "nowrap" }}>
                    {table.footer?.[c.key] ?? ""}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {table.rows.length > visible.length ? (
        <div style={{ fontSize: 11, color: colors.subtext, padding: "6px 10px" }}>
          Mostrando {visible.length} de {table.rows.length} linhas - baixe o CSV para ver tudo.
        </div>
      ) : null}
    </div>
  );
}

function iconButton(colors: ReturnType<typeof getThemeColors>) {
  return {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  } as const;
}
