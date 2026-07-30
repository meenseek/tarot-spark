import "server-only";

import type { Locale } from "@/i18n/config";
import enCopy from "@/messages/en/privacy-consent.json";
import koCopy from "@/messages/ko/privacy-consent.json";

export type PrivacyConsentCopy = {
  readonly heading: string;
  readonly body: string;
  readonly analyticsLabel: string;
  readonly analyticsDescription: string;
  readonly advertisingLabel: string;
  readonly advertisingDescription: string;
  readonly saveChoices: string;
  readonly rejectOptional: string;
  readonly settingsButton: string;
};

const copyByLocale = {
  en: enCopy,
  ko: koCopy,
} satisfies Record<Locale, PrivacyConsentCopy>;

export function getPrivacyConsentCopy(locale: Locale): PrivacyConsentCopy {
  return copyByLocale[locale];
}
