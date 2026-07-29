import "server-only";

const googleAdSenseClientIdPattern = /^ca-pub-(\d{16})$/;

export function getGoogleAdSenseClientId(): string | null {
  const clientId = process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"]?.trim();

  if (!clientId || !googleAdSenseClientIdPattern.test(clientId)) {
    return null;
  }

  return clientId;
}

export function getGoogleAdSensePublisherId(): string | null {
  const clientId = getGoogleAdSenseClientId();

  return clientId ? clientId.slice(3) : null;
}
