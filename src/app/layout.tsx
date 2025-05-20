// src/app/layout.tsx
import { ReactNode } from "react";
import { ClientProviders } from "@/components/ClientComponents";

import "./globals.css";
import "./menu-styles.css";
import "./fonts.css";

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3b82f6',
};

export const metadata = {
  title: "TherapyAI",
  description: "AI-powered therapy to help couples build stronger, healthier relationships",
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  applicationName: "TherapyAI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TherapyAI",
  },
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
    url: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://therapyai.com",
    title: "TherapyAI",
    description: "AI-powered therapy to help couples build stronger, healthier relationships",
    siteName: "TherapyAI",
    images: [
      {
        url: "/images/home/happy-couple.jpg",
        width: 1200,
        height: 630,
        alt: "TherapyAI - AI-powered therapy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TherapyAI",
    description: "AI-powered therapy to help couples build stronger, healthier relationships",
    images: ["/images/home/happy-couple.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#3b82f6",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

// Next.js App Router layout
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth bg-gray-900">
      <body className="min-h-screen w-full overflow-x-hidden bg-gray-900">
        <ClientProviders>
          <main className="overflow-x-hidden w-full min-h-screen">
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}