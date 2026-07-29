import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import {
  getLocalePath,
  localeNames,
  supportedLocales,
  type Locale,
} from "@/i18n/config";

type LanguageSwitchProps = {
  readonly activeLocale: Locale;
  readonly ariaLabel: string;
};

export function LanguageSwitch({
  activeLocale,
  ariaLabel,
}: LanguageSwitchProps) {
  return (
    <LocaleSwitch
      activeLocale={activeLocale}
      ariaLabel={ariaLabel}
      links={supportedLocales.map((locale) => ({
        href: getLocalePath(locale),
        label: localeNames[locale],
        locale,
      }))}
    />
  );
}
