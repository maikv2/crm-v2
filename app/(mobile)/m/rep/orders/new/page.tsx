"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import NewRepOrderPage from "@/app/(crm)/rep/orders/new/page";

export default function MobileRepOrdersNewPage() {
  return (
    <MobileRepPageFrame
      title="Novo pedido"
      subtitle="Fluxo do representante"
      desktopHref="/rep/orders/new"
    >
      <NewRepOrderPage />
    </MobileRepPageFrame>
  );
}