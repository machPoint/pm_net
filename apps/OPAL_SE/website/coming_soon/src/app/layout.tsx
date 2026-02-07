import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";

export const metadata: Metadata = {
  title: "MachPoint AI | The Memory Layer for Autonomous Intelligence",
  description: "Build and own persistent AI infrastructure with MachPoint — the memory layer powering continuous intelligence, auditability, and control.",
  keywords: [
    "AI infrastructure",
    "persistent AI memory",
    "enterprise AI",
    "autonomous systems",
    "AI data platform",
    "AI process intelligence",
    "continuous memory",
    "AI auditability",
    "AI for business",
    "AI control layer",
    "durable AI architecture",
    "private AI deployment",
    "MCP server",
    "AI observability",
    "AI orchestration layer"
  ],
  authors: [{ name: "MachPoint" }],
  creator: "MachPoint",
  publisher: "MachPoint",
  robots: "index, follow",
  openGraph: {
    title: "MachPoint AI | The Memory Layer for Autonomous Intelligence",
    description: "Persistent, identity-driven AI infrastructure for enterprises. Durable, compliant, and built for scale.",
    url: "https://machpoint.io",
    siteName: "MachPoint",
    images: [
      {
        url: "https://machpoint.io/social-preview.png",
        width: 1200,
        height: 630,
        alt: "MachPoint AI - The Memory Layer for Autonomous Intelligence"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "MachPoint AI | The Memory Layer for Autonomous Intelligence",
    description: "Build and own persistent AI infrastructure — continuous memory, auditability, control.",
    images: ["https://machpoint.io/social-preview.png"],
    creator: "@machpoint"
  },
  metadataBase: new URL("https://machpoint.io"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.ico",
        color: "#ff6600"
      }
    ]
  },
  manifest: "/site.webmanifest"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        {children}
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
