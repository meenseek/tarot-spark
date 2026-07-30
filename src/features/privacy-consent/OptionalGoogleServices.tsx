import type { Locale } from "@/i18n/config";
import { getGoogleAdSenseClientId } from "@/integrations/google-adsense/config";
import { PrivacyConsent } from "./PrivacyConsent";
import { getPrivacyConsentCopy } from "./i18n";

type OptionalGoogleServicesProps = {
  readonly children: React.ReactNode;
  readonly locale: Locale;
};

export function OptionalGoogleServices({
  children,
  locale,
}: OptionalGoogleServicesProps) {
  return (
    <PrivacyConsent
      advertisingClientId={getGoogleAdSenseClientId() ?? undefined}
      analyticsMeasurementId={getGoogleAnalyticsMeasurementId()}
      copy={getPrivacyConsentCopy(locale)}
    >
      {children}
    </PrivacyConsent>
  );
}

function getGoogleAnalyticsMeasurementId() {
  const measurementId = process.env["NEXT_PUBLIC_GA_ID"]?.trim();

  if (!measurementId || !/^G-[A-Z0-9]+$/i.test(measurementId)) {
    return undefined;
  }

  return measurementId;
}
