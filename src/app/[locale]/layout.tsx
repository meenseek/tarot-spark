import { notFound } from "next/navigation";
import { GoogleAnalytics } from "@/components/layout/GoogleAnalytics";
import { isPrefixedLocale } from "@/i18n/config";
import { GoogleAdSense } from "@/integrations/google-adsense";
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
        <GoogleAdSense />
      </head>
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
