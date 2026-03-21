"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MobileRepEntry() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/m/rep/orders");
  }, [router]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
      }}
    >
      Carregando...
    </div>
  );
}