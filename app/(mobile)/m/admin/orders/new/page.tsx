"use client";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import MobileAdminOrderForm from "@/app/components/mobile/mobile-admin-order-form";

export default function MobileAdminOrdersNewPage() {
  return (
    <MobilePageFrame
      title="Novo pedido"
      subtitle="Fluxo nativo mobile do admin"
      desktopHref="/orders/new"
    >
      <MobileAdminOrderForm />
    </MobilePageFrame>
  );
}