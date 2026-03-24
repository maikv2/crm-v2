"use client";

import { Suspense } from "react";
import MobileAdminOrderForm from "@/app/components/mobile/mobile-admin-order-form";
import MobileRepOrderForm from "@/app/(crm)/components/mobile/mobile-rep-order-form";

type Props = {
  mode?: "ADMIN" | "REPRESENTATIVE";
};

function PageContent({ mode = "ADMIN" }: Props) {
  if (mode === "REPRESENTATIVE") {
    return <MobileRepOrderForm />;
  }

  return <MobileAdminOrderForm />;
}

export default function NewOrderPage(props: Props) {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Carregando...</div>}>
      <PageContent {...props} />
    </Suspense>
  );
}