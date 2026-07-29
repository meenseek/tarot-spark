import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/layout/GoogleAnalytics";
import { getTarotReadingMetadata } from "@/features/tarot-reading";
import { defaultLocale } from "@/i18n/config";
import { GoogleAdSense } from "@/integrations/google-adsense";
import "../globals.css";

export const metadata: Metadata = getTarotReadingMetadata(defaultLocale);

export default function RootHomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={defaultLocale}>
      <head>
        <GoogleAdSense />
      </head>
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
