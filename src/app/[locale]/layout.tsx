import { notFound } from "next/navigation";
import {
  GoogleConsentModeDefaults,
  OptionalGoogleServices,
} from "@/features/privacy-consent";
import { isPrefixedLocale } from "@/i18n/config";
import { GoogleAdSenseAccountMetadata } from "@/integrations/google-adsense";
import "@measure-twice/react/styles.css";
import "../globals.css";

type LocaleRootLayoutProps = {
  readonly children: React.ReactNode;
  readonly params: Promise<{
    readonly locale: string;
  }>;
};

export default async function LocaleRootLayout({
  children,
  params,
}: LocaleRootLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return (
    <html lang={rawLocale}>
      <head>
        <GoogleConsentModeDefaults />
        <GoogleAdSenseAccountMetadata />
      </head>
      <body>
        <OptionalGoogleServices locale={rawLocale}>
          {children}
        </OptionalGoogleServices>
      </body>
    </html>
  );
}
