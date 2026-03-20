"use client";

import { Suspense } from "react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import MobileAdminOrderForm from "@/app/components/mobile/mobile-admin-order-form";

export default function MobileAdminOrdersNewPage() {
  return (
    <MobilePageFrame
      title="Novo pedido"
      subtitle="Fluxo nativo mobile do admin"
      desktopHref="/orders/new"
    >
      <Suspense fallback={<div style={{ padding: 16 }}>Carregando...</div>}>
        <MobileAdminOrderForm />
      </Suspense>
    </MobilePageFrame>
  );
}