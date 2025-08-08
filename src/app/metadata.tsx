import React from 'react';
import Head from 'next/head';

export default function SiteMetadata() {
  return (
    <Head>
      <title>TherapyAI</title>
      <meta name="description" content="AI-powered therapy to help couples build stronger, healthier relationships" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      <meta name="theme-color" content="#3b82f6" />
      <meta name="application-name" content="TherapyAI" />
      
      {/* DNS prefetch and preconnect */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Preload critical assets */}
      <link rel="preload" href="/images/home/happy-couple.webp" as="image" fetchPriority="high" />
      <link rel="preload" href="/images/home/happy-family.webp" as="image" fetchPriority="high" />
      <link rel="preload" href="/images/therapyType/couple.webp" as="image" />
      <link rel="preload" href="/images/therapyType/family.webp" as="image" />
      <link rel="preload" href="/images/therapyType/solo.webp" as="image" />
      <link rel="preload" href="/images/therapyType/mental_health.webp" as="image" />
      <link rel="preload" href="/fonts/DS-DIGI.TTF" as="font" type="font/ttf" crossOrigin="anonymous" fetchPriority="high" />
      <link rel="preload" href="/fonts/DS-DIGIB.TTF" as="font" type="font/ttf" crossOrigin="anonymous" fetchPriority="high" />
      
      {/* Favicons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" href="/favicons/favicon-16x16.webp" sizes="16x16" type="image/png" />
      <link rel="icon" href="/favicons/favicon-32x32.webp" sizes="32x32" type="image/png" />
      <link rel="apple-touch-icon" href="/favicons/apple-touch-icon.webp" sizes="180x180" type="image/png" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3b82f6" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content="https://therapyai.com" />
      <meta property="og:title" content="TherapyAI" />
      <meta property="og:description" content="AI-powered therapy to help couples build stronger, healthier relationships" />
      <meta property="og:site_name" content="TherapyAI" />
      <meta property="og:image" content="/images/home/happy-couple.webp" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="TherapyAI - AI-powered therapy" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="TherapyAI" />
      <meta name="twitter:description" content="AI-powered therapy to help couples build stronger, healthier relationships" />
      <meta name="twitter:image" content="/images/home/happy-couple.webp" />
    </Head>
  );
}