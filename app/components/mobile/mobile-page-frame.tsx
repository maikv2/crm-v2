"use client";

import { usePathname } from "next/navigation";
import MobileShell, {
  type MobileNavItem,
} from "@/app/components/mobile/mobile-shell";
import {
  adminMobileNavItems,
  financeMobileNavItems,
} from "@/app/components/mobile/mobile-admin-shared";

export default function MobilePageFrame({
  title,
  subtitle,
  desktopHref,
  navItems,
  children,
}: {
  title: string;
  subtitle?: string;
  desktopHref?: string;
  navItems?: MobileNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isFinanceMobile =
    pathname.startsWith("/m/admin/finance") || pathname.startsWith("/m/finance");

  const resolvedNavItems =
    navItems ?? (isFinanceMobile ? financeMobileNavItems : adminMobileNavItems);

  return (
    <MobileShell
      title={title}
      subtitle={subtitle}
      navItems={resolvedNavItems}
      showBrand
      brandHref="/m/admin"
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