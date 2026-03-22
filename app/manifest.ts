import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRM V2",
    short_name: "V2",
    description: "Sistema CRM V2",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#2563eb",
    theme_color: "#2563eb",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}