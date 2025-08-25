// src/app/layout.tsx
import { ReactNode } from "react";
import { ClientProviders } from "@/components/shared/ClientComponents";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// Run VAPI startup check on server
if (typeof window === 'undefined') {
  import('@/lib/vapi/vapi-startup-check');
}

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
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
        url: "/images/home/happy-couple.webp",
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
    images: ["/images/home/happy-couple.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicons/favicon-16x16.webp", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.webp", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicons/apple-touch-icon.webp", sizes: "180x180", type: "image/png" },
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
      <body className="w-full overflow-x-hidden bg-gray-900">
        <ErrorBoundary level="page" resetOnPropsChange>
          <ClientProviders>
            <main className="overflow-x-hidden w-full">
              <ErrorBoundary level="section">
                {children}
              </ErrorBoundary>
            </main>
          </ClientProviders>
        </ErrorBoundary>
        <div id="modal-root"></div>
      </body>
    </html>
  );
}