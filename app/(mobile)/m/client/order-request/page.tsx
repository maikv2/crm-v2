"use client";

import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import PortalOrderRequestPage from "@/app/portal/order-request/page";

export default function MobileClientOrderRequestPage() {
  return (
    <MobileClientPageFrame
      title="Fazer pedido"
      subtitle="Solicitação de pedido do cliente"
      desktopHref="/portal/order-request"
    >
      <PortalOrderRequestPage />
    </MobileClientPageFrame>
  );
}