"use client";

import { useCallback } from "react";

type GoogleAdSenseScriptProps = {
  readonly clientId: string;
  readonly onScriptMount?: (() => void) | undefined;
};

const googleAdSenseScriptUrl =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

export function GoogleAdSenseScript({
  clientId,
  onScriptMount,
}: GoogleAdSenseScriptProps) {
  const captureScript = useCallback(
    (element: HTMLScriptElement | null) => {
      if (element) {
        onScriptMount?.();
      }
    },
    [onScriptMount],
  );

  return (
    <script
      async
      crossOrigin="anonymous"
      ref={captureScript}
      src={`${googleAdSenseScriptUrl}?client=${clientId}`}
    />
  );
}
