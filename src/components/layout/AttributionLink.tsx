"use client";

import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ComponentProps } from "react";
import {
  getReadingAttributionFromUrl,
  shareCampaignIds,
  shareSourceIds,
} from "@/features/tarot-reading/reading-state";

type AttributionLinkProps = Omit<
  Pick<ComponentProps<typeof NextLink>, keyof ComponentProps<"a">>,
  "href"
> & {
  readonly href: string;
};

const attributionKeys = [
  "source",
  "campaign",
  "utm_source",
  "utm_campaign",
  "utm_medium",
] as const;
const localOrigin = "https://tarot-spark.local";

export function AttributionLink({
  href,
  onClick,
  ...props
}: AttributionLinkProps) {
  const [query, setQuery] = useState("");
  const attributedHref = getAttributionHref(href, query);
  return (
    <>
      <NextLink
        {...props}
        data-attribution-href={href}
        href={attributedHref}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;

          const freshHref = getAttributionHref(
            href,
            window.location.search.slice(1),
          );
          event.currentTarget.setAttribute("href", freshHref);
          const target = event.currentTarget.getAttribute("target");
          if (
            freshHref !== attributedHref &&
            event.button === 0 &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            (!target || target === "_self") &&
            !event.currentTarget.hasAttribute("download")
          ) {
            event.preventDefault();
            window.location.assign(freshHref);
          }
        }}
        // The early bootstrap intentionally updates href before hydration.
        suppressHydrationWarning
      />
      <Suspense fallback={null}>
        <CurrentAttribution onChange={setQuery} />
      </Suspense>
    </>
  );
}

function CurrentAttribution({
  onChange,
}: {
  readonly onChange: (query: string) => void;
}) {
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  useEffect(() => onChange(query), [onChange, query]);
  return null;
}

function getAttributionHref(href: string, query: string) {
  const attribution = getReadingAttributionFromUrl(`${localOrigin}/?${query}`);
  if (!attribution || !href.startsWith("/") || href.startsWith("//")) {
    return href;
  }

  const target = new URL(href, localOrigin);
  if (
    target.origin !== localOrigin ||
    attributionKeys.some((key) => target.searchParams.has(key))
  ) {
    return href;
  }

  target.searchParams.set("source", attribution.sourceId);
  target.searchParams.set("campaign", attribution.campaignId);
  return `${target.pathname}${target.search}${target.hash}`;
}

// Static pages expose native anchors before the Next client is ready.
// Keep this boundary independent of optional analytics and browser storage.
const attributionNavigationScript = `(() => {
  const sources = ${JSON.stringify(shareSourceIds)};
  const campaigns = ${JSON.stringify(shareCampaignIds)};
  const keys = ${JSON.stringify(attributionKeys)};
  const origin = ${JSON.stringify(localOrigin)};
  function preserveAttribution(event) {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[data-attribution-href]');
    if (!(link instanceof HTMLAnchorElement)) return;
    const href = link.getAttribute('data-attribution-href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    const target = new URL(href, origin);
    if (target.origin !== origin || keys.some(key => target.searchParams.has(key))) return;
    const params = new URL(window.location.href).searchParams;
    const explicit = params.has('source') || params.has('campaign');
    const source = params.getAll(explicit ? 'source' : 'utm_source');
    const campaign = params.getAll(explicit ? 'campaign' : 'utm_campaign');
    if (source.length === 1 && campaign.length === 1 &&
        sources.includes(source[0]) && campaigns.includes(campaign[0])) {
      target.searchParams.set('source', source[0]);
      target.searchParams.set('campaign', campaign[0]);
    }
    link.setAttribute('href', target.pathname + target.search + target.hash);
  }
  for (const type of ['click', 'auxclick', 'contextmenu']) {
    document.addEventListener(type, preserveAttribution, true);
  }
})();`;

export function AttributionNavigationScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: attributionNavigationScript }}
      id="attribution-navigation"
    />
  );
}
