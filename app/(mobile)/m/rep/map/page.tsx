"use client";

import RepresentativeMapPage from "@/app/(crm)/rep/map/page";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";

export default function MobileRepMapPage() {
  return (
    <MobileRepPageFrame
      title="Mapa comercial"
      subtitle="Mapa real do CRM com clientes e prospectos da região"
      desktopHref="/rep/map"
    >
      <RepresentativeMapPage />
    </MobileRepPageFrame>
  );
}