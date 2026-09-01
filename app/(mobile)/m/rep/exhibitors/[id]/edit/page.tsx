"use client";

import { useParams } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileExhibitorEditForm from "@/app/components/mobile/mobile-exhibitor-edit-form";

export default function MobileRepExhibitorEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  return (
    <MobileRepPageFrame
      title="Editar expositor"
      subtitle="Atualizar informações do expositor"
      desktopHref={id ? `/rep/exhibitors/${id}` : "/rep/exhibitors"}
    >
      {id ? <MobileExhibitorEditForm exhibitorId={id} variant="rep" /> : null}
    </MobileRepPageFrame>
  );
}
