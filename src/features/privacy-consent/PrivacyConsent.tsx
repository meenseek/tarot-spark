"use client";

import { Button } from "@measure-twice/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { interactiveFocusClassName } from "@/components/visual/class-names";
import { GoogleAnalytics } from "@/components/layout/GoogleAnalytics";
import { GoogleAdSenseScript } from "@/integrations/google-adsense/GoogleAdSenseScript";
import { optionalServicesDocumentReloadEvent } from "./events";
import type { PrivacyConsentCopy } from "./i18n";
import { isAdvertisingEligiblePathname } from "./route-policy";

const consentStorageKey = "tarot-spark.optional-services-consent";

type ConsentPreferences = {
  readonly analytics: boolean;
  readonly advertising: boolean;
};

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
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const shouldFocusEditingPanelRef = useRef(false);
  const shouldRestoreSettingsFocusRef = useRef(false);
  const hasAnalytics = Boolean(analyticsMeasurementId);
  const hasAdvertising = Boolean(advertisingClientId);
  const isAdvertisingEligibleRoute = isAdvertisingEligiblePathname(pathname);
  const shouldLoadAdvertising = Boolean(
    preferences?.advertising &&
    advertisingClientId &&
    isAdvertisingEligibleRoute,
  );
  const mustReloadBeforeAdvertisingExcludedRoute =
    !isAdvertisingEligibleRoute && hasLoadedAdvertising;
  const markAdvertisingLoaded = useCallback(() => {
    setHasLoadedAdvertising(true);
  }, []);

  useEffect(() => {
    const storedPreferences = readConsentPreferences();
    let shouldHydrate = true;

    queueMicrotask(() => {
      if (!shouldHydrate) {
        return;
      }

      setPreferences(storedPreferences);
      setAnalyticsSelected(storedPreferences?.analytics ?? false);
      setAdvertisingSelected(storedPreferences?.advertising ?? false);
    });

    return () => {
      shouldHydrate = false;
    };
  }, []);

  useEffect(() => {
    if (mustReloadBeforeAdvertisingExcludedRoute) {
      dispatchBeforeDocumentReload();
      reloadDocument();
    }
  }, [mustReloadBeforeAdvertisingExcludedRoute, reloadDocument]);

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
    settingsButtonRef.current?.focus();
  }, [isEditing, preferences]);

  if (!hasAnalytics && !hasAdvertising) {
    return children;
  }

  if (mustReloadBeforeAdvertisingExcludedRoute) {
    return null;
  }

  function savePreferences(nextPreferences: ConsentPreferences) {
    const shouldReload =
      (preferences?.analytics === true && !nextPreferences.analytics) ||
      (preferences?.advertising === true &&
        !nextPreferences.advertising &&
        hasLoadedAdvertising);

    writeConsentPreferences(nextPreferences);
    setPreferences(nextPreferences);
    setAnalyticsSelected(nextPreferences.analytics);
    setAdvertisingSelected(nextPreferences.advertising);
    shouldRestoreSettingsFocusRef.current = isEditing && !shouldReload;
    setIsEditing(false);

    if (shouldReload) {
      dispatchBeforeDocumentReload();
      reloadDocument();
    }
  }

  const shouldShowChoices = preferences === null || isEditing;

  return (
    <>
      {children}
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
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {hasAnalytics && (
                <label className="flex min-h-20 gap-3 rounded-ts-control border border-ts-divider bg-ts-canvas p-3 text-sm text-ts-ink">
                  <input
                    checked={analyticsSelected}
                    className={`${interactiveFocusClassName} mt-1 h-5 w-5 shrink-0 accent-ts-action`}
                    onChange={(event) =>
                      setAnalyticsSelected(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold">
                      {copy.analyticsLabel}
                    </span>
                    <span className="mt-1 block leading-5 text-ts-muted">
                      {copy.analyticsDescription}
                    </span>
                  </span>
                </label>
              )}
              {hasAdvertising && (
                <label className="flex min-h-20 gap-3 rounded-ts-control border border-ts-divider bg-ts-canvas p-3 text-sm text-ts-ink">
                  <input
                    checked={advertisingSelected}
                    className={`${interactiveFocusClassName} mt-1 h-5 w-5 shrink-0 accent-ts-action`}
                    onChange={(event) =>
                      setAdvertisingSelected(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-semibold">
                      {copy.advertisingLabel}
                    </span>
                    <span className="mt-1 block leading-5 text-ts-muted">
                      {copy.advertisingDescription}
                    </span>
                  </span>
                </label>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="tarot-mt-button"
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
                className="tarot-mt-button"
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
        ) : (
          <Button
            className="tarot-mt-button fixed right-4 bottom-4 z-40 px-3 text-xs"
            onClick={() => {
              shouldFocusEditingPanelRef.current = true;
              setIsEditing(true);
            }}
            ref={settingsButtonRef}
            tone="neutral"
            type="button"
            variant="outline"
          >
            {copy.settingsButton}
          </Button>
        ))}
    </>
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

function writeConsentPreferences(preferences: ConsentPreferences) {
  try {
    window.localStorage.setItem(consentStorageKey, JSON.stringify(preferences));
  } catch {
    // The controls still apply for this page view if storage is unavailable.
  }
}

function reloadPage() {
  window.location.reload();
}

function dispatchBeforeDocumentReload() {
  window.dispatchEvent(new Event(optionalServicesDocumentReloadEvent));
}
