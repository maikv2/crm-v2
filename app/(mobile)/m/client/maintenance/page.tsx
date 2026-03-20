"use client";

import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import PortalMaintenancePage from "@/app/portal/maintenance/page";

export default function MobileClientMaintenancePage() {
  return (
    <MobileClientPageFrame
      title="Solicitar manutenção"
      subtitle="Pedido de manutenção do cliente"
      desktopHref="/portal/maintenance"
    >
      <PortalMaintenancePage />
    </MobileClientPageFrame>
  );
}