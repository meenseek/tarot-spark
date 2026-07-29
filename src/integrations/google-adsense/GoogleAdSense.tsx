import { getGoogleAdSenseClientId } from "./config";

const googleAdSenseScriptUrl =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

export function GoogleAdSense() {
  const clientId = getGoogleAdSenseClientId();

  if (!clientId) {
    return null;
  }

  return (
    <>
      <meta name="google-adsense-account" content={clientId} />
      <script
        async
        src={`${googleAdSenseScriptUrl}?client=${clientId}`}
        crossOrigin="anonymous"
      />
    </>
  );
}
