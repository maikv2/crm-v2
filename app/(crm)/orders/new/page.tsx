"use client";

import { Suspense } from "react";
import NewOrderPage from "./page-content";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "40vh",
            fontWeight: 700,
          }}
        >
          Carregando pedido...
        </div>
      }
    >
      <NewOrderPage />
    </Suspense>
  );
}