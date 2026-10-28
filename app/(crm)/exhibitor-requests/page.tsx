"use client";

import { Suspense } from "react";
import ExhibitorRequestsScreen from "../components/exhibitor-requests-screen";

export default function ExhibitorRequestsPage() {
  return (
    <Suspense fallback={null}>
      <ExhibitorRequestsScreen mode="admin" />
    </Suspense>
  );
}
