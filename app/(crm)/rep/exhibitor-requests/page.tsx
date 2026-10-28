"use client";

import { Suspense } from "react";
import ExhibitorRequestsScreen from "../../components/exhibitor-requests-screen";

export default function RepresentativeExhibitorRequestsPage() {
  return (
    <Suspense fallback={null}>
      <ExhibitorRequestsScreen mode="representative" />
    </Suspense>
  );
}
