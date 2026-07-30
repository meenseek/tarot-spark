type GoogleAdSenseScriptProps = {
  readonly clientId: string;
};

const googleAdSenseScriptUrl =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

export function GoogleAdSenseScript({ clientId }: GoogleAdSenseScriptProps) {
  return (
    <script
      async
      crossOrigin="anonymous"
      src={`${googleAdSenseScriptUrl}?client=${clientId}`}
    />
  );
}
