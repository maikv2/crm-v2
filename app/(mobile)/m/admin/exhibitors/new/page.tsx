"use client";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import MobileAdminExhibitorForm from "@/app/components/mobile/mobile-admin-exhibitor-form";

export default function MobileAdminExhibitorsNewPage() {
  return (
    <MobilePageFrame
      title="Novo expositor"
      subtitle="Cadastro nativo mobile do admin"
      desktopHref="/exhibitors/new"
    >
      <MobileAdminExhibitorForm />
    </MobilePageFrame>
  );
}