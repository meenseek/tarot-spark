import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import type { LocaleSwitchLink } from "@/components/layout/LocaleSwitch";
import type { Locale } from "@/i18n/config";

type LanguageSwitchProps = {
  readonly activeLocale: Locale;
  readonly ariaLabel: string;
  readonly links: readonly LocaleSwitchLink[];
  readonly onLocaleChange: (locale: Locale) => void;
};

export function LanguageSwitch({
  activeLocale,
  ariaLabel,
  links,
  onLocaleChange,
}: LanguageSwitchProps) {
  return (
    <LocaleSwitch
      activeLocale={activeLocale}
      ariaLabel={ariaLabel}
      links={links}
      onLocaleChange={onLocaleChange}
    />
  );
}
