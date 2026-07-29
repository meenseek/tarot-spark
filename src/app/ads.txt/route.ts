import { getGoogleAdSensePublisherId } from "@/integrations/google-adsense/config";

const googleSellerDomain = "google.com";
const googleCertificationAuthorityId = "f08c47fec0942fa0";

export const dynamic = "force-static";

export function GET() {
  const publisherId = getGoogleAdSensePublisherId();

  if (!publisherId) {
    return new Response("Not found\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(
    `${googleSellerDomain}, ${publisherId}, DIRECT, ${googleCertificationAuthorityId}\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
