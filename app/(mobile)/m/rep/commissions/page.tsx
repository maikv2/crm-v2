"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

export default function RepCommissionsMobile() {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/rep/commissions");
      const json = await res.json();

      setCommissions(json || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileRepPageFrame
      title="Comissões"
      subtitle="Comissões do representante"
    >
      {loading ? (
        <MobileCard>Carregando comissões...</MobileCard>
      ) : (
        <MobileCard>
          {commissions.length === 0 && (
            <div>Nenhuma comissão encontrada.</div>
          )}

          {commissions.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <div>{c.description || "Comissão"}</div>
              <div>{formatMoneyBR(c.amountCents)}</div>
            </div>
          ))}
        </MobileCard>
      )}
    </MobileRepPageFrame>
  );
}