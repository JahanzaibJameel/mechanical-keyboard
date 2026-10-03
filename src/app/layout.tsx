import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const DESCRIPTION =
  "NØR 75 is a 75% wireless mechanical keyboard: 1000 Hz polling, 2.4 GHz wireless or USB-C wired, and a 4000 mAh battery, in a CNC aluminium case with PBT double-shot keycaps.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "NØR 75",
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "NØR 75",
    title: "NØR 75",
    description: DESCRIPTION,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "NØR 75 — a 75% wireless mechanical keyboard in obsidian aluminium with ash PBT keycaps",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NØR 75",
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

/**
 * Product structured data.
 *
 * NØR 75 is a fictional product with no price and no shop, so the offer carries
 * availability InStock with a price of 0 and a priceCurrency, which is what
 * Google requires for Product markup to validate. A real deployment replaces
 * this with the actual offer and adds aggregateRating or review only if genuine
 * ratings exist.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "NØR 75",
  description: DESCRIPTION,
  sku: "nor75",
  category: "Keyboard",
  brand: {
    "@type": "Brand",
    name: "NØR",
  },
  material: "CNC aluminium",
  color: "Obsidian",
  offers: {
    "@type": "Offer",
    url: `${SITE_URL}/`,
    priceCurrency: "USD",
    price: 0,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#080808] text-[#f5f5f5]">
        {/*
          JSON-LD is emitted in the body rather than the head because React only
          hoists elements it recognises; a script tag with an explicit type has
          to be placed where it will survive rendering. Crawlers read it from the
          served HTML regardless of position in the document.
        */}
        <script
          type="application/ld+json"
          // Content is a module constant, not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}