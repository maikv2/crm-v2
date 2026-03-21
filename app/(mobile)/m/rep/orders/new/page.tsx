"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import NewOrderPage from "@/app/(crm)/orders/new/page-content";

export default function MobileRepOrdersNewPage() {
  return (
    <MobileRepPageFrame
      title="Novo pedido"
      subtitle="Fluxo nativo mobile do representante"
      desktopHref="/rep/orders/new"
    >
      <NewOrderPage mode="REPRESENTATIVE" />
    </MobileRepPageFrame>
  );
}