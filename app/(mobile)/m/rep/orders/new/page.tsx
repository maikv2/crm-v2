"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import NewRepOrderPageContent from "@/app/(crm)/rep/orders/new/page-content";

export default function MobileRepOrdersNewPage() {
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