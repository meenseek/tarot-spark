import type { Metadata } from "next";
import { OptionalGoogleServices } from "@/features/privacy-consent";
import { getTarotReadingMetadata } from "@/features/tarot-reading";
import { defaultLocale } from "@/i18n/config";
import { GoogleAdSenseAccountMetadata } from "@/integrations/google-adsense";
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
        <GoogleAdSenseAccountMetadata />
      </head>
      <body>
        <OptionalGoogleServices locale={defaultLocale}>
          {children}
        </OptionalGoogleServices>
      </body>
    </html>
  );
}
