import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/contexts/QueryProvider";
import ToastContainer from "@/components/ui/ToastContainer";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "TAP — Plateforme de recrutement IA au Maroc",
  description:
    "TAP analyse, forme et évalue les candidats grâce à l'IA avant de les connecter aux entreprises. Des talents préparés, prêts à recruter.",
  keywords: [
    "recrutement",
    "IA",
    "employabilité",
    "talents",
    "Maroc",
    "HR Tech",
    "plateforme",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/images/logo.png",
  },
  metadataBase: new URL("https://tap-hr.com"),
  openGraph: {
    title: "TAP — Plateforme de recrutement IA au Maroc",
    description:
      "Des profils analysés, formés et évalués par l'IA. Recrutez mieux, plus vite.",
    url: "https://tap-hr.com",
    siteName: "TAP",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/images/bgaccueil.jpg", width: 1200, height: 630, alt: "TAP — Recrutement IA au Maroc" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TAP — Recrutement intelligent par IA",
    description:
      "La plateforme qui transforme des profils en talents prêts à embaucher.",
    images: ["/images/bgaccueil.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
.reveal{opacity:0;transform:translateY(25px);transition:opacity .6s cubic-bezier(.25,.1,.25,1),transform .6s cubic-bezier(.25,.1,.25,1)}
.reveal.revealed{opacity:1;transform:translateY(0)}
.reveal-left{opacity:0;transform:translateX(-30px);transition:opacity .6s cubic-bezier(.25,.1,.25,1),transform .6s cubic-bezier(.25,.1,.25,1)}
.reveal-left.revealed{opacity:1;transform:translateX(0)}
.reveal-right{opacity:0;transform:translateX(30px);transition:opacity .6s cubic-bezier(.25,.1,.25,1),transform .6s cubic-bezier(.25,.1,.25,1)}
.reveal-right.revealed{opacity:1;transform:translateX(0)}
.reveal-scale{opacity:0;transform:scale(.95);transition:opacity .7s cubic-bezier(.25,.1,.25,1),transform .7s cubic-bezier(.25,.1,.25,1)}
.reveal-scale.revealed{opacity:1;transform:scale(1)}
.reveal-fade{opacity:0;transition:opacity .6s cubic-bezier(.25,.1,.25,1)}
.reveal-fade.revealed{opacity:1}
.reveal-scale-x{transform:scaleX(0);transition:transform .6s cubic-bezier(.25,.1,.25,1) .3s}
.reveal-scale-x.revealed{transform:scaleX(1)}
.reveal-stagger>.reveal-item{opacity:0;transform:translateY(25px);transition:opacity .5s cubic-bezier(.25,.1,.25,1),transform .5s cubic-bezier(.25,.1,.25,1)}
.reveal-stagger.revealed>.reveal-item{opacity:1;transform:translateY(0)}
.reveal-stagger.revealed>.reveal-item:nth-child(1){transition-delay:.1s}
.reveal-stagger.revealed>.reveal-item:nth-child(2){transition-delay:.18s}
.reveal-stagger.revealed>.reveal-item:nth-child(3){transition-delay:.26s}
.reveal-stagger.revealed>.reveal-item:nth-child(4){transition-delay:.34s}
.reveal-stagger.revealed>.reveal-item:nth-child(5){transition-delay:.42s}
.reveal-stagger.revealed>.reveal-item:nth-child(6){transition-delay:.5s}
` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "TAP - Talent Acceleration Platform",
              url: "https://tap-hr.com",
              logo: "https://tap-hr.com/images/logo.svg",
              description:
                "Plateforme de recrutement IA au Maroc qui analyse, forme et connecte les candidats aux entreprises.",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Immeuble STAVROULA, Gueliz",
                addressLocality: "Marrakech",
                addressCountry: "MA",
              },
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+212776868163",
                email: "tap@entrepreneursmorocco.com",
                contactType: "customer service",
                availableLanguage: ["French", "Arabic"],
              },
              sameAs: [
                "https://www.linkedin.com/company/tap-ai",
              ],
            }),
          }}
        />
      </head>
      <body className={`${dmSans.variable} antialiased relative`}>
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
