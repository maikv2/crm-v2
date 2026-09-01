"use client";

import { useParams } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import MobileExhibitorEditForm from "@/app/components/mobile/mobile-exhibitor-edit-form";

export default function MobileAdminExhibitorEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  return (
    <MobilePageFrame
      title="Editar expositor"
      subtitle="Atualizar informações do expositor"
      desktopHref={id ? `/exhibitors/${id}` : "/exhibitors"}
    >
      {id ? (
        <MobileExhibitorEditForm exhibitorId={id} variant="admin" />
      ) : null}
    </MobilePageFrame>
  );
}
