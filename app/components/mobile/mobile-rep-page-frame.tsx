"use client";

import MobileShell from "@/app/components/mobile/mobile-shell";
import { repMobileNavItems } from "@/app/components/mobile/mobile-rep-shared";

export default function MobileRepPageFrame({
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
      navItems={repMobileNavItems}
      showBrand
      brandHref="/m/rep"
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