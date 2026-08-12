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
import { SiteShell } from "@/components/layout/SiteShell";
import { CelestialMark } from "@/components/visual/CelestialMark";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import {
  buildPrompt,
  drawCards,
  getDefaultReadingStyle,
  getDefaultSpread,
  getDefaultTopic,
  getAnswerTarget,
  getReadingStyle,
  getSpread,
  getTopic,
  maxUserContextLength,
  parseInstantReadingResponse,
  type DrawnCard,
  type InstantReadingRequest,
  type InstantReading,
  type LocaleTarotData,
  type ReadingStyleId,
  type SpreadId,
  type TopicId,
} from "@/domain/tarot";
import { optionalServicesDocumentReloadEvent } from "@/features/privacy-consent/events";
import type {
  RelationshipQuestion,
  RelationshipQuestionId,
} from "@/features/relationship-questions/registry";
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
import { RelationshipQuestionSelector } from "./components/RelationshipQuestionSelector";
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
const instantReadingClientTimeoutMs = 22_000;
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
  readonly relationshipQuestions: readonly RelationshipQuestion[];
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
  relationshipQuestions,
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
        ...(seedReadingState?.questionId
          ? { questionId: seedReadingState.questionId }
          : {}),
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
  const [instantReading, setInstantReading] = useState<InstantReading>();
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
  const resultViewTargetRef = useRef<HTMLElement | null>(null);
  const readingWorkspaceRef = useRef<HTMLElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const editHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const situationContextDisclosureRef = useRef<HTMLDetailsElement | null>(null);
  const shouldScrollToResultRef = useRef(false);
  const resultScrollBehaviorRef = useRef<ScrollBehavior>("auto");
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
  const selectedTopic = getTopic(tarotData.topics, formInputs.topicId);
  const selectedSpread = getSpread(tarotData.spreads, formInputs.spreadId);
  const selectedQuestion = formInputs.questionId
    ? relationshipQuestions.find(
        (question) => question.id === formInputs.questionId,
      )
    : undefined;
  const currentTopic = currentResult
    ? getTopic(tarotData.topics, currentResult.inputs.topicId)
    : undefined;
  const currentSpread = currentResult
    ? getSpread(tarotData.spreads, currentResult.inputs.spreadId)
    : undefined;
  const currentReadingStyle = currentResult
    ? getReadingStyle(tarotData.readingStyles, currentResult.inputs.styleId)
    : undefined;
  const currentQuestion = currentResult?.inputs.questionId
    ? relationshipQuestions.find(
        (question) => question.id === currentResult.inputs.questionId,
      )
    : undefined;
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
            ...(currentResult.inputs.questionId
              ? { question_id: currentResult.inputs.questionId }
              : {}),
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
      behavior: prefersReducedMotion ? "auto" : resultScrollBehaviorRef.current,
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

  const prompt = useMemo(
    () =>
      currentResult && currentTopic && currentSpread && currentReadingStyle
        ? buildPrompt(
            {
              answerTarget: getAnswerTarget(
                tarotData.answerTargets,
                currentQuestion?.defaultAnswerTargetId ??
                  currentTopic.taxonomy.defaultAnswerTargetId,
              ),
              cards,
              readingStyle: currentReadingStyle,
              ...(currentQuestion
                ? {
                    questionFocus: currentQuestion.focus,
                  }
                : {}),
              spread: currentSpread,
              template: tarotData.promptTemplate,
              topic: currentTopic,
              userContext: currentResult.inputs.privateContext,
            },
            `${locale} tarot promptTemplate`,
          )
        : "",
    [
      cards,
      currentReadingStyle,
      currentQuestion,
      currentResult,
      currentSpread,
      currentTopic,
      locale,
      tarotData.answerTargets,
      tarotData.promptTemplate,
    ],
  );
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
        { count: String(selectedSpread.cardCount) },
        `${locale} tarot-reading.drawButton`,
      ),
    [copy.drawButton, locale, selectedSpread.cardCount],
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
            ...(currentResult.inputs.questionId
              ? { questionId: currentResult.inputs.questionId }
              : {}),
          }
        : {
            cards: emptyDrawnCards,
            drawStyleId: formInputs.styleId,
            spreadId: formInputs.spreadId,
            styleId: formInputs.styleId,
            topicId: formInputs.topicId,
            ...(formInputs.questionId
              ? { questionId: formInputs.questionId }
              : {}),
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
          undefined,
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

  function chooseRelationshipQuestion(questionId: RelationshipQuestionId) {
    if (session.mode === "result" || formInputs.questionId === questionId) {
      return;
    }

    const question = relationshipQuestions.find(({ id }) => id === questionId);

    if (!question) {
      return;
    }

    dispatchSession({ type: "SET_DRAFT_QUESTION", questionId });
    if (session.mode === "setup") {
      replaceBrowserUrl(
        getBrowserReadingUrl(
          question.topicId,
          formInputs.spreadId,
          formInputs.styleId,
          formInputs.styleId,
          [],
          questionId,
          readingAttribution,
        ),
      );
    }
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
          formInputs.questionId,
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
          formInputs.questionId,
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
        currentResult.inputs.questionId,
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
      const resultContentRoot =
        viewMode === "generator"
          ? readingWorkspaceRef.current
          : resultViewTargetRef.current;

      resultContentRoot?.querySelectorAll("details").forEach((details) => {
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

    performDraw(event, formInputs);
  }

  function performDraw(
    event: MouseEvent<HTMLButtonElement>,
    inputs: typeof formInputs,
  ) {
    resetInstantReading();
    shouldScrollToResultRef.current = true;
    resultScrollBehaviorRef.current = event.detail > 0 ? "smooth" : "auto";
    shouldFocusResultRef.current = true;
    trackEvent("draw_start", {
      ...analyticsAttribution,
      locale,
      topic_id: inputs.topicId,
      draw_style_id: inputs.styleId,
      spread_id: inputs.spreadId,
      style_id: inputs.styleId,
      ...(inputs.questionId ? { question_id: inputs.questionId } : {}),
    });

    const spread = getSpread(tarotData.spreads, inputs.spreadId);
    const drawnCards = drawCards(tarotData.cards, spread.cardCount);
    const nextDrawSequenceId = drawSequenceIdRef.current + 1;
    drawSequenceIdRef.current = nextDrawSequenceId;
    setDrawSequenceId(nextDrawSequenceId);
    setDrawAnnouncement("");
    setDrawAnnouncementRequest({
      cardCount: drawnCards.length,
      sequence: nextDrawSequenceId,
    });
    dispatchSession({ type: "DRAW_COMMIT", cards: drawnCards });
    setCopyState("idle");
    setShareFeedback(undefined);
    replaceBrowserUrl(
      getBrowserReadingUrl(
        inputs.topicId,
        inputs.spreadId,
        inputs.styleId,
        inputs.styleId,
        drawnCards,
        inputs.questionId,
        readingAttribution,
      ),
    );

    drawnCards.forEach(({ card }, index) => {
      trackEvent("card_selected", {
        ...analyticsAttribution,
        locale,
        topic_id: inputs.topicId,
        card_order: index + 1,
        card_id: card.id,
        draw_style_id: inputs.styleId,
        spread_id: inputs.spreadId,
        style_id: inputs.styleId,
        ...(inputs.questionId ? { question_id: inputs.questionId } : {}),
      });
    });
  }

  async function generateInstantReading() {
    if (
      !instantReadingEnabled ||
      locale !== "ko" ||
      cards.length === 0 ||
      !currentResult
    ) {
      return;
    }

    instantReadingRequestRef.current?.abort();
    const controller = new AbortController();
    instantReadingRequestRef.current = controller;
    const readingRequest = {
      cards: cards.map(({ card }) => ({ cardId: card.id })),
      spreadId: currentResult.inputs.spreadId,
      styleId: currentResult.inputs.styleId,
      topicId: currentResult.inputs.topicId,
      ...(currentResult.inputs.questionId
        ? { questionId: currentResult.inputs.questionId }
        : {}),
    } satisfies InstantReadingRequest;

    setInstantReading(undefined);
    setInstantReadingStatus("loading");
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, instantReadingClientTimeoutMs);

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
      const nextReading = parseInstantReadingResponse(payload, readingRequest);

      if (!nextReading) {
        throw new Error("Instant reading response is invalid.");
      }

      if (instantReadingRequestRef.current === controller) {
        setInstantReading(nextReading);
        setInstantReadingStatus("success");
      }
    } catch (error) {
      if (instantReadingRequestRef.current !== controller) {
        return;
      }

      if (
        controller.signal.aborted &&
        !timedOut &&
        getErrorName(error) === "AbortError"
      ) {
        return;
      }

      setInstantReading(undefined);
      setInstantReadingStatus("unavailable");
    } finally {
      window.clearTimeout(timeoutId);
      if (instantReadingRequestRef.current === controller) {
        instantReadingRequestRef.current = undefined;
      }
    }
  }

  function cancelInstantReading() {
    const controller = instantReadingRequestRef.current;
    instantReadingRequestRef.current = undefined;
    controller?.abort();
    setInstantReading(undefined);
    setInstantReadingStatus("idle");
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
    const promptChangeId = currentResult.promptChangeId;
    const analyticsInvocation = captureAnalyticsInvocation();
    const analyticsPayload = {
      ...analyticsAttribution,
      locale,
      topic_id: currentResult.inputs.topicId,
      card_count: currentResult.cards.length,
      draw_style_id: currentResult.drawStyleId,
      spread_id: currentResult.inputs.spreadId,
      style_id: currentResult.inputs.styleId,
      surface: "reading_result",
      ...(currentResult.inputs.questionId
        ? { question_id: currentResult.inputs.questionId }
        : {}),
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
        activeResult?.promptChangeId === promptChangeId
      ) {
        setCopyState("copied");
      }
    } catch {
      const activeSession = sessionRef.current;
      if (
        promptOperationIdRef.current === operationId &&
        activeSession.mode !== "setup" &&
        activeSession.current.promptChangeId === promptChangeId
      ) {
        setCopyState("failed");
      }
    }
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
      currentResult.inputs.questionId,
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
      currentResult.inputs.questionId,
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
          currentResult.inputs.questionId,
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
          currentResult.inputs.questionId,
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
      shareChangeId: currentResult.shareChangeId,
      payload: {
        ...analyticsAttribution,
        locale,
        topic_id: currentResult.inputs.topicId,
        card_count: currentResult.cards.length,
        draw_style_id: currentResult.drawStyleId,
        method,
        spread_id: currentResult.inputs.spreadId,
        style_id: currentResult.inputs.styleId,
        ...(currentResult.inputs.questionId
          ? { question_id: currentResult.inputs.questionId }
          : {}),
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
      activeResult?.shareChangeId !== attempt.shareChangeId
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
        currentResult.inputs.questionId,
        "copy",
      )
    : "";
  function renderReadingResult() {
    return (
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
        instantReadingEnabled={
          viewMode === "generator" && instantReadingEnabled
        }
        instantReadingStatus={instantReadingStatus}
        onCancelInstantReading={cancelInstantReading}
        onGenerateInstantReading={generateInstantReading}
        onInstagramShare={copyInstagramShareUrl}
        onKakaoShare={shareToKakaoTalk}
        onCopyPrompt={copyPrompt}
        onCopyUrl={copyShareUrl}
        onShareReading={shareReading}
        prompt={prompt}
        {...(viewMode === "generator"
          ? { promptReadyRef: resultViewTargetRef }
          : {})}
        resultActions={
          viewMode === "generator" && session.mode === "result" ? (
            <button
              className={`${secondaryButtonClassName} w-full sm:w-fit`}
              data-testid="next-reading-action"
              onClick={enterEditNextDraw}
              ref={editTriggerRef}
              type="button"
            >
              {copy.editNextReading}
            </button>
          ) : viewMode === "generator" && session.mode === "edit-next-draw" ? (
            <section
              aria-labelledby="edit-next-reading-heading"
              className="grid gap-6 rounded-ts-panel border border-ts-divider bg-ts-canvas p-4 sm:p-5"
              data-testid="next-reading-editor"
            >
              {readingSetupForm}
            </section>
          ) : undefined
        }
        shareFeedback={shareFeedback}
        shareUrl={manualShareUrl}
      />
    );
  }

  const generatorIntroduction = (
    <div
      className="grid content-start gap-3 sm:gap-4"
      data-testid="generator-intro"
    >
      <CelestialMark className="h-8 w-16 text-ts-gold" />
      <h1
        className={`max-w-2xl font-ts-display text-4xl font-semibold leading-[1.12] tracking-[-0.02em] text-ts-ink sm:text-[2.75rem] lg:text-5xl ${
          locale === "ko" ? "[word-break:keep-all]" : "[text-wrap:balance]"
        }`}
      >
        {copy.heading}
      </h1>
      <p className="max-w-xl text-base leading-7 text-ts-muted">{copy.intro}</p>
      <p className="max-w-xl text-sm font-medium text-ts-action">
        {deckPreviewNote}
      </p>
    </div>
  );

  const readingSetupForm = session.mode !== "result" && (
    <div className="grid gap-3 sm:gap-6" data-testid="reading-setup-form">
      {session.mode === "edit-next-draw" && (
        <div className="grid gap-2">
          <h2
            className="font-ts-display text-2xl font-semibold text-ts-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
            id="edit-next-reading-heading"
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

      {selectedQuestion ? (
        <aside
          className="grid gap-2 rounded-ts-panel border border-ts-gold/50 bg-ts-surface p-4"
          data-testid="selected-relationship-question"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ts-action">
            {copy.selectedQuestionLabel}
          </p>
          <p className="font-ts-display text-xl font-semibold leading-7 text-ts-ink">
            {selectedQuestion.title}
          </p>
          <p className="text-sm leading-6 text-ts-muted">
            {copy.selectedQuestionHelp}
          </p>
          <div className="grid gap-1 border-l-2 border-ts-gold pl-3">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ts-action">
              {copy.selectedQuestionFocusLabel}
            </p>
            <p className="text-sm leading-6 text-ts-ink">
              {selectedQuestion.focus}
            </p>
          </div>
          <RelationshipQuestionSelector
            label={copy.changeQuestionLabel}
            onSelect={chooseRelationshipQuestion}
            questions={relationshipQuestions}
            selectedQuestionId={selectedQuestion.id}
          />
        </aside>
      ) : null}

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

      <div
        className={`grid gap-2 ${
          session.mode === "edit-next-draw" ? "sm:grid-cols-2" : ""
        }`}
        data-testid="reading-setup-actions"
      >
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
          {drawButtonLabel}
        </button>
      </div>
      {session.mode === "setup" && (
        <p className="text-xs leading-5 text-ts-muted">{copy.disclaimer}</p>
      )}
    </div>
  );

  const readingWorkspace = (
    <section
      aria-label={copy.workspaceLabel}
      className={`${session.mode === "setup" ? "hidden lg:grid" : "grid"} gap-4 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5`}
      data-testid="reading-workspace"
      ref={readingWorkspaceRef}
    >
      {currentResult && currentTopic && currentSpread && currentReadingStyle ? (
        <div className="grid gap-4" data-testid="reading-result-observer">
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
            {currentQuestion ? (
              <p
                className="text-sm font-medium leading-6 text-ts-ink"
                data-testid="current-relationship-question"
              >
                {copy.selectedQuestionLabel}: {currentQuestion.title}
              </p>
            ) : null}
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
            retryLabel={copy.instantReading.retry}
            revealSequence={drawSequenceId}
          />

          {renderReadingResult()}
          <p className="text-xs leading-5 text-ts-muted">{copy.disclaimer}</p>
        </div>
      ) : (
        <CardSpread
          cardMarkLabel={copy.cardMarkLabel}
          cards={[]}
          cardCount={selectedSpread.cardCount}
          placeholderCardName={copy.placeholderCardName}
          retryLabel={copy.instantReading.retry}
          revealSequence={0}
        />
      )}
    </section>
  );

  const drawStatus = (
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
  );

  if (viewMode === "shared") {
    return (
      <SiteShell
        brand={copy.brand}
        brandHref={createOwnReadingHref}
        footerAriaLabel={publicPageNavigationLabel}
        footerLinks={publicPageLinks}
        localeControl={
          <LanguageSwitch
            activeLocale={locale}
            ariaLabel={copy.languageSwitchLabel}
            links={languageLinks}
            onLocaleChange={preserveContextForLocaleChange}
          />
        }
      >
        <section
          className="mx-auto grid w-full max-w-4xl flex-1 gap-6 py-8"
          data-testid="shared-reading-view"
        >
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
                  {currentQuestion ? (
                    <p className="font-medium text-ts-ink">
                      {copy.selectedQuestionLabel}: {currentQuestion.title}
                    </p>
                  ) : null}
                  <p className="text-ts-muted">
                    {copy.currentReadingSettings}: {currentSpread.label} ·{" "}
                    {currentReadingStyle.label}
                  </p>
                </div>
              )}
          </div>

          <section
            aria-label={copy.workspaceLabel}
            className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5"
            data-testid="reading-result-observer"
            ref={resultViewTargetRef}
          >
            <CardOverview
              ariaLabel={copy.cardOverviewLabel}
              cards={cards}
              retryLabel={copy.instantReading.retry}
              revealSequence={0}
            />
            <div data-testid="shared-reading-result-content">
              {renderReadingResult()}
            </div>
            <p className="text-xs leading-5 text-ts-muted">{copy.disclaimer}</p>
          </section>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell
      brand={copy.brand}
      brandHref={createOwnReadingHref}
      footerAriaLabel={publicPageNavigationLabel}
      footerLinks={publicPageLinks}
      localeControl={
        <LanguageSwitch
          activeLocale={locale}
          ariaLabel={copy.languageSwitchLabel}
          links={languageLinks}
          onLocaleChange={preserveContextForLocaleChange}
        />
      }
    >
      <section
        className="grid flex-1 gap-8 py-8"
        data-layout-mode={session.mode}
        data-testid="generator-layout"
      >
        <div
          className={`w-full gap-8 ${
            session.mode === "setup"
              ? "grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
              : "mx-auto grid max-w-5xl"
          }`}
          data-testid="generator-state-layout"
        >
          <div className="lg:col-start-1 lg:row-start-1">
            {generatorIntroduction}
          </div>
          {session.mode === "setup" && (
            <section
              className="mx-auto w-full max-w-4xl sm:rounded-ts-panel sm:border sm:border-ts-divider sm:bg-ts-surface sm:p-7 sm:shadow-ts-paper lg:col-span-2 lg:row-start-2"
              data-testid="reading-setup-panel"
            >
              {readingSetupForm}
            </section>
          )}
          <div
            className={
              session.mode === "setup"
                ? "lg:col-start-2 lg:row-start-1"
                : undefined
            }
          >
            {readingWorkspace}
          </div>
        </div>

        <Link
          className={`${secondaryButtonClassName} mx-auto w-full max-w-4xl`}
          data-testid="daily-question-link"
          href={dailyQuestionPath}
        >
          {copy.dailyQuestionLink}
        </Link>
        {drawStatus}
      </section>
    </SiteShell>
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
  questionId: RelationshipQuestionId | undefined,
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
      ...(questionId ? { questionId } : {}),
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
  questionId: RelationshipQuestionId | undefined,
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
      ...(questionId ? { questionId } : {}),
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
