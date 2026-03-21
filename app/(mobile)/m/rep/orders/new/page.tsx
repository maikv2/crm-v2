import { Suspense } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileRepOrderForm from "@/app/(crm)/components/mobile/mobile-rep-order-form";

function MobileRepOrdersNewContent() {
  return <MobileRepOrderForm />;
}

export default function Page() {
  return (
    <MobileRepPageFrame
      title="Novo pedido"
      subtitle="Fluxo nativo mobile do representante"
      desktopHref="/rep/orders/new"
    >
      <Suspense fallback={<div style={{ padding: 16 }}>Carregando...</div>}>
        <MobileRepOrdersNewContent />
      </Suspense>
    </MobileRepPageFrame>
  );
}