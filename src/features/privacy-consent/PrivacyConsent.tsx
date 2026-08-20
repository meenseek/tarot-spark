"use client";

import { Button, Checkbox } from "@measure-twice/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { interactiveFocusClassName } from "@/components/visual/class-names";
import { GoogleAnalytics } from "@/components/layout/GoogleAnalytics";
import {
  privacySettingsButtonId,
  PrivacySettingsProvider,
} from "@/components/layout/PrivacySettingsControl";
import { GoogleAdSenseScript } from "@/integrations/google-adsense/GoogleAdSenseScript";
import { optionalServicesDocumentReloadEvent } from "./events";
import type { PrivacyConsentCopy } from "./i18n";
import { isAdvertisingEligiblePathname } from "./route-policy";

const consentStorageKey = "tarot-spark.optional-services-consent";
const failClosedSessionStorageKey = "tarot-spark.optional-services-fail-closed";
const failClosedCookieName = "tarot_spark_optional_services_fail_closed";
const failClosedCookieMaxAgeSeconds = 30 * 24 * 60 * 60;

type ConsentPreferences = {
  readonly analytics: boolean;
  readonly advertising: boolean;
};

type ConsentWriteResult = "stored" | "cleared" | "failed";
type FailClosedCarrier = "session-storage" | "cookie";

type PrivacyConsentProps = {
  readonly analyticsMeasurementId?: string | undefined;
  readonly advertisingClientId?: string | undefined;
  readonly children: React.ReactNode;
  readonly copy: PrivacyConsentCopy;
  readonly reloadDocument?: (() => void) | undefined;
};

export function PrivacyConsent({
  analyticsMeasurementId,
  advertisingClientId,
  children,
  copy,
  reloadDocument = reloadPage,
}: PrivacyConsentProps) {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<
    ConsentPreferences | null | undefined
  >();
  const [analyticsSelected, setAnalyticsSelected] = useState(false);
  const [advertisingSelected, setAdvertisingSelected] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasLoadedAdvertising, setHasLoadedAdvertising] = useState(false);
  const [hasStorageError, setHasStorageError] = useState(false);
  const [mustBlockNavigation, setMustBlockNavigation] = useState(false);
  const [storageFailurePathname, setStorageFailurePathname] = useState<
    string | null
  >(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusEditingPanelRef = useRef(false);
  const shouldRestoreSettingsFocusRef = useRef(false);
  const mustReloadAfterStorageFailureRef = useRef(false);
  const failClosedCarriersRef = useRef<readonly FailClosedCarrier[]>([]);
  const isReloadingRef = useRef(false);
  const hasAnalytics = Boolean(analyticsMeasurementId);
  const hasAdvertising = Boolean(advertisingClientId);
  const isAdvertisingEligibleRoute = isAdvertisingEligiblePathname(pathname);
  const shouldLoadAdvertising = Boolean(
    preferences?.advertising &&
    advertisingClientId &&
    isAdvertisingEligibleRoute,
  );
  const mustReloadBeforeAdvertisingExcludedRoute =
    !hasStorageError && !isAdvertisingEligibleRoute && hasLoadedAdvertising;
  const markAdvertisingLoaded = useCallback(() => {
    setHasLoadedAdvertising(true);
  }, []);
  const reloadForConsentChange = useCallback(() => {
    if (isReloadingRef.current) {
      return;
    }

    isReloadingRef.current = true;
    dispatchBeforeDocumentReload();
    reloadDocument();
  }, [reloadDocument]);

  useEffect(() => {
    const failClosedCarriers = readFailClosedCarriers();
    const storedPreferences =
      failClosedCarriers.length > 0 ? null : readConsentPreferences();
    let shouldHydrate = true;

    failClosedCarriersRef.current = failClosedCarriers;

    queueMicrotask(() => {
      if (!shouldHydrate) {
        return;
      }

      setPreferences(storedPreferences);
      setAnalyticsSelected(storedPreferences?.analytics ?? false);
      setAdvertisingSelected(storedPreferences?.advertising ?? false);

      if (failClosedCarriers.length > 0) {
        setHasStorageError(true);
        setIsEditing(true);
      }
    });

    return () => {
      shouldHydrate = false;
    };
  }, []);

  useEffect(() => {
    if (mustReloadBeforeAdvertisingExcludedRoute) {
      reloadForConsentChange();
    }
  }, [mustReloadBeforeAdvertisingExcludedRoute, reloadForConsentChange]);

  useEffect(() => {
    if (!mustBlockNavigation) {
      return;
    }

    const preventSameOriginLink = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a[href]");

      if (link instanceof HTMLAnchorElement && isSameOriginUrl(link.href)) {
        event.preventDefault();
      }
    };
    const preventSameOriginForm = (event: SubmitEvent) => {
      const form = event.target;

      if (
        form instanceof HTMLFormElement &&
        isSameOriginUrl(form.action || window.location.href)
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener("click", preventSameOriginLink, true);
    document.addEventListener("submit", preventSameOriginForm, true);

    return () => {
      document.removeEventListener("click", preventSameOriginLink, true);
      document.removeEventListener("submit", preventSameOriginForm, true);
    };
  }, [mustBlockNavigation]);

  useEffect(() => {
    if (!isEditing || !shouldFocusEditingPanelRef.current) {
      return;
    }

    shouldFocusEditingPanelRef.current = false;
    panelHeadingRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !preferences || !shouldRestoreSettingsFocusRef.current) {
      return;
    }

    shouldRestoreSettingsFocusRef.current = false;
    document.getElementById(privacySettingsButtonId)?.focus();
  }, [isEditing, preferences]);

  if (!hasAnalytics && !hasAdvertising) {
    return children;
  }

  if (mustReloadBeforeAdvertisingExcludedRoute) {
    return null;
  }

  function savePreferences(nextPreferences: ConsentPreferences) {
    const hadActiveAnalytics = preferences?.analytics === true;
    const hadActiveAdvertising = Boolean(
      preferences?.advertising && hasLoadedAdvertising,
    );
    const shouldReload =
      (hadActiveAnalytics && !nextPreferences.analytics) ||
      (hadActiveAdvertising && !nextPreferences.advertising);

    if (hadActiveAnalytics && !nextPreferences.analytics) {
      disableGoogleAnalytics(analyticsMeasurementId);
    }

    const writeResult = writeConsentPreferences(nextPreferences);

    if (writeResult !== "stored") {
      if (hadActiveAnalytics) {
        disableGoogleAnalytics(analyticsMeasurementId);
      }

      setPreferences({ analytics: false, advertising: false });
      setAnalyticsSelected(false);
      setAdvertisingSelected(false);
      setHasStorageError(true);
      setIsEditing(true);
      shouldRestoreSettingsFocusRef.current = false;

      if (
        writeResult === "cleared" &&
        (hadActiveAnalytics || hadActiveAdvertising)
      ) {
        reloadForConsentChange();
        return;
      }

      if (
        writeResult === "failed" &&
        (hadActiveAnalytics || hadActiveAdvertising)
      ) {
        const failClosedCarrier = storeFailClosedOverride();

        if (failClosedCarrier) {
          failClosedCarriersRef.current = [failClosedCarrier];
          reloadForConsentChange();
          return;
        }

        mustReloadAfterStorageFailureRef.current = true;

        if (hadActiveAdvertising) {
          setStorageFailurePathname(pathname);
          setMustBlockNavigation(true);
        }
      }

      return;
    }

    if (
      hasStorageError &&
      !clearFailClosedOverride(failClosedCarriersRef.current)
    ) {
      setPreferences({ analytics: false, advertising: false });
      setAnalyticsSelected(false);
      setAdvertisingSelected(false);
      setIsEditing(true);
      shouldRestoreSettingsFocusRef.current = false;
      return;
    }

    setPreferences(nextPreferences);
    setAnalyticsSelected(nextPreferences.analytics);
    setAdvertisingSelected(nextPreferences.advertising);
    setHasStorageError(false);
    const mustReloadAfterStorageFailure =
      mustReloadAfterStorageFailureRef.current;
    mustReloadAfterStorageFailureRef.current = false;
    failClosedCarriersRef.current = [];
    setStorageFailurePathname(null);
    setMustBlockNavigation(false);
    shouldRestoreSettingsFocusRef.current =
      isEditing && !shouldReload && !mustReloadAfterStorageFailure;
    setIsEditing(false);

    if (shouldReload || mustReloadAfterStorageFailure) {
      reloadForConsentChange();
    }
  }

  const shouldShowChoices = preferences === null || isEditing;
  const mustWithholdChildrenForStorageFailure =
    mustBlockNavigation &&
    storageFailurePathname !== null &&
    pathname !== storageFailurePathname;

  return (
    <PrivacySettingsProvider
      value={{
        isVisible: preferences !== undefined && !shouldShowChoices,
        label: copy.settingsButton,
        onOpen: () => {
          shouldFocusEditingPanelRef.current = true;
          setIsEditing(true);
        },
      }}
    >
      {!mustWithholdChildrenForStorageFailure && children}
      {preferences?.analytics && analyticsMeasurementId && (
        <GoogleAnalytics measurementId={analyticsMeasurementId} />
      )}
      {shouldLoadAdvertising && advertisingClientId && (
        <GoogleAdSenseScript
          clientId={advertisingClientId}
          onScriptMount={markAdvertisingLoaded}
        />
      )}

      {preferences !== undefined &&
        (shouldShowChoices ? (
          <section
            aria-labelledby="privacy-consent-heading"
            className="fixed inset-x-4 bottom-4 z-50 mx-auto grid max-w-2xl gap-4 rounded-ts-panel border-2 border-ts-border bg-ts-surface p-5 shadow-ts-paper"
          >
            <div className="grid gap-2">
              <h2
                className={`${interactiveFocusClassName} text-lg font-semibold text-ts-ink`}
                id="privacy-consent-heading"
                ref={panelHeadingRef}
                tabIndex={-1}
              >
                {copy.heading}
              </h2>
              <p className="text-sm leading-6 text-ts-muted">{copy.body}</p>
              {hasStorageError && (
                <p className="text-sm font-medium text-ts-ink" role="alert">
                  {copy.storageError}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {hasAnalytics && (
                <Checkbox
                  announceError={false}
                  appearance="card"
                  checked={analyticsSelected}
                  description={copy.analyticsDescription}
                  label={copy.analyticsLabel}
                  onChange={(event) =>
                    setAnalyticsSelected(event.currentTarget.checked)
                  }
                  wrapperClassName="ts-privacy-option"
                />
              )}
              {hasAdvertising && (
                <Checkbox
                  announceError={false}
                  appearance="card"
                  checked={advertisingSelected}
                  description={copy.advertisingDescription}
                  label={copy.advertisingLabel}
                  onChange={(event) =>
                    setAdvertisingSelected(event.currentTarget.checked)
                  }
                  wrapperClassName="ts-privacy-option"
                />
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="ts-secondary-action"
                onClick={() =>
                  savePreferences({
                    analytics: hasAnalytics && analyticsSelected,
                    advertising: hasAdvertising && advertisingSelected,
                  })
                }
                tone="neutral"
                type="button"
                variant="outline"
              >
                {copy.saveChoices}
              </Button>
              <Button
                className="ts-secondary-action"
                onClick={() =>
                  savePreferences({
                    analytics: false,
                    advertising: false,
                  })
                }
                tone="neutral"
                type="button"
                variant="outline"
              >
                {copy.rejectOptional}
              </Button>
            </div>
          </section>
        ) : null)}
    </PrivacySettingsProvider>
  );
}

function readConsentPreferences(): ConsentPreferences | null {
  let storedValue: string | null;

  try {
    removeLegacyConsentEntries();
    storedValue = window.localStorage.getItem(consentStorageKey);
  } catch {
    return null;
  }

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      Array.isArray(parsedValue) ||
      !hasExactKeys(parsedValue, ["analytics", "advertising"]) ||
      !("analytics" in parsedValue) ||
      typeof parsedValue.analytics !== "boolean" ||
      !("advertising" in parsedValue) ||
      typeof parsedValue.advertising !== "boolean"
    ) {
      return null;
    }

    return {
      analytics: parsedValue.analytics,
      advertising: parsedValue.advertising,
    };
  } catch {
    return null;
  }
}

function hasExactKeys(value: object, expectedKeys: readonly string[]) {
  const keys = Object.keys(value);

  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function removeLegacyConsentEntries() {
  const legacyPrefix = `${consentStorageKey}.`;
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(legacyPrefix)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

function writeConsentPreferences(
  preferences: ConsentPreferences,
): ConsentWriteResult {
  const serializedPreferences = JSON.stringify(preferences);

  try {
    window.localStorage.setItem(consentStorageKey, serializedPreferences);

    if (
      window.localStorage.getItem(consentStorageKey) === serializedPreferences
    ) {
      return "stored";
    }
  } catch {
    // Fall through to removing any stale permission-bearing record.
  }

  try {
    window.localStorage.removeItem(consentStorageKey);

    if (window.localStorage.getItem(consentStorageKey) === null) {
      return "cleared";
    }
  } catch {
    // The caller keeps optional services fail-closed for this document.
  }

  return "failed";
}

function disableGoogleAnalytics(measurementId: string | undefined) {
  if (!measurementId) {
    return;
  }

  const analyticsWindow = window as unknown as Record<string, boolean>;
  analyticsWindow[`ga-disable-${measurementId}`] = true;
}

function readFailClosedCarriers(): readonly FailClosedCarrier[] {
  const carriers: FailClosedCarrier[] = [];

  if (hasFailClosedSessionMarker()) {
    carriers.push("session-storage");
  }

  if (hasFailClosedCookie()) {
    writeFailClosedCookie(failClosedCookieMaxAgeSeconds);
    carriers.push("cookie");
  }

  return carriers;
}

function storeFailClosedOverride(): FailClosedCarrier | null {
  try {
    window.sessionStorage.setItem(failClosedSessionStorageKey, "1");

    if (hasFailClosedSessionMarker()) {
      return "session-storage";
    }
  } catch {
    // Fall through to the cookie carrier when Web Storage is unavailable.
  }

  return writeFailClosedCookie(failClosedCookieMaxAgeSeconds) ? "cookie" : null;
}

function clearFailClosedOverride(carriers: readonly FailClosedCarrier[]) {
  return carriers.every((carrier) => {
    if (carrier === "cookie") {
      return writeFailClosedCookie(0);
    }

    try {
      window.sessionStorage.removeItem(failClosedSessionStorageKey);
      return !hasFailClosedSessionMarker();
    } catch {
      return false;
    }
  });
}

function hasFailClosedSessionMarker() {
  try {
    return window.sessionStorage.getItem(failClosedSessionStorageKey) === "1";
  } catch {
    return false;
  }
}

function writeFailClosedCookie(maxAgeSeconds: number) {
  try {
    const value = maxAgeSeconds > 0 ? "1" : "";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${failClosedCookieName}=${value}; Path=/; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;

    return maxAgeSeconds > 0 ? hasFailClosedCookie() : !hasFailClosedCookie();
  } catch {
    return false;
  }
}

function hasFailClosedCookie() {
  return document.cookie.split(";").some((entry) => {
    const [name, value] = entry.trim().split("=");
    return name === failClosedCookieName && value === "1";
  });
}

function isSameOriginUrl(rawUrl: string) {
  try {
    return (
      new URL(rawUrl, window.location.href).origin === window.location.origin
    );
  } catch {
    return false;
  }
}

function reloadPage() {
  window.location.reload();
}

function dispatchBeforeDocumentReload() {
  window.dispatchEvent(new Event(optionalServicesDocumentReloadEvent));
}
