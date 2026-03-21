"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  mode?: "ADMIN" | "REPRESENTATIVE";
};

function PageContent({ mode }: Props) {
  const searchParams = useSearchParams();

  const clientId = searchParams.get("clientId");
  const exhibitorId = searchParams.get("exhibitorId");

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>
        Novo Pedido {mode === "REPRESENTATIVE" ? "(Representante)" : "(Admin)"}
      </h1>

      <div style={{ marginTop: 20 }}>
        <div>Client ID: {clientId ?? "-"}</div>
        <div>Exhibitor ID: {exhibitorId ?? "-"}</div>
      </div>

      {/* aqui continua todo o restante do seu formulário */}
    </div>
  );
}

export default function NewOrderPage(props: Props) {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Carregando...</div>}>
      <PageContent {...props} />
    </Suspense>
  );
}