"use client";

import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import PortalOrdersPage from "@/app/portal/orders/page";

export default function MobileClientOrdersPage() {
  return (
    <MobileClientPageFrame
      title="Meus pedidos"
      subtitle="Histórico de pedidos do cliente"
      desktopHref="/portal/orders"
    >
      <PortalOrdersPage />
    </MobileClientPageFrame>
  );
}