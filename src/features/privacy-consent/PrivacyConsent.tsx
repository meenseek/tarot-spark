"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  interactiveFocusClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import { GoogleAnalytics } from "@/components/layout/GoogleAnalytics";
import { GoogleAdSenseScript } from "@/integrations/google-adsense/GoogleAdSenseScript";
import { optionalServicesDocumentReloadEvent } from "./events";
import type { PrivacyConsentCopy } from "./i18n";
import { isInteractiveReadingPathname } from "./route-policy";

const consentStorageKey = "tarot-spark.optional-services-consent.v1";
const consentVersion = 1;

type ConsentPreferences = {
  readonly version: typeof consentVersion;
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
  const hasAnalytics = Boolean(analyticsMeasurementId);
  const hasAdvertising = Boolean(advertisingClientId);
  const isReadingRoute = isInteractiveReadingPathname(pathname);
  const shouldLoadAdvertising = Boolean(
    preferences?.advertising && advertisingClientId && !isReadingRoute,
  );
  const mustReloadBeforeReading = isReadingRoute && hasLoadedAdvertising;
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
    if (mustReloadBeforeReading) {
      dispatchBeforeDocumentReload();
      reloadDocument();
    }
  }, [mustReloadBeforeReading, reloadDocument]);

  if (!hasAnalytics && !hasAdvertising) {
    return children;
  }

  if (mustReloadBeforeReading) {
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
                className="text-lg font-semibold text-ts-ink"
                id="privacy-consent-heading"
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
              <button
                className={secondaryButtonClassName}
                onClick={() =>
                  savePreferences({
                    version: consentVersion,
                    analytics: hasAnalytics && analyticsSelected,
                    advertising: hasAdvertising && advertisingSelected,
                  })
                }
                type="button"
              >
                {copy.saveChoices}
              </button>
              <button
                className={secondaryButtonClassName}
                onClick={() =>
                  savePreferences({
                    version: consentVersion,
                    analytics: false,
                    advertising: false,
                  })
                }
                type="button"
              >
                {copy.rejectOptional}
              </button>
            </div>
          </section>
        ) : (
          <button
            className={`${secondaryButtonClassName} fixed bottom-4 right-4 z-40 min-h-11 bg-ts-surface px-3 text-xs`}
            onClick={() => setIsEditing(true)}
            type="button"
          >
            {copy.settingsButton}
          </button>
        ))}
    </>
  );
}

function readConsentPreferences(): ConsentPreferences | null {
  let storedValue: string | null;

  try {
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
      !("version" in parsedValue) ||
      parsedValue.version !== consentVersion ||
      !("analytics" in parsedValue) ||
      typeof parsedValue.analytics !== "boolean" ||
      !("advertising" in parsedValue) ||
      typeof parsedValue.advertising !== "boolean"
    ) {
      return null;
    }

    return {
      version: consentVersion,
      analytics: parsedValue.analytics,
      advertising: parsedValue.advertising,
    };
  } catch {
    return null;
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
