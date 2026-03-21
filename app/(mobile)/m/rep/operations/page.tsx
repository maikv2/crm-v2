"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";

export default function RepOperationsPage() {
  return (
    <MobileRepPageFrame
      title="Operações"
      subtitle="Central operacional"
      desktopHref="/rep"
    >
      <MobileCard style={{ padding: 16 }}>
        Central de operações da região.
      </MobileCard>
    </MobileRepPageFrame>
  );
}