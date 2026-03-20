"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import RepVisitPage from "@/app/(crm)/rep/visit/page";

export default function MobileRepVisitPage() {
  return (
    <MobileRepPageFrame
      title="Registrar visita"
      subtitle="Fluxo do representante"
      desktopHref="/rep/visit"
    >
      <RepVisitPage />
    </MobileRepPageFrame>
  );
}