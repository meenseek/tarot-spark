import { getGoogleAdSenseClientId } from "./config";

export function GoogleAdSenseAccountMetadata() {
  const clientId = getGoogleAdSenseClientId();

  if (!clientId) {
    return null;
  }

  return <meta name="google-adsense-account" content={clientId} />;
}
