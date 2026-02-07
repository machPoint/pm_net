import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Proxima Engineering CORE-SE | Take Control of Complexity in Systems Engineering",
  description: "Launching soon: CORE-SE by Proxima Engineering. An AI-enabled systems engineering workspace that integrates Jama Connect, Jira, Windchill, and Outlook. Manage requirements, traceability, and change impacts with confidence.",
  keywords: [
    "systems engineering",
    "Jama Connect integration",
    "Jira integration",
    "Windchill integration",
    "requirements management",
    "traceability",
    "change impact analysis",
    "AI systems engineering",
    "engineering workspace",
    "Outlook integration",
    "CORE-SE",
    "Proxima Engineering"
  ],
  authors: [{ name: "Proxima Engineering" }],
  openGraph: {
    title: "Proxima Engineering CORE-SE | Take Control of Complexity in Systems Engineering",
    description: "Launching soon: CORE-SE by Proxima Engineering. An AI-enabled systems engineering workspace that integrates Jama Connect, Jira, Windchill, and Outlook. Manage requirements, traceability, and change impacts with confidence.",
    type: "website",
    locale: "en_US",
    siteName: "CORE-SE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proxima Engineering CORE-SE | Take Control of Complexity",
    description: "AI-enabled systems engineering workspace integrating Jama Connect, Jira, Windchill, and Outlook. Launching soon.",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;200;300;400;500;600;700;800;900&display=swap" />
        <style>{`
        :root {
          --font-roboto: 'Roboto', sans-serif;
        }
      `}</style>
      </head>
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
