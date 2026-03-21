"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";

export default function RepVisitPage() {
  return (
    <MobileRepPageFrame
      title="Registrar visita"
      subtitle="Agenda comercial"
      desktopHref="/rep/visit"
    >
      <MobileCard style={{ padding: 16 }}>
        Registro de visitas da região.
      </MobileCard>
    </MobileRepPageFrame>
  );
}