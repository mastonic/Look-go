import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import AdminShortcut from "@/components/AdminShortcut";
import AppNavigation from "@/components/AppNavigation";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Look&Go — Votre dressing. Votre style. Avant même de l'essayer.",
  description:
    "Look&Go vous aide à composer votre dressing, découvrir des looks personnalisés et visualiser des tenues sur vous avant de choisir.",
  metadataBase: new URL("https://look-go.vercel.app"),
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  applicationName: "Look&Go",
  icons: {
    icon: [
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Look&Go",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Look&Go — Votre dressing privé digital",
    description:
      "Découvrez les vêtements qui vous ressemblent, visualisez-les sur vous et composez votre dressing idéal.",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Look&Go — Votre dressing privé digital",
    description: "Votre dressing. Votre style. Avant même de l'essayer.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff9f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1715" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <PwaRegister />
        <PwaInstallPrompt />
        <AdminShortcut />
        <AppNavigation />
        {children}
      </body>
    </html>
  );
}
