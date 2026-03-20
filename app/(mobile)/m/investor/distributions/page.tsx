"use client";

import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import MobileEmbeddedRoute from "@/app/components/mobile/mobile-embedded-route";

export default function MobileInvestorDistributionsPage() {
  return (
    <MobileInvestorPageFrame
      title="Distribuições"
      subtitle="Distribuições do investidor"
      desktopHref="/investor/distributions"
    >
      <MobileEmbeddedRoute
        src="/investor/distributions"
        title="Distribuições do investidor"
      />
    </MobileInvestorPageFrame>
  );
}