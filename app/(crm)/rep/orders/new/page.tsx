"use client";

import { Suspense } from "react";
import NewOrderPage from "@/app/(crm)/orders/new/page-content";

function RepOrdersNewPageInner() {
  return <NewOrderPage mode="REPRESENTATIVE" />;
}

export default function RepOrdersNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <RepOrdersNewPageInner />
    </Suspense>
  );
}