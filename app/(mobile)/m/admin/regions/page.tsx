"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

export default function RegionsMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [regions, setRegions] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/regions");
    const data = await res.json();

    setRegions(data || []);
  }

  return (
    <div
      style={{
        padding: 20,
        background: colors.pageBg,
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        Regiões
      </h1>

      <div style={{ display: "grid", gap: 10 }}>
        {regions.map((region) => (
          <div
            key={region.id}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 14,
              background: colors.cardBg,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              {region.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}