"use client";

import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import MobileEmbeddedRoute from "@/app/components/mobile/mobile-embedded-route";

export default function MobileInvestorQuotasPage() {
  return (
    <MobileInvestorPageFrame
      title="Minhas cotas"
      subtitle="Cotas do investidor"
      desktopHref="/investor/quotas"
    >
      <MobileEmbeddedRoute
        src="/investor/quotas"
        title="Cotas do investidor"
      />
    </MobileInvestorPageFrame>
  );
}