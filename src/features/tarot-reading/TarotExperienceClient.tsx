"use client";

import Link from "next/link";
import {
  type MouseEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CelestialMark } from "@/components/visual/CelestialMark";
import {
  footerLinkClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import {
  buildPromptPack,
  drawCards,
  getDefaultReadingStyle,
  getDefaultSpread,
  getDefaultTopic,
  getReadingLens,
  getReadingStyle,
  getSpread,
  getSpreadPositions,
  getTopic,
  maxUserContextLength,
  parseInstantReading,
  promptVersion,
  type DrawnCard,
  type InstantReadingRequest,
  type InstantReadingV1,
  type LocaleTarotData,
  type PromptSlotId,
  type ReadingStyleId,
  type SpreadId,
  type TopicId,
} from "@/domain/tarot";
import { optionalServicesDocumentReloadEvent } from "@/features/privacy-consent/events";
import { localeNames, supportedLocales, type Locale } from "@/i18n/config";
import { formatTemplateStrict } from "@/i18n/template";
import {
  captureAnalyticsInvocation,
  getAnalyticsAttributionPayload,
  isAnalyticsInvocationEligible,
  runWhenAnalyticsReady,
  trackEvent,
  type ShareMethod,
  type ShareOutcome,
} from "./analytics";
import { CardOverview } from "./components/CardOverview";
import { CardSpread } from "./components/CardSpread";
import { CurrentPromptCustomization } from "./components/CurrentPromptCustomization";
import type { InstantReadingStatus } from "./components/InstantReadingPanel";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { ReadingPreferences } from "./components/ReadingPreferences";
import { ReadingResult } from "./components/ReadingResult";
import { SituationContextInput } from "./components/SituationContextInput";
import { TopicSelector } from "./components/TopicSelector";
import type { TarotReadingCopy } from "./i18n";
import {
  buildReadingUrl,
  clearPrivateContextHandoff,
  getLocalizedGeneratorHref,
  getLocalizedReadingHref,
  getLocalizedShareReadingHref,
  getReadingAttributionFromUrl,
  getReadingStateFromUrl,
  getShareBaseUrl,
  readPrivateContextHandoff,
  type ReadingUrlAttribution,
  type ReadingUrlState,
  type ShareSourceId,
  storePrivateContextHandoff,
} from "./reading-state";
import {
  createResultSession,
  createSetupSession,
  readingSessionReducer,
} from "./reading-session";
import type { CopyState, ShareFeedback } from "./types";
import type { TarotExperienceViewMode } from "./TarotExperience";

const kakaoSdkScriptId = "kakao-javascript-sdk";
const kakaoSdkScriptUrl =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const kakaoSdkIntegrity =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";
const emptyDrawnCards: readonly DrawnCard[] = [];

let kakaoSdkLoadPromise: Promise<KakaoSdk> | undefined;

type PublicPageLink = {
  readonly href: string;
  readonly label: string;
};

type TarotExperienceClientProps = {
  readonly initialAttribution?: ReadingUrlAttribution | undefined;
  readonly initialReadingState?: ReadingUrlState | undefined;
  readonly locale: Locale;
  readonly copy: TarotReadingCopy;
  readonly dailyQuestionPath: string;
  readonly instantReadingEnabled: boolean;
  readonly kakaoAllowedOrigins: readonly string[];
  readonly kakaoJavaScriptKey: string | undefined;
  readonly publicPageLinks: readonly PublicPageLink[];
  readonly publicPageNavigationLabel: string;
  readonly shareSiteUrl: string;
  readonly tarotData: LocaleTarotData;
  readonly viewMode: TarotExperienceViewMode;
};

type DrawAnnouncementRequest = {
  readonly cardCount: number;
  readonly sequence: number;
};

export function TarotExperienceClient({
  initialAttribution,
  initialReadingState,
  locale,
  copy,
  dailyQuestionPath,
  instantReadingEnabled,
  kakaoAllowedOrigins,
  kakaoJavaScriptKey,
  publicPageLinks,
  publicPageNavigationLabel,
  shareSiteUrl,
  tarotData,
  viewMode,
}: TarotExperienceClientProps) {
  const defaultTopic = getDefaultTopic(tarotData.topics);
  const defaultSpread = getDefaultSpread(tarotData.spreads);
  const defaultReadingStyle = getDefaultReadingStyle(tarotData.readingStyles);
  const seedReadingState =
    initialReadingState ??
    (typeof window === "undefined"
      ? undefined
      : getReadingStateFromUrl(tarotData, window.location.href));
  const [session, dispatchSession] = useReducer(
    readingSessionReducer,
    undefined,
    () => {
      const inputs = {
        topicId: seedReadingState?.topicId ?? defaultTopic.id,
        spreadId: seedReadingState?.spreadId ?? defaultSpread.id,
        styleId: seedReadingState?.styleId ?? defaultReadingStyle.id,
        privateContext: "",
      };

      return seedReadingState && seedReadingState.cards.length > 0
        ? createResultSession({
            cards: seedReadingState.cards,
            drawStyleId: seedReadingState.drawStyleId,
            inputs,
          })
        : createSetupSession(inputs);
    },
  );
  const sessionRef = useRef(session);
  const [readingAttribution] = useState<ReadingUrlAttribution | undefined>(
    () =>
      initialAttribution ??
      (typeof window === "undefined"
        ? undefined
        : (getReadingAttributionFromUrl(window.location.href) ?? undefined)),
  );
  const [drawSequenceId, setDrawSequenceId] = useState(0);
  const [drawAnnouncement, setDrawAnnouncement] = useState("");
  const [drawAnnouncementRequest, setDrawAnnouncementRequest] =
    useState<DrawAnnouncementRequest>();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback>();
  const [instantReading, setInstantReading] = useState<InstantReadingV1>();
  const [instantReadingStatus, setInstantReadingStatus] =
    useState<InstantReadingStatus>("idle");
  const drawSequenceIdRef = useRef(0);
  const instantReadingRequestRef = useRef<AbortController | undefined>(
    undefined,
  );
  const promptOperationIdRef = useRef(0);
  const shareOperationIdRef = useRef(0);
  const emittedResultViewKeysRef = useRef(new Set<string>());
  const resultViewCurrentlyVisibleRef = useRef(false);
  const resultViewTargetRef = useRef<HTMLDivElement | null>(null);
  const readingWorkspaceRef = useRef<HTMLElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const editHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const situationContextDisclosureRef = useRef<HTMLDetailsElement | null>(null);
  const shouldScrollToResultRef = useRef(false);
  const shouldFocusResultRef = useRef(false);
  const shouldFocusEditRef = useRef(false);
  const shouldRestoreEditTriggerFocusRef = useRef(false);
  const pendingPrivateContextHandoff = useRef<string | undefined>(undefined);
  const currentOrigin = useSyncExternalStore(
    subscribeToCurrentOrigin,
    getCurrentOriginSnapshot,
    getServerOriginSnapshot,
  );
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const hasKakaoShare = canUseKakaoShare(
    kakaoJavaScriptKey,
    kakaoAllowedOrigins,
    shareSiteUrl,
    currentOrigin,
  );

  const currentResult = session.mode === "setup" ? undefined : session.current;
  const formInputs =
    session.mode === "result" ? session.current.inputs : session.draft;
  const cards = currentResult?.cards ?? emptyDrawnCards;
  const selectedPromptSlotId = currentResult?.promptSlot ?? "main";
  const selectedTopic = getTopic(tarotData.topics, formInputs.topicId);
  const selectedSpread = getSpread(tarotData.spreads, formInputs.spreadId);
  const selectedPositions = useMemo(
    () => getSpreadPositions(selectedSpread, tarotData.spreadPositions),
    [selectedSpread, tarotData.spreadPositions],
  );
  const currentTopic = currentResult
    ? getTopic(tarotData.topics, currentResult.inputs.topicId)
    : undefined;
  const currentSpread = currentResult
    ? getSpread(tarotData.spreads, currentResult.inputs.spreadId)
    : undefined;
  const currentReadingStyle = currentResult
    ? getReadingStyle(tarotData.readingStyles, currentResult.inputs.styleId)
    : undefined;
  const readingLens = useMemo(
    () =>
      cards.length > 0 && currentTopic
        ? getReadingLens(tarotData.readingLenses, currentTopic.id, cards)
        : undefined,
    [cards, currentTopic, tarotData.readingLenses],
  );
  const analyticsAttribution =
    getAnalyticsAttributionPayload(readingAttribution);
  const resultViewKey = currentResult
    ? `card-instance:${currentResult.cardInstanceId}`
    : undefined;

  useEffect(() => {
    if (viewMode === "shared") {
      clearPrivateContextHandoff(window.sessionStorage);
      return;
    }

    const transferredContext = readPrivateContextHandoff(window.sessionStorage);

    if (transferredContext === undefined) {
      return;
    }

    let shouldRestore = true;

    queueMicrotask(() => {
      if (!shouldRestore) {
        return;
      }

      pendingPrivateContextHandoff.current = transferredContext;
      dispatchSession(
        session.mode === "setup"
          ? {
              type: "SET_DRAFT_PRIVATE_CONTEXT",
              privateContext: transferredContext,
            }
          : {
              type: "SET_CURRENT_PRIVATE_CONTEXT",
              privateContext: transferredContext,
            },
      );
      setCopyState("idle");
      setShareFeedback(undefined);
    });

    return () => {
      shouldRestore = false;
    };
  }, [session.mode, viewMode]);

  useEffect(() => {
    const target = resultViewTargetRef.current;

    if (
      !target ||
      !resultViewKey ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    let disposed = false;
    let cancelAnalyticsReady: () => void = () => undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((candidate) => candidate.target === target);
        const isVisible = Boolean(
          entry?.isIntersecting && entry.intersectionRatio > 0,
        );

        resultViewCurrentlyVisibleRef.current = isVisible;
        cancelAnalyticsReady();

        if (!isVisible) {
          return;
        }

        cancelAnalyticsReady = runWhenAnalyticsReady(() => {
          if (
            disposed ||
            !resultViewCurrentlyVisibleRef.current ||
            emittedResultViewKeysRef.current.has(resultViewKey)
          ) {
            return;
          }

          emittedResultViewKeysRef.current.add(resultViewKey);
          if (!currentResult || !currentTopic || !currentSpread) {
            return;
          }

          trackEvent("result_view", {
            ...getAnalyticsAttributionPayload(readingAttribution),
            locale,
            topic_id: currentTopic.id,
            card_count: cards.length,
            draw_style_id: currentResult.drawStyleId,
            spread_id: currentSpread.id,
            style_id: currentResult.inputs.styleId,
          });
        });
      },
      { threshold: 0.01 },
    );

    observer.observe(target);

    return () => {
      disposed = true;
      resultViewCurrentlyVisibleRef.current = false;
      cancelAnalyticsReady();
      observer.disconnect();
    };
  }, [
    cards.length,
    currentResult,
    currentSpread,
    currentTopic,
    locale,
    readingAttribution,
    resultViewKey,
  ]);

  useEffect(() => {
    const pendingContext = pendingPrivateContextHandoff.current;

    const activeContext =
      session.mode === "setup"
        ? session.draft.privateContext
        : session.current.inputs.privateContext;

    if (pendingContext === undefined || pendingContext !== activeContext) {
      return;
    }

    clearPrivateContextHandoff(window.sessionStorage);
    pendingPrivateContextHandoff.current = undefined;
  }, [session]);

  useEffect(() => {
    if (!drawAnnouncementRequest) {
      return;
    }

    const announcementTimer = window.setTimeout(() => {
      setDrawAnnouncement(
        formatTemplateStrict(
          copy.drawStatus,
          {
            count: String(drawAnnouncementRequest.cardCount),
          },
          `${locale} tarot-reading.drawStatus`,
        ),
      );
    }, 0);

    return () => {
      window.clearTimeout(announcementTimer);
    };
  }, [copy.drawStatus, drawAnnouncementRequest, locale]);

  useEffect(() => {
    if (!shouldFocusResultRef.current || cards.length === 0) {
      return;
    }

    shouldFocusResultRef.current = false;
    resultHeadingRef.current?.focus();

    if (!shouldScrollToResultRef.current) {
      return;
    }

    shouldScrollToResultRef.current = false;
    const workspace = readingWorkspaceRef.current;

    if (!workspace || typeof workspace.scrollIntoView !== "function") {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    workspace.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [cards.length, drawSequenceId]);

  useEffect(() => {
    if (session.mode === "edit-next-draw" && shouldFocusEditRef.current) {
      shouldFocusEditRef.current = false;
      editHeadingRef.current?.focus();
      return;
    }

    if (session.mode === "result" && shouldRestoreEditTriggerFocusRef.current) {
      shouldRestoreEditTriggerFocusRef.current = false;
      editTriggerRef.current?.focus();
    }
  }, [session.mode]);

  useEffect(() => {
    const preserveContextBeforeReload = () => {
      const privateContext =
        session.mode === "setup"
          ? session.draft.privateContext
          : session.current.inputs.privateContext;
      storePrivateContextHandoff(window.sessionStorage, privateContext);
    };

    window.addEventListener(
      optionalServicesDocumentReloadEvent,
      preserveContextBeforeReload,
    );

    return () => {
      window.removeEventListener(
        optionalServicesDocumentReloadEvent,
        preserveContextBeforeReload,
      );
    };
  }, [session]);

  useEffect(
    () => () => {
      instantReadingRequestRef.current?.abort();
    },
    [],
  );

  const promptPack = useMemo(
    () =>
      currentResult &&
      currentTopic &&
      currentSpread &&
      currentReadingStyle &&
      readingLens
        ? buildPromptPack(
            {
              cards,
              lens: readingLens,
              readingStyle: currentReadingStyle,
              spread: currentSpread,
              template: tarotData.promptTemplate,
              topic: currentTopic,
              userContext: currentResult.inputs.privateContext,
            },
            `${locale} tarot promptTemplate`,
          )
        : undefined,
    [
      cards,
      currentReadingStyle,
      currentResult,
      currentSpread,
      currentTopic,
      locale,
      readingLens,
      tarotData.promptTemplate,
    ],
  );
  const prompt = promptPack?.[selectedPromptSlotId] ?? "";
  const contextCountLabel = useMemo(
    () =>
      formatTemplateStrict(
        copy.contextCountLabel,
        {
          count: String(formInputs.privateContext.length),
          max: String(maxUserContextLength),
        },
        `${locale} tarot-reading.contextCountLabel`,
      ),
    [copy.contextCountLabel, formInputs.privateContext.length, locale],
  );
  const drawButtonLabel = useMemo(
    () =>
      formatTemplateStrict(
        copy.drawButton,
        { count: String(selectedPositions.length) },
        `${locale} tarot-reading.drawButton`,
      ),
    [copy.drawButton, locale, selectedPositions.length],
  );
  const publicReadingState = useMemo<ReadingUrlState>(
    () =>
      currentResult
        ? {
            cards: currentResult.cards,
            drawStyleId: currentResult.drawStyleId,
            spreadId: currentResult.inputs.spreadId,
            styleId: currentResult.inputs.styleId,
            topicId: currentResult.inputs.topicId,
          }
        : {
            cards: emptyDrawnCards,
            drawStyleId: formInputs.styleId,
            spreadId: formInputs.spreadId,
            styleId: formInputs.styleId,
            topicId: formInputs.topicId,
          },
    [currentResult, formInputs],
  );
  const languageLinks = useMemo(
    () =>
      supportedLocales.map((targetLocale) => ({
        href:
          viewMode === "shared"
            ? getLocalizedShareReadingHref(
                targetLocale,
                publicReadingState,
                readingAttribution,
              )
            : getLocalizedReadingHref(
                targetLocale,
                publicReadingState,
                readingAttribution,
              ),
        label: localeNames[targetLocale],
        locale: targetLocale,
      })),
    [publicReadingState, readingAttribution, viewMode],
  );
  const deckPreviewNote = useMemo(
    () =>
      formatTemplateStrict(
        copy.deckPreviewNote,
        {
          count: String(tarotData.cards.length),
        },
        `${locale} tarot-reading.deckPreviewNote`,
      ),
    [copy.deckPreviewNote, locale, tarotData.cards.length],
  );

  function chooseTopic(topicId: TopicId) {
    if (session.mode === "result" || formInputs.topicId === topicId) {
      return;
    }

    dispatchSession({ type: "SET_DRAFT_TOPIC", topicId });
    if (session.mode === "setup") {
      replaceBrowserUrl(
        getBrowserReadingUrl(
          topicId,
          formInputs.spreadId,
          formInputs.styleId,
          formInputs.styleId,
          [],
          readingAttribution,
        ),
      );
    }
    trackEvent("topic_click", {
      ...analyticsAttribution,
      locale,
      topic_id: topicId,
    });
  }

  function chooseSpread(spreadId: SpreadId) {
    if (session.mode === "result" || formInputs.spreadId === spreadId) {
      return;
    }

    dispatchSession({ type: "SET_DRAFT_SPREAD", spreadId });
    if (session.mode === "setup") {
      replaceBrowserUrl(
        getBrowserReadingUrl(
          formInputs.topicId,
          spreadId,
          formInputs.styleId,
          formInputs.styleId,
          [],
          readingAttribution,
        ),
      );
    }
  }

  function chooseDraftReadingStyle(styleId: ReadingStyleId) {
    if (session.mode === "result" || formInputs.styleId === styleId) {
      return;
    }

    dispatchSession({ type: "SET_DRAFT_STYLE", styleId });
    if (session.mode === "setup") {
      replaceBrowserUrl(
        getBrowserReadingUrl(
          formInputs.topicId,
          formInputs.spreadId,
          styleId,
          styleId,
          [],
          readingAttribution,
        ),
      );
    }
  }

  function chooseCurrentReadingStyle(styleId: ReadingStyleId) {
    if (!currentResult || currentResult.inputs.styleId === styleId) {
      return;
    }

    resetInstantReading();
    dispatchSession({ type: "SET_CURRENT_STYLE", styleId });
    setCopyState("idle");
    setShareFeedback(undefined);
    replaceBrowserUrl(
      getBrowserReadingUrl(
        currentResult.inputs.topicId,
        currentResult.inputs.spreadId,
        styleId,
        currentResult.drawStyleId,
        currentResult.cards,
        readingAttribution,
      ),
    );
  }

  function changeDraftUserContext(value: string) {
    if (session.mode === "result") {
      return;
    }

    dispatchSession({
      type: "SET_DRAFT_PRIVATE_CONTEXT",
      privateContext: value,
    });
  }

  function changeCurrentUserContext(value: string) {
    if (!currentResult || currentResult.inputs.privateContext === value) {
      return;
    }

    dispatchSession({
      type: "SET_CURRENT_PRIVATE_CONTEXT",
      privateContext: value,
    });
    setCopyState("idle");
  }

  function preserveContextForLocaleChange(targetLocale: Locale) {
    if (targetLocale !== locale) {
      resultViewTargetRef.current
        ?.querySelectorAll("details")
        .forEach((details) => {
          details.open = false;
        });
    }

    if (viewMode === "generator" && targetLocale !== locale) {
      if (situationContextDisclosureRef.current) {
        situationContextDisclosureRef.current.open = false;
      }
      const privateContext =
        session.mode === "setup"
          ? session.draft.privateContext
          : session.current.inputs.privateContext;
      storePrivateContextHandoff(window.sessionStorage, privateContext);
    }
  }

  function startDraw(event: MouseEvent<HTMLButtonElement>) {
    if (session.mode === "result") {
      return;
    }

    performDraw(event, formInputs, "DRAW_COMMIT");
  }

  function redrawCurrent(event: MouseEvent<HTMLButtonElement>) {
    if (!currentResult || session.mode !== "result") {
      return;
    }

    performDraw(event, currentResult.inputs, "REDRAW_CURRENT");
  }

  function performDraw(
    event: MouseEvent<HTMLButtonElement>,
    inputs: typeof formInputs,
    actionType: "DRAW_COMMIT" | "REDRAW_CURRENT",
  ) {
    resetInstantReading();
    shouldScrollToResultRef.current = event.detail > 0;
    shouldFocusResultRef.current = true;
    trackEvent("draw_start", {
      ...analyticsAttribution,
      locale,
      topic_id: inputs.topicId,
      draw_style_id: inputs.styleId,
      spread_id: inputs.spreadId,
      style_id: inputs.styleId,
    });

    const spread = getSpread(tarotData.spreads, inputs.spreadId);
    const positions = getSpreadPositions(spread, tarotData.spreadPositions);
    const drawnCards = drawCards(tarotData.cards, positions);
    const nextDrawSequenceId = drawSequenceIdRef.current + 1;
    drawSequenceIdRef.current = nextDrawSequenceId;
    setDrawSequenceId(nextDrawSequenceId);
    setDrawAnnouncement("");
    setDrawAnnouncementRequest({
      cardCount: drawnCards.length,
      sequence: nextDrawSequenceId,
    });
    dispatchSession({ type: actionType, cards: drawnCards });
    setCopyState("idle");
    setShareFeedback(undefined);
    replaceBrowserUrl(
      getBrowserReadingUrl(
        inputs.topicId,
        inputs.spreadId,
        inputs.styleId,
        inputs.styleId,
        drawnCards,
        readingAttribution,
      ),
    );

    drawnCards.forEach(({ position, card }) => {
      trackEvent("card_selected", {
        ...analyticsAttribution,
        locale,
        topic_id: inputs.topicId,
        position_id: position.id,
        card_id: card.id,
        draw_style_id: inputs.styleId,
        spread_id: inputs.spreadId,
        style_id: inputs.styleId,
      });
    });
  }

  async function generateInstantReading() {
    if (
      !instantReadingEnabled ||
      locale !== "ko" ||
      cards.length === 0 ||
      !readingLens ||
      !currentResult
    ) {
      return;
    }

    instantReadingRequestRef.current?.abort();
    const controller = new AbortController();
    instantReadingRequestRef.current = controller;
    const readingRequest = {
      cards: cards.map(({ card, position }) => ({
        cardId: card.id,
        positionId: position.id,
      })),
      lensId: readingLens.id,
      spreadId: currentResult.inputs.spreadId,
      styleId: currentResult.inputs.styleId,
      topicId: currentResult.inputs.topicId,
    } satisfies InstantReadingRequest;

    setInstantReading(undefined);
    setInstantReadingStatus("loading");

    try {
      const response = await fetch("/api/reading", {
        body: JSON.stringify(readingRequest),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Instant reading is unavailable.");
      }

      const payload: unknown = await response.json();
      const nextReading =
        isRecord(payload) &&
        Object.keys(payload).length === 1 &&
        "reading" in payload
          ? parseInstantReading(payload["reading"], readingRequest)
          : undefined;

      if (!nextReading) {
        throw new Error("Instant reading response is invalid.");
      }

      if (instantReadingRequestRef.current === controller) {
        setInstantReading(nextReading);
        setInstantReadingStatus("success");
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        getErrorName(error) === "AbortError" ||
        instantReadingRequestRef.current !== controller
      ) {
        return;
      }

      setInstantReading(undefined);
      setInstantReadingStatus("unavailable");
    } finally {
      if (instantReadingRequestRef.current === controller) {
        instantReadingRequestRef.current = undefined;
      }
    }
  }

  function resetInstantReading() {
    instantReadingRequestRef.current?.abort();
    instantReadingRequestRef.current = undefined;
    setInstantReading(undefined);
    setInstantReadingStatus("idle");
  }

  async function copyPrompt() {
    if (!prompt || !currentResult) {
      return;
    }

    const operationId = promptOperationIdRef.current + 1;
    promptOperationIdRef.current = operationId;
    const promptRevision = currentResult.promptRevision;
    const analyticsInvocation = captureAnalyticsInvocation();
    const analyticsPayload = {
      ...analyticsAttribution,
      locale,
      topic_id: currentResult.inputs.topicId,
      card_count: currentResult.cards.length,
      draw_style_id: currentResult.drawStyleId,
      spread_id: currentResult.inputs.spreadId,
      style_id: currentResult.inputs.styleId,
      prompt_slot: currentResult.promptSlot,
      prompt_version: promptVersion,
      surface: "reading_result",
    } as const;
    setCopyState("idle");

    try {
      await writeClipboard(prompt);

      if (isAnalyticsInvocationEligible(analyticsInvocation)) {
        trackEvent("prompt_copy", analyticsPayload);
      }

      const activeSession = sessionRef.current;
      const activeResult =
        activeSession.mode === "setup" ? undefined : activeSession.current;
      if (
        promptOperationIdRef.current === operationId &&
        activeSession.mode !== "setup" &&
        activeResult?.promptRevision === promptRevision
      ) {
        setCopyState("copied");
      }
    } catch {
      const activeSession = sessionRef.current;
      if (
        promptOperationIdRef.current === operationId &&
        activeSession.mode !== "setup" &&
        activeSession.current.promptRevision === promptRevision
      ) {
        setCopyState("failed");
      }
    }
  }

  function choosePromptSlot(promptSlotId: PromptSlotId) {
    if (!currentResult || currentResult.promptSlot === promptSlotId) {
      return;
    }

    dispatchSession({ type: "SET_PROMPT_SLOT", promptSlot: promptSlotId });
    setCopyState("idle");
  }

  async function shareToKakaoTalk() {
    if (!currentResult || !currentTopic || !kakaoJavaScriptKey) {
      return;
    }

    const attempt = beginShareAttempt("kakaotalk");
    if (!attempt) {
      return;
    }

    if (
      !canUseKakaoShare(
        kakaoJavaScriptKey,
        kakaoAllowedOrigins,
        shareSiteUrl,
        window.location.origin,
      )
    ) {
      completeShareAttempt(attempt, "failed", "failed");
      return;
    }

    const shareText = getShareText(
      copy.shareText,
      currentTopic.label,
      cards,
      `${locale} tarot-reading.shareText`,
    );
    const shareUrl = getShareUrl(
      shareSiteUrl,
      locale,
      currentResult.inputs.topicId,
      currentResult.inputs.spreadId,
      currentResult.inputs.styleId,
      currentResult.drawStyleId,
      cards,
      "kakao",
    );

    try {
      const kakao = await getInitializedKakaoSdk(kakaoJavaScriptKey);

      await Promise.resolve(
        kakao.Share.sendDefault({
          objectType: "text",
          text: shareText,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        }),
      );
      completeShareAttempt(attempt, "opened", "opened");
    } catch {
      completeShareAttempt(attempt, "failed", "failed");
    }
  }

  async function shareReading() {
    if (!currentResult || !currentTopic) {
      return;
    }

    const shareText = getShareText(
      copy.shareText,
      currentTopic.label,
      cards,
      `${locale} tarot-reading.shareText`,
    );
    const shareUrl = getShareUrl(
      shareSiteUrl,
      locale,
      currentResult.inputs.topicId,
      currentResult.inputs.spreadId,
      currentResult.inputs.styleId,
      currentResult.drawStyleId,
      cards,
      "native",
    );
    const shareData = {
      title: copy.shareTitle,
      text: shareText,
      url: shareUrl,
    } satisfies ShareData;
    const canShare = canNativeShare(shareData);
    const method = canShare ? "native" : "clipboard";
    const attempt = beginShareAttempt(method);
    if (!attempt) {
      return;
    }

    try {
      if (canShare && navigator.share) {
        await navigator.share(shareData);
        completeShareAttempt(attempt, "shared", "shared");
      } else {
        await writeClipboard(`${shareText}\n${shareUrl}`);
        completeShareAttempt(attempt, "copied", "copied");
      }
    } catch (error) {
      if (isShareCancel(error)) {
        completeShareAttempt(attempt, "cancelled");
        return;
      }

      completeShareAttempt(attempt, "failed", "failed");
    }
  }

  async function copyShareUrl() {
    if (!currentResult) {
      return;
    }

    const attempt = beginShareAttempt("copy_url");
    if (!attempt) {
      return;
    }

    try {
      await writeClipboard(
        getShareUrl(
          shareSiteUrl,
          locale,
          currentResult.inputs.topicId,
          currentResult.inputs.spreadId,
          currentResult.inputs.styleId,
          currentResult.drawStyleId,
          cards,
          "copy",
        ),
      );
      completeShareAttempt(attempt, "copied", "copied");
    } catch {
      completeShareAttempt(attempt, "failed", "failed");
    }
  }

  async function copyInstagramShareUrl() {
    if (!currentResult) {
      return;
    }

    const attempt = beginShareAttempt("instagram_copy_url");
    if (!attempt) {
      return;
    }

    try {
      await writeClipboard(
        getShareUrl(
          shareSiteUrl,
          locale,
          currentResult.inputs.topicId,
          currentResult.inputs.spreadId,
          currentResult.inputs.styleId,
          currentResult.drawStyleId,
          cards,
          "instagram",
        ),
      );
      completeShareAttempt(attempt, "copied", "copied");
    } catch {
      completeShareAttempt(attempt, "failed", "failed");
    }
  }

  function beginShareAttempt(method: ShareMethod) {
    if (!currentResult) {
      return undefined;
    }

    const operationId = shareOperationIdRef.current + 1;
    shareOperationIdRef.current = operationId;
    setShareFeedback(undefined);
    const attempt = {
      analyticsInvocation: captureAnalyticsInvocation(),
      operationId,
      publicStateRevision: currentResult.publicStateRevision,
      payload: {
        ...analyticsAttribution,
        locale,
        topic_id: currentResult.inputs.topicId,
        card_count: currentResult.cards.length,
        draw_style_id: currentResult.drawStyleId,
        method,
        spread_id: currentResult.inputs.spreadId,
        style_id: currentResult.inputs.styleId,
      },
    };

    trackEvent("share_click", attempt.payload);
    return attempt;
  }

  function completeShareAttempt(
    attempt: NonNullable<ReturnType<typeof beginShareAttempt>>,
    outcome: ShareOutcome,
    status?: ShareFeedback["status"],
  ) {
    if (isAnalyticsInvocationEligible(attempt.analyticsInvocation)) {
      trackEvent("share_result", { ...attempt.payload, outcome });
    }

    const activeSession = sessionRef.current;
    const activeResult =
      activeSession.mode === "setup" ? undefined : activeSession.current;
    if (
      shareOperationIdRef.current !== attempt.operationId ||
      activeSession.mode === "setup" ||
      activeResult?.publicStateRevision !== attempt.publicStateRevision
    ) {
      return;
    }

    setShareFeedback(
      status ? { method: attempt.payload.method, status } : undefined,
    );
  }

  function enterEditNextDraw() {
    if (session.mode !== "result") {
      return;
    }

    shouldFocusEditRef.current = true;
    dispatchSession({ type: "ENTER_EDIT" });
  }

  function cancelEditNextDraw() {
    if (session.mode !== "edit-next-draw") {
      return;
    }

    shouldRestoreEditTriggerFocusRef.current = true;
    dispatchSession({ type: "CANCEL_EDIT" });
  }

  const createOwnReadingHref = getLocalizedGeneratorHref(
    locale,
    readingAttribution,
  );
  const manualShareUrl = currentResult
    ? getShareUrl(
        shareSiteUrl,
        locale,
        currentResult.inputs.topicId,
        currentResult.inputs.spreadId,
        currentResult.inputs.styleId,
        currentResult.drawStyleId,
        cards,
        "copy",
      )
    : "";
  const readingResult = (
    <ReadingResult
      afterPromptAction={
        viewMode === "shared" ? (
          <a
            className={`${secondaryButtonClassName} w-full sm:w-fit`}
            data-testid="shared-create-own"
            href={createOwnReadingHref}
          >
            {copy.sharedReading.createOwn}
          </a>
        ) : undefined
      }
      cards={cards}
      copy={copy}
      copyState={copyState}
      currentCustomization={
        viewMode === "generator" && session.mode === "result" ? (
          <CurrentPromptCustomization
            contextCountLabel={contextCountLabel}
            contextPlaceholder={currentTopic?.contextPlaceholder ?? ""}
            copy={copy}
            onContextChange={changeCurrentUserContext}
            onStyleChange={chooseCurrentReadingStyle}
            readingStyles={tarotData.readingStyles}
            selectedStyleId={currentResult?.inputs.styleId ?? "balanced"}
            userContext={currentResult?.inputs.privateContext ?? ""}
          />
        ) : undefined
      }
      hasKakaoShare={hasKakaoShare}
      hasUserContext={Boolean(
        currentResult?.inputs.privateContext.trim().length,
      )}
      instantReading={instantReading}
      instantReadingEnabled={viewMode === "generator" && instantReadingEnabled}
      instantReadingStatus={instantReadingStatus}
      onGenerateInstantReading={generateInstantReading}
      onInstagramShare={copyInstagramShareUrl}
      onKakaoShare={shareToKakaoTalk}
      onCopyPrompt={copyPrompt}
      onPromptSlotChange={choosePromptSlot}
      onCopyUrl={copyShareUrl}
      onShareReading={shareReading}
      prompt={prompt}
      readingLens={readingLens}
      resultActions={
        viewMode === "generator" && session.mode === "result" ? (
          <div
            className="grid gap-2 sm:grid-cols-2"
            data-testid="result-actions"
          >
            <button
              className={secondaryButtonClassName}
              onClick={redrawCurrent}
              type="button"
            >
              {copy.redrawCurrent}
            </button>
            <button
              className={secondaryButtonClassName}
              onClick={enterEditNextDraw}
              ref={editTriggerRef}
              type="button"
            >
              {copy.editNextReading}
            </button>
          </div>
        ) : undefined
      }
      selectedPromptSlotId={selectedPromptSlotId}
      shareFeedback={shareFeedback}
      shareUrl={manualShareUrl}
    />
  );

  if (viewMode === "shared") {
    return (
      <main
        className="min-h-screen bg-ts-canvas text-ts-ink"
        data-testid="shared-reading-view"
      >
        <section className="mx-auto grid min-h-screen w-full max-w-4xl gap-6 px-5 py-6 sm:px-8 lg:py-10">
          <header className="grid gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-ts-action">
                {copy.brand}
              </p>
              <LanguageSwitch
                activeLocale={locale}
                ariaLabel={copy.languageSwitchLabel}
                links={languageLinks}
                onLocaleChange={preserveContextForLocaleChange}
              />
            </div>
            <div className="grid gap-3 border-b border-ts-divider pb-6">
              <CelestialMark className="h-8 w-16 text-ts-gold" />
              <h1
                className={`max-w-3xl font-ts-display text-4xl font-semibold leading-[1.12] tracking-[-0.02em] text-ts-ink sm:text-5xl ${
                  locale === "ko"
                    ? "[word-break:keep-all]"
                    : "[text-wrap:balance]"
                }`}
              >
                {copy.sharedReading.heading}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-ts-muted">
                {copy.sharedReading.intro}
              </p>
              {currentResult &&
                currentTopic &&
                currentSpread &&
                currentReadingStyle && (
                  <div className="grid gap-1 text-sm leading-6">
                    <p className="font-semibold text-ts-action">
                      {currentTopic.label}
                    </p>
                    <p className="text-ts-muted">
                      {copy.currentReadingSettings}: {currentSpread.label} ·{" "}
                      {currentReadingStyle.label}
                    </p>
                  </div>
                )}
            </div>
          </header>

          <section
            aria-label={copy.workspaceLabel}
            className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5"
            data-testid="reading-result-observer"
            ref={resultViewTargetRef}
          >
            <CardOverview
              ariaLabel={copy.cardOverviewLabel}
              cards={cards}
              revealSequence={0}
            />
            <div data-testid="shared-reading-result-content">
              {readingResult}
            </div>
            <p className="text-xs leading-5 text-ts-muted">{copy.disclaimer}</p>
          </section>

          <footer className="border-t border-ts-divider py-6">
            <nav
              aria-label={publicPageNavigationLabel}
              className="flex flex-wrap gap-x-3 text-xs"
            >
              {publicPageLinks.map((link) => (
                <Link
                  className={footerLinkClassName}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ts-canvas text-ts-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.95fr_1.25fr] lg:items-start lg:py-10">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CelestialMark className="h-7 w-12 text-ts-gold" />
                <p className="text-sm font-semibold text-ts-action">
                  {copy.brand}
                </p>
              </div>
              <LanguageSwitch
                activeLocale={locale}
                ariaLabel={copy.languageSwitchLabel}
                links={languageLinks}
                onLocaleChange={preserveContextForLocaleChange}
              />
            </div>
            <h1
              className={`max-w-2xl font-ts-display text-4xl font-semibold leading-[1.12] tracking-[-0.02em] text-ts-ink sm:text-[2.75rem] lg:text-5xl ${
                locale === "ko"
                  ? "[word-break:keep-all]"
                  : "[text-wrap:balance]"
              }`}
            >
              {copy.heading}
            </h1>
            <p className="max-w-xl text-base leading-7 text-ts-muted">
              {copy.intro}
            </p>
            <p className="max-w-xl text-sm font-medium text-ts-action">
              {deckPreviewNote}
            </p>
          </div>

          {session.mode === "edit-next-draw" && (
            <div className="grid gap-2 rounded-ts-panel border border-ts-divider bg-ts-surface p-4">
              <h2
                className="font-ts-display text-2xl font-semibold text-ts-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                ref={editHeadingRef}
                tabIndex={-1}
              >
                {copy.editNextHeading}
              </h2>
              <p className="text-sm leading-6 text-ts-muted">
                {copy.editNextIntro}
              </p>
            </div>
          )}

          {session.mode !== "result" && (
            <>
              <TopicSelector
                ariaLabel={copy.topicSelectorLabel}
                onSelect={chooseTopic}
                selectedTopicId={formInputs.topicId}
                topics={tarotData.topics}
              />

              <SituationContextInput
                contextCountLabel={contextCountLabel}
                contextPlaceholder={selectedTopic.contextPlaceholder}
                copy={copy}
                disclosureRef={situationContextDisclosureRef}
                onContextChange={changeDraftUserContext}
                userContext={formInputs.privateContext}
              />

              <ReadingPreferences
                copy={copy}
                onSpreadChange={chooseSpread}
                onStyleChange={chooseDraftReadingStyle}
                readingStyles={tarotData.readingStyles}
                selectedSpreadId={formInputs.spreadId}
                selectedStyleId={formInputs.styleId}
                spreads={tarotData.spreads}
              />

              <div className="grid gap-2 sm:grid-cols-2">
                {session.mode === "edit-next-draw" && (
                  <button
                    className={secondaryButtonClassName}
                    onClick={cancelEditNextDraw}
                    type="button"
                  >
                    {copy.cancelEdit}
                  </button>
                )}
                <button
                  className={primaryButtonClassName}
                  onClick={startDraw}
                  type="button"
                >
                  {session.mode === "edit-next-draw"
                    ? copy.drawNext
                    : drawButtonLabel}
                </button>
              </div>
              <p className="text-xs leading-5 text-ts-muted">
                {copy.disclaimer}
              </p>
            </>
          )}

          <p
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            data-draw-announcement-sequence={drawAnnouncementRequest?.sequence}
            data-testid="draw-status"
            role="status"
          >
            {drawAnnouncement}
          </p>
        </div>

        {currentResult &&
        currentTopic &&
        currentSpread &&
        currentReadingStyle ? (
          <section
            aria-label={copy.workspaceLabel}
            className="grid gap-4 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5"
            data-testid="reading-workspace"
            ref={readingWorkspaceRef}
          >
            <div
              className="grid gap-4"
              data-testid="reading-result-observer"
              ref={resultViewTargetRef}
            >
              <div className="grid gap-1">
                <h2
                  className="font-ts-display text-2xl font-semibold text-ts-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                  ref={resultHeadingRef}
                  tabIndex={-1}
                >
                  {copy.resultHeading}
                </h2>
                <p className="text-sm font-semibold text-ts-action">
                  {currentTopic.label}
                </p>
                <p className="text-sm leading-6 text-ts-ink">
                  {currentTopic.resultFrame}
                </p>
                <p className="text-xs leading-5 text-ts-muted">
                  {copy.currentReadingSettings}: {currentSpread.label} ·{" "}
                  {currentReadingStyle.label}
                  {currentResult.inputs.privateContext.trim().length > 0
                    ? ` · ${copy.promptContextIncluded}`
                    : ""}
                </p>
              </div>

              <CardOverview
                ariaLabel={copy.cardOverviewLabel}
                cards={cards}
                revealSequence={drawSequenceId}
              />

              {readingResult}
              <p className="text-xs leading-5 text-ts-muted">
                {copy.disclaimer}
              </p>
            </div>
          </section>
        ) : (
          <section
            aria-label={copy.workspaceLabel}
            className="hidden gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5 lg:grid"
            data-testid="reading-workspace"
            ref={readingWorkspaceRef}
          >
            <CardSpread
              cardMarkLabel={copy.cardMarkLabel}
              cards={[]}
              placeholderCardName={copy.placeholderCardName}
              placeholderCardTone={copy.placeholderCardTone}
              positions={selectedPositions}
              revealSequence={0}
            />
          </section>
        )}

        <Link
          className={`${secondaryButtonClassName} w-full`}
          href={dailyQuestionPath}
        >
          {copy.dailyQuestionLink}
        </Link>
      </section>
      <footer className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
        <nav
          aria-label={publicPageNavigationLabel}
          className="flex flex-wrap justify-center gap-x-3 text-xs sm:justify-start"
        >
          {publicPageLinks.map((link) => (
            <Link
              className={footerLinkClassName}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      fallbackCopy(text);
      return;
    }
  }

  fallbackCopy(text);
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";

  try {
    document.body.append(textarea);
    textarea.select();

    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy command was rejected.");
    }
  } finally {
    textarea.remove();
  }
}

function isShareCancel(error: unknown) {
  return getErrorName(error) === "AbortError";
}

function getErrorName(error: unknown) {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return "";
  }

  const { name } = error;
  return typeof name === "string" ? name : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getShareText(
  shareTextTemplate: string,
  topicLabel: string,
  cards: readonly DrawnCard[],
  context: string,
) {
  return formatTemplateStrict(
    shareTextTemplate,
    {
      cardNames: cards.map(({ card }) => card.name).join(", "),
      topicLabel,
    },
    context,
  );
}

function getBrowserReadingUrl(
  topicId: TopicId,
  spreadId: SpreadId,
  styleId: ReadingStyleId,
  drawStyleId: ReadingStyleId,
  cards: readonly DrawnCard[],
  attribution?: ReadingUrlAttribution,
) {
  return buildReadingUrl(
    window.location.href,
    {
      cards,
      drawStyleId,
      spreadId,
      styleId,
      topicId,
    },
    attribution,
  );
}

function getShareUrl(
  shareSiteUrl: string,
  locale: Locale,
  topicId: TopicId,
  spreadId: SpreadId,
  styleId: ReadingStyleId,
  drawStyleId: ReadingStyleId,
  cards: readonly DrawnCard[],
  sourceId: ShareSourceId = "copy",
) {
  return buildReadingUrl(
    getShareBaseUrl(shareSiteUrl, locale),
    {
      cards,
      drawStyleId,
      spreadId,
      styleId,
      topicId,
    },
    {
      campaignId: "vertical-slice",
      sourceId,
    },
  );
}

function canUseKakaoShare(
  kakaoJavaScriptKey: string | undefined,
  kakaoAllowedOrigins: readonly string[],
  shareSiteUrl: string,
  currentOrigin: string,
) {
  if (!kakaoJavaScriptKey || !currentOrigin) {
    return false;
  }

  try {
    return (
      kakaoAllowedOrigins.includes(new URL(currentOrigin).origin) &&
      kakaoAllowedOrigins.includes(new URL(shareSiteUrl).origin)
    );
  } catch {
    return false;
  }
}

function subscribeToCurrentOrigin(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);

  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getCurrentOriginSnapshot() {
  return window.location.origin;
}

function getServerOriginSnapshot() {
  return "";
}

function replaceBrowserUrl(url: string) {
  window.history.replaceState(null, "", url);
}

function canNativeShare(shareData: ShareData) {
  if (typeof navigator.share !== "function") {
    return false;
  }

  return !navigator.canShare || navigator.canShare(shareData);
}

async function getInitializedKakaoSdk(javaScriptKey: string) {
  const kakao = await loadKakaoSdk();

  if (!kakao.isInitialized()) {
    kakao.init(javaScriptKey);
  }

  return kakao;
}

async function loadKakaoSdk() {
  if (window.Kakao) {
    return window.Kakao;
  }

  kakaoSdkLoadPromise =
    kakaoSdkLoadPromise ??
    new Promise<KakaoSdk>((resolve, reject) => {
      const existingScript = document.getElementById(kakaoSdkScriptId);

      if (existingScript) {
        existingScript.addEventListener("load", () => {
          resolveLoadedKakaoSdk(resolve, reject);
        });
        existingScript.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.crossOrigin = "anonymous";
      script.id = kakaoSdkScriptId;
      script.integrity = kakaoSdkIntegrity;
      script.src = kakaoSdkScriptUrl;
      script.addEventListener("load", () => {
        resolveLoadedKakaoSdk(resolve, reject);
      });
      script.addEventListener("error", reject);

      document.head.append(script);
    }).catch((error: unknown) => {
      kakaoSdkLoadPromise = undefined;
      document.getElementById(kakaoSdkScriptId)?.remove();
      throw error;
    });

  return kakaoSdkLoadPromise;
}

function resolveLoadedKakaoSdk(
  resolve: (kakao: KakaoSdk) => void,
  reject: (reason?: unknown) => void,
) {
  if (window.Kakao) {
    resolve(window.Kakao);
    return;
  }

  reject(new Error("Kakao JavaScript SDK did not attach to window."));
}

type KakaoSdk = {
  readonly Share: {
    readonly sendDefault: (args: KakaoTextShareArgs) => unknown;
  };
  readonly init: (javaScriptKey: string) => void;
  readonly isInitialized: () => boolean;
};

type KakaoTextShareArgs = {
  readonly objectType: "text";
  readonly text: string;
  readonly link: {
    readonly mobileWebUrl: string;
    readonly webUrl: string;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}
