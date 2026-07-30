"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CelestialMark } from "@/components/visual/CelestialMark";
import {
  footerLinkClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import {
  buildPrompt,
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
  type DrawnCard,
  type LocaleTarotData,
  type ReadingStyleId,
  type SpreadId,
  type TopicId,
} from "@/domain/tarot";
import { optionalServicesDocumentReloadEvent } from "@/features/privacy-consent/events";
import { localeNames, supportedLocales, type Locale } from "@/i18n/config";
import { formatTemplateStrict } from "@/i18n/template";
import { trackEvent } from "./analytics";
import { CardSpread } from "./components/CardSpread";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { ReadingPreferences } from "./components/ReadingPreferences";
import { ReadingResult } from "./components/ReadingResult";
import { TopicSelector } from "./components/TopicSelector";
import type { TarotReadingCopy } from "./i18n";
import {
  buildReadingUrl,
  consumePrivateContextHandoff,
  getLocalizedReadingHref,
  getReadingStateFromUrl,
  getShareBaseUrl,
  storePrivateContextHandoff,
} from "./reading-state";
import type { CopyState, KakaoShareState, ShareState } from "./types";

const kakaoSdkScriptId = "kakao-javascript-sdk";
const kakaoSdkScriptUrl =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const kakaoSdkIntegrity =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";

let kakaoSdkLoadPromise: Promise<KakaoSdk> | undefined;

type PublicPageLink = {
  readonly href: string;
  readonly label: string;
};

type TarotExperienceClientProps = {
  readonly locale: Locale;
  readonly copy: TarotReadingCopy;
  readonly dailyQuestionPath: string;
  readonly kakaoAllowedOrigins: readonly string[];
  readonly kakaoJavaScriptKey: string | undefined;
  readonly publicPageLinks: readonly PublicPageLink[];
  readonly publicPageNavigationLabel: string;
  readonly shareSiteUrl: string;
  readonly tarotData: LocaleTarotData;
};

export function TarotExperienceClient({
  locale,
  copy,
  dailyQuestionPath,
  kakaoAllowedOrigins,
  kakaoJavaScriptKey,
  publicPageLinks,
  publicPageNavigationLabel,
  shareSiteUrl,
  tarotData,
}: TarotExperienceClientProps) {
  const defaultTopic = getDefaultTopic(tarotData.topics);
  const defaultSpread = getDefaultSpread(tarotData.spreads);
  const defaultReadingStyle = getDefaultReadingStyle(tarotData.readingStyles);
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId>(
    defaultTopic.id,
  );
  const [selectedSpreadId, setSelectedSpreadId] = useState<SpreadId>(
    defaultSpread.id,
  );
  const [selectedStyleId, setSelectedStyleId] = useState<ReadingStyleId>(
    defaultReadingStyle.id,
  );
  const [userContext, setUserContext] = useState("");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [kakaoShareState, setKakaoShareState] =
    useState<KakaoShareState>("idle");
  const [instagramCopyState, setInstagramCopyState] =
    useState<CopyState>("idle");
  const [urlCopyState, setUrlCopyState] = useState<CopyState>("idle");
  const [shareState, setShareState] = useState<ShareState>("idle");
  const currentOrigin = useSyncExternalStore(
    subscribeToCurrentOrigin,
    getCurrentOriginSnapshot,
    getServerOriginSnapshot,
  );
  const hasKakaoShare = canUseKakaoShare(
    kakaoJavaScriptKey,
    kakaoAllowedOrigins,
    shareSiteUrl,
    currentOrigin,
  );

  const selectedTopic = getTopic(tarotData.topics, selectedTopicId);
  const selectedSpread = getSpread(tarotData.spreads, selectedSpreadId);
  const selectedPositions = useMemo(
    () => getSpreadPositions(selectedSpread, tarotData.spreadPositions),
    [selectedSpread, tarotData.spreadPositions],
  );
  const selectedReadingStyle = getReadingStyle(
    tarotData.readingStyles,
    selectedStyleId,
  );
  const readingLens = useMemo(
    () =>
      cards.length > 0
        ? getReadingLens(tarotData.readingLenses, selectedTopic.id, cards)
        : undefined,
    [cards, selectedTopic.id, tarotData.readingLenses],
  );

  useEffect(() => {
    const restoredReading = getReadingStateFromUrl(
      tarotData,
      window.location.href,
    );
    const transferredContext = consumePrivateContextHandoff(
      window.sessionStorage,
    );

    if (!restoredReading && transferredContext === undefined) {
      return;
    }

    let shouldRestore = true;

    queueMicrotask(() => {
      if (!shouldRestore) {
        return;
      }

      if (restoredReading) {
        setSelectedTopicId(restoredReading.topicId);
        setSelectedSpreadId(restoredReading.spreadId);
        setSelectedStyleId(restoredReading.styleId);
        setCards([...restoredReading.cards]);
      }

      if (transferredContext !== undefined) {
        setUserContext(transferredContext);
      }
      setCopyState("idle");
      setKakaoShareState("idle");
      setInstagramCopyState("idle");
      setUrlCopyState("idle");
      setShareState("idle");
    });

    return () => {
      shouldRestore = false;
    };
  }, [tarotData]);

  useEffect(() => {
    const preserveContextBeforeReload = () => {
      storePrivateContextHandoff(window.sessionStorage, userContext);
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
  }, [userContext]);

  const prompt = useMemo(
    () =>
      cards.length > 0 && readingLens
        ? buildPrompt(
            {
              cards,
              lens: readingLens,
              readingStyle: selectedReadingStyle,
              spread: selectedSpread,
              template: tarotData.promptTemplate,
              topic: selectedTopic,
              userContext,
            },
            `${locale} tarot promptTemplate`,
          )
        : "",
    [
      cards,
      locale,
      readingLens,
      selectedReadingStyle,
      selectedSpread,
      selectedTopic,
      tarotData.promptTemplate,
      userContext,
    ],
  );
  const cardCountLabel = useMemo(
    () =>
      formatTemplateStrict(
        copy.cardCountLabel,
        {
          count: String(selectedPositions.length),
        },
        `${locale} tarot-reading.cardCountLabel`,
      ),
    [copy.cardCountLabel, locale, selectedPositions.length],
  );
  const contextCountLabel = useMemo(
    () =>
      formatTemplateStrict(
        copy.contextCountLabel,
        {
          count: String(userContext.length),
          max: String(maxUserContextLength),
        },
        `${locale} tarot-reading.contextCountLabel`,
      ),
    [copy.contextCountLabel, locale, userContext.length],
  );
  const languageLinks = useMemo(
    () =>
      supportedLocales.map((targetLocale) => ({
        href: getLocalizedReadingHref(targetLocale, {
          cards,
          spreadId: selectedSpread.id,
          styleId: selectedReadingStyle.id,
          topicId: selectedTopic.id,
        }),
        label: localeNames[targetLocale],
        locale: targetLocale,
      })),
    [cards, selectedReadingStyle.id, selectedSpread.id, selectedTopic.id],
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
    setSelectedTopicId(topicId);
    setCards([]);
    setCopyState("idle");
    setKakaoShareState("idle");
    setInstagramCopyState("idle");
    setUrlCopyState("idle");
    setShareState("idle");
    replaceBrowserUrl(
      getBrowserReadingUrl(
        topicId,
        selectedSpread.id,
        selectedReadingStyle.id,
        [],
      ),
    );
    trackEvent("topic_click", { locale, topic_id: topicId });
  }

  function chooseSpread(spreadId: SpreadId) {
    setSelectedSpreadId(spreadId);
    setCards([]);
    setCopyState("idle");
    setKakaoShareState("idle");
    setInstagramCopyState("idle");
    setUrlCopyState("idle");
    setShareState("idle");
    replaceBrowserUrl(
      getBrowserReadingUrl(
        selectedTopic.id,
        spreadId,
        selectedReadingStyle.id,
        [],
      ),
    );
  }

  function chooseReadingStyle(styleId: ReadingStyleId) {
    setSelectedStyleId(styleId);
    setCopyState("idle");
    replaceBrowserUrl(
      getBrowserReadingUrl(selectedTopic.id, selectedSpread.id, styleId, cards),
    );
  }

  function changeUserContext(value: string) {
    setUserContext(value);
    setCopyState("idle");
  }

  function preserveContextForLocaleChange(targetLocale: Locale) {
    if (targetLocale !== locale) {
      storePrivateContextHandoff(window.sessionStorage, userContext);
    }
  }

  function startDraw() {
    trackEvent("draw_start", {
      locale,
      topic_id: selectedTopic.id,
      spread_id: selectedSpread.id,
      style_id: selectedReadingStyle.id,
    });

    const drawnCards = drawCards(tarotData.cards, selectedPositions);
    setCards(drawnCards);
    setCopyState("idle");
    setKakaoShareState("idle");
    setInstagramCopyState("idle");
    setUrlCopyState("idle");
    setShareState("idle");
    replaceBrowserUrl(
      getBrowserReadingUrl(
        selectedTopic.id,
        selectedSpread.id,
        selectedReadingStyle.id,
        drawnCards,
      ),
    );

    drawnCards.forEach(({ position, card }) => {
      trackEvent("card_selected", {
        locale,
        topic_id: selectedTopic.id,
        position_id: position.id,
        card_id: card.id,
        spread_id: selectedSpread.id,
        style_id: selectedReadingStyle.id,
      });
    });
    trackEvent("result_view", {
      locale,
      topic_id: selectedTopic.id,
      card_count: drawnCards.length,
      spread_id: selectedSpread.id,
      style_id: selectedReadingStyle.id,
    });
  }

  async function copyPrompt() {
    if (!prompt) {
      return;
    }

    try {
      await writeClipboard(prompt);
      setCopyState("copied");
      trackEvent("prompt_copy", {
        locale,
        topic_id: selectedTopic.id,
        card_count: cards.length,
        spread_id: selectedSpread.id,
        style_id: selectedReadingStyle.id,
      });
    } catch {
      setCopyState("failed");
    }
  }

  async function shareToKakaoTalk() {
    if (cards.length === 0 || !kakaoJavaScriptKey) {
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
      setKakaoShareState("failed");
      return;
    }

    const shareText = getShareText(
      copy.shareText,
      selectedTopic.label,
      cards,
      `${locale} tarot-reading.shareText`,
    );
    const shareUrl = getShareUrl(
      shareSiteUrl,
      selectedTopic.id,
      selectedSpread.id,
      selectedReadingStyle.id,
      cards,
    );

    setKakaoShareState("idle");
    trackEvent("share_click", {
      locale,
      topic_id: selectedTopic.id,
      card_count: cards.length,
      method: "kakaotalk",
      spread_id: selectedSpread.id,
      style_id: selectedReadingStyle.id,
    });

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
      setKakaoShareState("opened");
    } catch {
      setKakaoShareState("failed");
    }
  }

  async function shareReading() {
    if (cards.length === 0) {
      return;
    }

    const shareText = getShareText(
      copy.shareText,
      selectedTopic.label,
      cards,
      `${locale} tarot-reading.shareText`,
    );
    const shareUrl = getShareUrl(
      shareSiteUrl,
      selectedTopic.id,
      selectedSpread.id,
      selectedReadingStyle.id,
      cards,
    );
    const shareData = {
      title: copy.shareTitle,
      text: shareText,
      url: shareUrl,
    } satisfies ShareData;
    const canShare = canNativeShare(shareData);

    setShareState("idle");
    trackEvent("share_click", {
      locale,
      topic_id: selectedTopic.id,
      card_count: cards.length,
      method: canShare ? "native" : "clipboard",
      spread_id: selectedSpread.id,
      style_id: selectedReadingStyle.id,
    });

    try {
      if (canShare && navigator.share) {
        await navigator.share(shareData);
        setShareState("shared");
      } else {
        await writeClipboard(`${shareText}\n${shareUrl}`);
        setShareState("copied");
      }
    } catch (error) {
      if (isShareCancel(error)) {
        setShareState("idle");
        return;
      }

      setShareState("failed");
    }
  }

  async function copyShareUrl() {
    if (cards.length === 0) {
      return;
    }

    setUrlCopyState("idle");
    trackEvent("share_click", {
      locale,
      topic_id: selectedTopic.id,
      card_count: cards.length,
      method: "copy_url",
      spread_id: selectedSpread.id,
      style_id: selectedReadingStyle.id,
    });

    try {
      await writeClipboard(
        getShareUrl(
          shareSiteUrl,
          selectedTopic.id,
          selectedSpread.id,
          selectedReadingStyle.id,
          cards,
        ),
      );
      setUrlCopyState("copied");
    } catch {
      setUrlCopyState("failed");
    }
  }

  async function copyInstagramShareUrl() {
    if (cards.length === 0) {
      return;
    }

    setInstagramCopyState("idle");
    trackEvent("share_click", {
      locale,
      topic_id: selectedTopic.id,
      card_count: cards.length,
      method: "instagram_copy_url",
      spread_id: selectedSpread.id,
      style_id: selectedReadingStyle.id,
    });

    try {
      await writeClipboard(
        getShareUrl(
          shareSiteUrl,
          selectedTopic.id,
          selectedSpread.id,
          selectedReadingStyle.id,
          cards,
        ),
      );
      setInstagramCopyState("copied");
    } catch {
      setInstagramCopyState("failed");
    }
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

          <TopicSelector
            ariaLabel={copy.topicSelectorLabel}
            cardCountLabel={cardCountLabel}
            onSelect={chooseTopic}
            selectedTopicId={selectedTopicId}
            topics={tarotData.topics}
          />

          <ReadingPreferences
            contextCountLabel={contextCountLabel}
            copy={copy}
            onContextChange={changeUserContext}
            onSpreadChange={chooseSpread}
            onStyleChange={chooseReadingStyle}
            readingStyles={tarotData.readingStyles}
            selectedSpreadId={selectedSpread.id}
            selectedStyleId={selectedReadingStyle.id}
            spreads={tarotData.spreads}
            userContext={userContext}
          />

          <button
            className={primaryButtonClassName}
            onClick={startDraw}
            type="button"
          >
            {copy.drawButton}
          </button>
          <Link
            className={`${secondaryButtonClassName} w-full`}
            href={dailyQuestionPath}
          >
            {copy.dailyQuestionLink}
          </Link>
        </div>

        <section
          aria-label={copy.workspaceLabel}
          className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5"
          data-testid="reading-workspace"
        >
          <CardSpread
            cardMarkLabel={copy.cardMarkLabel}
            cards={cards}
            placeholderCardName={copy.placeholderCardName}
            placeholderCardTone={copy.placeholderCardTone}
            positions={selectedPositions}
          />

          <ReadingResult
            cards={cards}
            copy={copy}
            copyState={copyState}
            hasKakaoShare={hasKakaoShare}
            instagramCopyState={instagramCopyState}
            kakaoShareState={kakaoShareState}
            onInstagramShare={copyInstagramShareUrl}
            onKakaoShare={shareToKakaoTalk}
            onCopyPrompt={copyPrompt}
            onCopyUrl={copyShareUrl}
            onShareReading={shareReading}
            prompt={prompt}
            readingLens={readingLens}
            selectedTopic={selectedTopic}
            shareState={shareState}
            urlCopyState={urlCopyState}
          />

          <p className="text-xs leading-5 text-ts-muted">{copy.disclaimer}</p>
        </section>
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
  cards: readonly DrawnCard[],
) {
  return buildReadingUrl(window.location.href, {
    cards,
    spreadId,
    styleId,
    topicId,
  });
}

function getShareUrl(
  shareSiteUrl: string,
  topicId: TopicId,
  spreadId: SpreadId,
  styleId: ReadingStyleId,
  cards: readonly DrawnCard[],
) {
  return buildReadingUrl(getShareBaseUrl(shareSiteUrl, window.location.href), {
    cards,
    spreadId,
    styleId,
    topicId,
  });
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
