import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
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
  metadataBase: new URL("https://look-and-go.tontonmasto.chatgpt.site"),
  alternates: { canonical: "/" },
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
    description:
      "Votre dressing. Votre style. Avant même de l'essayer.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f0e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
