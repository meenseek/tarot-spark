"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    onScriptMount?.();
  }, [onScriptMount]);

  return (
    <script
      async
      crossOrigin="anonymous"
      src={`${googleAdSenseScriptUrl}?client=${clientId}`}
    />
  );
}
