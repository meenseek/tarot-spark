export type PublicPageLink = {
  readonly href: string;
  readonly label: string;
};

export type PublicPageSection = {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly items?: readonly string[];
  readonly ordered?: boolean;
};

export type PublicPageCta = {
  readonly heading: string;
  readonly body: string;
  readonly href: string;
  readonly label: string;
};

export type PublicPageRelated = {
  readonly heading: string;
  readonly links: readonly PublicPageLink[];
};

export type PublicPageContent = {
  readonly title: string;
  readonly intro: string;
  readonly sections: readonly PublicPageSection[];
  readonly disclaimer?: string;
  readonly cta?: PublicPageCta;
  readonly related?: PublicPageRelated;
};
