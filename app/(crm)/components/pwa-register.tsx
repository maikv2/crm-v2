"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [showBanner, setShowBanner] = useState(false);
  const [worker, setWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Verifica se já tem um SW esperando (update já baixado)
        if (reg.waiting) {
          setWorker(reg.waiting);
          setShowBanner(true);
        }

        // Detecta quando um novo SW termina de instalar e fica "waiting"
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Novo SW instalado e pronto — mostra o banner
              setWorker(newWorker);
              setShowBanner(true);
            }
          });
        });

        // Quando o SW assume o controle, recarrega a página
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

      } catch (error) {
        console.error("Erro ao registrar service worker:", error);
      }
    }

    register();

    // Verifica por atualizações a cada 60 segundos (útil para apps que ficam abertos o dia todo)
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration("/").then((reg) => {
        reg?.update();
      });
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  function handleUpdate() {
    if (!worker) return;
    // Manda o SW novo assumir o controle imediatamente
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  function handleDismiss() {
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#1e293b",
        color: "#f8fafc",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.32)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        minWidth: 300,
        maxWidth: "calc(100vw - 32px)",
        fontFamily: "inherit",
        fontSize: 14,
        animation: "pwa-slide-up 0.3s ease",
      }}
    >
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Ícone */}
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔄</span>

      {/* Texto */}
      <div style={{ flex: 1, lineHeight: 1.4 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>
          Nova versão disponível
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          Clique em atualizar para carregar as novidades.
        </div>
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "1px solid #334155",
            color: "#94a3b8",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          Agora não
        </button>
        <button
          onClick={handleUpdate}
          style={{
            background: "#2563eb",
            border: "none",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
          }}
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
