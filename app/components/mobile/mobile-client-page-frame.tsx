"use client";

import MobileShell from "@/app/components/mobile/mobile-shell";
import { clientMobileNavItems } from "@/app/components/mobile/mobile-client-shared";

export default function MobileClientPageFrame({
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
      navItems={clientMobileNavItems}
      showBrand
      brandHref="/m/client"
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