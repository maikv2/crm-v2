"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RepMobileHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/m/rep/orders");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        color: "#111827",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      Carregando área do representante...
    </div>
  );
}