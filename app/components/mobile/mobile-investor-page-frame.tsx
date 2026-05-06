"use client";

import MobileShell from "@/app/components/mobile/mobile-shell";
import { investorMobileNavItems } from "@/app/components/mobile/mobile-investor-shared";

export default function MobileInvestorPageFrame({
  title,
  subtitle,
  desktopHref,
  children,
}: {
  title: string;
  subtitle?: string;
  desktopHref?: string;
  children: React.ReactNode;
}) {
  return (
    <MobileShell
      title={title}
      subtitle={subtitle}
      navItems={investorMobileNavItems}
      showBrand
      brandHref="/m/investor"
    >
      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {children}
      </div>
    </MobileShell>
  );
}