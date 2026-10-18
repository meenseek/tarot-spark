"use client";

import Script from "next/script";
import { GoogleAnalyticsEvents } from "./GoogleAnalyticsEvents";

type GoogleAnalyticsProps = {
  readonly allowedOrigin: string;
  readonly measurementId: string;
};

export function GoogleAnalytics({
  allowedOrigin,
  measurementId,
}: GoogleAnalyticsProps) {
  if (
    typeof window === "undefined" ||
    window.location.origin !== allowedOrigin
  ) {
    return null;
  }

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
