"use client";

import { Suspense } from "react";
import MobileRepVisitPageContent from "./visit-page-content";

export default function MobileRepVisitPage() {
  return (
    <Suspense fallback={<div>Carregando visita...</div>}>
      <MobileRepVisitPageContent />
    </Suspense>
  );
}