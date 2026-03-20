"use client";

import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import PortalVisitPage from "@/app/portal/visit/page";

export default function MobileClientVisitPage() {
  return (
    <MobileClientPageFrame
      title="Solicitar visita"
      subtitle="Pedido de visita do cliente"
      desktopHref="/portal/visit"
    >
      <PortalVisitPage />
    </MobileClientPageFrame>
  );
}