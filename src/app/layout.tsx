import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TripScout - Trip Planning PWA",
  description: "Plan, forecast, and track your trip expenses with TripScout. A modern, mobile-first Progressive Web App for all your travel planning needs.",
  keywords: ["trip planner", "travel budget", "expense tracker", "PWA", "road trip", "vacation planner"],
  authors: [{ name: "TripScout Team" }],
  manifest: "/mts/manifest.json",
  icons: {
    icon: [
      { url: "/mts/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/mts/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/mts/icons/apple-touch-icon.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [
      { url: "/mts/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TripScout",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "TripScout - Trip Planning PWA",
    description: "Plan, forecast, and track your trip expenses with TripScout",
    type: "website",
    siteName: "TripScout",
  },
  twitter: {
    card: "summary_large_image",
    title: "TripScout - Trip Planning PWA",
    description: "Plan, forecast, and track your trip expenses with TripScout",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#2e1065" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/mts/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}