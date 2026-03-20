"use client";

import MapPage from "@/app/(crm)/map/page";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";

export default function MobileAdminMapPage() {
  return (
    <MobilePageFrame
      title="Mapa comercial"
      subtitle="Versão mobile usando o mapa real do CRM"
      desktopHref="/map"
    >
      <MapPage />
    </MobilePageFrame>
  );
}