import Script from "next/script";
import { GoogleAnalyticsEvents } from "./GoogleAnalyticsEvents";

type GoogleAnalyticsProps = {
  readonly measurementId: string;
};

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <GoogleAnalyticsEvents measurementId={measurementId} />
    </>
  );
}
