"use client";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import MobileAdminClientForm from "@/app/components/mobile/mobile-admin-client-form";

export default function MobileAdminClientsNewPage() {
  return (
    <MobilePageFrame
      title="Novo cliente"
      subtitle="Cadastro nativo mobile do admin"
      desktopHref="/clients/new"
    >
      <MobileAdminClientForm />
    </MobilePageFrame>
  );
}