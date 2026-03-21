"use client";

import { Suspense } from "react";
import NewRepOrderPageContent from "./page-content";

function RepOrdersNewPageInner() {
  return <NewRepOrderPageContent />;
}

export default function RepOrdersNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <RepOrdersNewPageInner />
    </Suspense>
  );
}