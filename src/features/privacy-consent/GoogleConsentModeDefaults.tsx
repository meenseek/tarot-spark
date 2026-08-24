const restrictedGoogleConsentRegions = [
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
] as const;

const consentModeDefaults = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
window.gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted'
});
window.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500,
  region: ${JSON.stringify(restrictedGoogleConsentRegions)}
});
window.gtag('set', 'ads_data_redaction', true);
`;

export function GoogleConsentModeDefaults() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: consentModeDefaults }}
      id="google-consent-mode-defaults"
    />
  );
}
