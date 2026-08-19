"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileAdminClientForm from "@/app/components/mobile/mobile-admin-client-form";

export default function MobileRepNewClientPage() {
  return (
    <MobileRepPageFrame
      title="Novo cliente"
      subtitle="Cadastro completo do vendedor"
      desktopHref="/clients/new"
    >
      <MobileAdminClientForm
        access="representative"
        listHref="/m/rep/clients"
        loginRedirect="/m/rep/clients/new"
        unauthorizedHref="/m/rep"
      />
    </MobileRepPageFrame>
  );
}
