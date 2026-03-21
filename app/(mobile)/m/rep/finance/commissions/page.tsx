"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";

export default function CommissionsPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/rep/finance/commissions")
      .then((r) => r.json())
      .then((d) => setData(d.items || []));
  }, []);

  return (
    <MobileRepPageFrame
      title="Comissões"
      subtitle="Financeiro da região"
      desktopHref="/rep/finance/commissions"
    >
      <div style={{ display: "grid", gap: 12 }}>
        {data.map((c) => (
          <MobileCard key={c.id} style={{ padding: 16 }}>
            <div style={{ fontWeight: 900 }}>
              Pedido #{c.orderNumber}
            </div>

            <div style={{ fontSize: 13 }}>
              Cliente: {c.clientName}
            </div>

            <div style={{ fontSize: 13 }}>
              Comissão: R$ {(c.commissionCents / 100).toFixed(2)}
            </div>
          </MobileCard>
        ))}
      </div>
    </MobileRepPageFrame>
  );
}