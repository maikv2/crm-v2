"use client";

import { Suspense } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import NewRepOrderPageContent from "@/app/(crm)/rep/orders/new/page-content";

function MobileRepOrdersNewPageContent() {
  return (
    <MobileRepPageFrame
      title="Novo pedido"
      subtitle="Fluxo do representante"
      desktopHref="/rep/orders/new"
    >
      <NewRepOrderPageContent />
    </MobileRepPageFrame>
  );
}

export default function MobileRepOrdersNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Carregando...</div>}>
      <MobileRepOrdersNewPageContent />
    </Suspense>
  );
}