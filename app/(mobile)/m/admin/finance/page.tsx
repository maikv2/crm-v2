"use client";

import { useRouter } from "next/navigation";

export default function MobileFinancePage() {
  const router = useRouter();

  const itemStyle = {
    padding: 16,
    borderBottom: "1px solid #eee",
    cursor: "pointer",
  };

  return (
    <div>
      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/receivables")}>
        Contas a receber
      </div>

      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/payables")}>
        Contas a pagar
      </div>

      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/region-cash")}>
        Caixa da região
      </div>

      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/transfers")}>
        Repasse da matriz
      </div>

      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/reports")}>
        Relatórios
      </div>

      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/investors")}>
        Investidores
      </div>

      <div style={itemStyle} onClick={() => router.push("/m/admin/finance/investor-distributions")}>
        Repasses investidores
      </div>
    </div>
  );
}