import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Look&Go — Personal Shopper IA",
    short_name: "Look&Go",
    description: "Votre Personal Shopper IA, dressing digital et essayage virtuel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fff9f1",
    theme_color: "#111111",
    categories: ["shopping", "lifestyle"],
    lang: "fr-FR",
    icons: [
      {
        src: "/lookgo-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/lookgo-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
