"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileRepOrderForm from "@/app/(crm)/components/mobile/mobile-rep-order-form";

export default function MobileRepOrdersNewPage() {
  return (
    <MobileRepPageFrame
      title="Novo pedido"
      subtitle="Fluxo nativo mobile do representante"
      desktopHref="/rep/orders/new"
    >
      <MobileRepOrderForm />
    </MobileRepPageFrame>
  );
}