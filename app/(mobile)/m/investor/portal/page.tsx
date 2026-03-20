"use client";

import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import MobileEmbeddedRoute from "@/app/components/mobile/mobile-embedded-route";

export default function MobileInvestorPortalPage() {
  return (
    <MobileInvestorPageFrame
      title="Portal"
      subtitle="Portal completo do investidor"
      desktopHref="/investor"
    >
      <MobileEmbeddedRoute
        src="/investor"
        title="Portal do investidor"
      />
    </MobileInvestorPageFrame>
  );
}