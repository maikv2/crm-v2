"use client";

import { Suspense } from "react";
import NewOrderPageContent from "./page-content";

function OrdersNewPageInner() {
  return <NewOrderPageContent />;
}

export default function OrdersNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <OrdersNewPageInner />
    </Suspense>
  );
}