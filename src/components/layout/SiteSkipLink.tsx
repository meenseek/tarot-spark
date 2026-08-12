"use client";

import { SkipLink } from "@measure-twice/react";

type SiteSkipLinkProps = {
  readonly label: string;
};

export function SiteSkipLink({ label }: SiteSkipLinkProps) {
  return (
    <SkipLink className="tarot-mt-skip-link" href="#site-main-content">
      {label}
    </SkipLink>
  );
}
