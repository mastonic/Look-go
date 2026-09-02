import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Look&Go — Le Dressing Privé IA",
    short_name: "Look&Go",
    description: "Votre dressing privé IA : looks personnalisés, dressing numérique, Try-On, défilés et Pack Mariage.",
    start_url: "/profil?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0d1715",
    theme_color: "#0d1715",
    categories: ["shopping", "lifestyle", "fashion"],
    lang: "fr-FR",
    icons: [
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mon espace", short_name: "Profil", url: "/profil", icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Mon dressing", short_name: "Dressing", url: "/dressing", icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Créer un look", short_name: "Look IA", url: "/inscription/analyse", icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Pack Mariage", short_name: "Mariage", url: "/mariage", icons: [{ src: "/pwa-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    prefer_related_applications: false,
  };
}
