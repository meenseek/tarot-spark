"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CelestialMark } from "@/components/visual/CelestialMark";
import {
  footerLinkClassName,
  primaryButtonClassName,
} from "@/components/visual/class-names";
import {
  buildPrompt,
  drawCards,
  getDefaultTopic,
  getTopic,
  type DrawnCard,
  type LocaleTarotData,
  type TopicId,
} from "@/domain/tarot";
import type { Locale } from "@/i18n/config";
import { formatTemplateStrict } from "@/i18n/template";
import { trackEvent } from "./analytics";
import { CardSpread } from "./components/CardSpread";
import { LanguageSwitch } from "./components/LanguageSwitch";
import { ReadingResult } from "./components/ReadingResult";
import { TopicSelector } from "./components/TopicSelector";
import type { TarotReadingCopy } from "./i18n";
import type { CopyState, KakaoShareState, ShareState } from "./types";

const kakaoSdkScriptId = "kakao-javascript-sdk";
const kakaoSdkScriptUrl =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const kakaoSdkIntegrity =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";
const sharedReadingTopicParam = "topic";
const sharedReadingCardsParam = "cards";

let kakaoSdkLoadPromise: Promise<KakaoSdk> | undefined;

type PublicPageLink = {
  readonly href: string;
  readonly label: string;
};

type TarotExperienceClientProps = {
  readonly locale: Locale;
  readonly copy: TarotReadingCopy;
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
  kakaoAllowedOrigins,
  kakaoJavaScriptKey,
  publicPageLinks,
  publicPageNavigationLabel,
  shareSiteUrl,
  tarotData,
}: TarotExperienceClientProps) {
  const defaultTopic = getDefaultTopic(tarotData.topics);
  const [selectedTopicId, setSelectedTopicId] = useState<TopicId>(
    defaultTopic.id,
  );
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

  useEffect(() => {
    const sharedReading = getSharedReadingFromUrl(
      tarotData,
      window.location.href,
    );

    if (!sharedReading) {
      return;
    }

    let shouldRestore = true;

    queueMicrotask(() => {
      if (!shouldRestore) {
        return;
      }

      setSelectedTopicId(sharedReading.topicId);
      setCards([...sharedReading.cards]);
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

  const prompt = useMemo(
    () =>
      cards.length > 0
        ? buildPrompt(
            tarotData.promptTemplate,
            selectedTopic,
            cards,
            `${locale} tarot promptTemplate`,
          )
        : "",
    [cards, locale, selectedTopic, tarotData.promptTemplate],
  );
  const cardCountLabel = useMemo(
    () =>
      formatTemplateStrict(
        copy.cardCountLabel,
        {
          count: String(tarotData.spreadPositions.length),
        },
        `${locale} tarot-reading.cardCountLabel`,
      ),
    [copy.cardCountLabel, locale, tarotData.spreadPositions.length],
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
    clearSharedReadingUrl();
    trackEvent("topic_click", { locale, topic_id: topicId });
  }

  function startDraw() {
    trackEvent("draw_start", { locale, topic_id: selectedTopic.id });

    const drawnCards = drawCards(tarotData.cards, tarotData.spreadPositions);
    setCards(drawnCards);
    setCopyState("idle");
    setKakaoShareState("idle");
    setInstagramCopyState("idle");
    setUrlCopyState("idle");
    setShareState("idle");
    replaceBrowserUrl(getBrowserReadingUrl(selectedTopic.id, drawnCards));

    drawnCards.forEach(({ position, card }) => {
      trackEvent("card_selected", {
        locale,
        topic_id: selectedTopic.id,
        position_id: position.id,
        card_id: card.id,
      });
    });
    trackEvent("result_view", {
      locale,
      topic_id: selectedTopic.id,
      card_count: drawnCards.length,
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
    const shareUrl = getShareUrl(shareSiteUrl, selectedTopic.id, cards);

    setKakaoShareState("idle");
    trackEvent("share_click", {
      locale,
      topic_id: selectedTopic.id,
      card_count: cards.length,
      method: "kakaotalk",
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
    const shareUrl = getShareUrl(shareSiteUrl, selectedTopic.id, cards);
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
    });

    try {
      await writeClipboard(getShareUrl(shareSiteUrl, selectedTopic.id, cards));
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
    });

    try {
      await writeClipboard(getShareUrl(shareSiteUrl, selectedTopic.id, cards));
      setInstagramCopyState("copied");
    } catch {
      setInstagramCopyState("failed");
    }
  }

  return (
    <main className="min-h-screen bg-ts-canvas text-ts-ink">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.95fr_1.25fr] lg:items-center lg:py-10">
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

          <button
            className={primaryButtonClassName}
            onClick={startDraw}
            type="button"
          >
            {copy.drawButton}
          </button>
        </div>

        <section
          aria-label={copy.workspaceLabel}
          className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-paper sm:p-5"
          data-testid="reading-workspace"
        >
          <CardSpread
            cardMarkLabel={copy.cardMarkLabel}
            cards={cards}
            placeholders={copy.placeholders}
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

function getBrowserReadingUrl(topicId: TopicId, cards: readonly DrawnCard[]) {
  return buildSharedReadingUrl(window.location.href, topicId, cards);
}

function getShareUrl(
  shareSiteUrl: string,
  topicId: TopicId,
  cards: readonly DrawnCard[],
) {
  return buildSharedReadingUrl(
    getShareBaseUrl(shareSiteUrl, window.location.href),
    topicId,
    cards,
  );
}

function getShareBaseUrl(shareSiteUrl: string, currentHref: string) {
  const currentUrl = new URL(currentHref);
  const shareBaseUrl = new URL(shareSiteUrl);

  return new URL(
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
    shareBaseUrl,
  ).toString();
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

function buildSharedReadingUrl(
  href: string,
  topicId: TopicId,
  cards: readonly DrawnCard[],
) {
  const url = new URL(href);
  url.searchParams.set(sharedReadingTopicParam, topicId);
  url.searchParams.set(
    sharedReadingCardsParam,
    cards.map(({ card }) => card.id).join(","),
  );

  return url.toString();
}

function clearSharedReadingUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete(sharedReadingTopicParam);
  url.searchParams.delete(sharedReadingCardsParam);
  replaceBrowserUrl(url.toString());
}

function replaceBrowserUrl(url: string) {
  window.history.replaceState(null, "", url);
}

function getSharedReadingFromUrl(
  tarotData: LocaleTarotData,
  href: string,
): SharedReading | undefined {
  const url = new URL(href);
  const topicId = url.searchParams.get(sharedReadingTopicParam);
  const topic = tarotData.topics.find((candidate) => candidate.id === topicId);
  const cardsParam = url.searchParams.get(sharedReadingCardsParam);

  if (!topic || !cardsParam) {
    return undefined;
  }

  const cardIds = cardsParam.split(",");

  if (
    cardIds.length !== tarotData.spreadPositions.length ||
    new Set(cardIds).size !== cardIds.length
  ) {
    return undefined;
  }

  const cards: DrawnCard[] = [];

  for (const [index, cardId] of cardIds.entries()) {
    const position = tarotData.spreadPositions[index];
    const card = tarotData.cards.find((candidate) => candidate.id === cardId);

    if (!position || !card) {
      return undefined;
    }

    cards.push({ position, card });
  }

  return {
    cards,
    topicId: topic.id,
  };
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

type SharedReading = {
  readonly cards: readonly DrawnCard[];
  readonly topicId: TopicId;
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}
