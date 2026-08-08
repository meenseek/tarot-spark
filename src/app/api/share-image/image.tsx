import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  cardArtSources,
  legacyCardArtSources,
} from "@/components/visual/tarot-card-art-sources";
import { getTarotCardDefinition, type TarotCardId } from "@/domain/tarot";
import { getShareReadingSnapshot } from "@/features/share-reading/state";
import {
  completeDeckLegacyShareImageVersion,
  legacyShareImageVersion,
  legacyShareImageCacheControl,
  shareImageVersion,
  shareImageVersionParam,
  versionedShareImageCacheControl,
} from "@/features/share-reading/share-image-config";
import { defaultLocale, isLocale } from "@/i18n/config";

export type ShareImageModel =
  | {
      readonly kind: "legacy";
      readonly cardArtUrls: readonly string[];
    }
  | {
      readonly kind: "complete-deck";
      readonly cards: readonly ShareImageCard[];
    };

type ShareImageCard = {
  readonly artUrl: string | undefined;
  readonly id: TarotCardId;
  readonly mark: string;
  readonly name: string;
};

const cardArtDataUrls = new Map<string, string>();
const shareImageFont = readFileSync(
  path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans-kr",
    "files",
    "noto-sans-kr-korean-600-normal.woff",
  ),
);

export function getShareImageResponse(request: Request) {
  const model = getShareImageModel(request);

  if (model instanceof Response) {
    return model;
  }

  const cards =
    model.kind === "legacy"
      ? model.cardArtUrls.map((artUrl) => ({ artUrl }))
      : model.cards;
  const hasDeepSpread = cards.length > 3;
  const deepSpreadNameRows =
    model.kind === "complete-deck" && hasDeepSpread
      ? chunkCardNames(model.cards)
      : [];
  const cardWidth = hasDeepSpread ? 150 : 250;
  const cardHeight = hasDeepSpread ? 210 : 350;
  const version = new URL(request.url).searchParams.get(shareImageVersionParam);
  const isVersioned = version !== null;

  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#fbf7f2",
        display: "flex",
        height: "100%",
        padding: "42px 52px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "#fffdfc",
          border: "2px solid #d9ccd2",
          borderRadius: 30,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "34px 44px",
          position: "relative",
        }}
      >
        <CelestialRule />

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: 1,
            gap: hasDeepSpread ? 18 : 28,
            justifyContent: "center",
            width: "100%",
          }}
        >
          {cards.map((card, index) => (
            <div
              key={"id" in card ? card.id : card.artUrl}
              style={{
                background: "#fbf7f2",
                border: "3px solid #704158",
                borderRadius: hasDeepSpread ? 15 : 20,
                boxShadow: "0 14px 28px rgba(58, 38, 51, 0.14)",
                display: "flex",
                height: cardHeight + 12,
                overflow: "hidden",
                padding: 4,
                transform:
                  index % 3 === 0
                    ? "rotate(-2deg)"
                    : index % 3 === 2
                      ? "rotate(2deg)"
                      : "rotate(0deg)",
                width: cardWidth + 12,
              }}
            >
              {model.kind === "legacy" ? (
                <CardArtImage
                  cardHeight={cardHeight}
                  cardWidth={cardWidth}
                  hasDeepSpread={hasDeepSpread}
                  src={card.artUrl ?? ""}
                />
              ) : (
                <CompleteDeckCardFace
                  card={card as ShareImageCard}
                  cardHeight={cardHeight}
                  cardWidth={cardWidth}
                  hasDeepSpread={hasDeepSpread}
                  index={index}
                />
              )}
            </div>
          ))}
        </div>

        {deepSpreadNameRows.length > 0 ? (
          <div
            style={{
              alignItems: "center",
              color: "#3a2633",
              display: "flex",
              flexDirection: "column",
              fontFamily: "Noto Sans KR",
              fontSize: 25,
              gap: 2,
              lineHeight: 1.2,
              marginBottom: 12,
              textAlign: "center",
              width: "100%",
            }}
          >
            {deepSpreadNameRows.map((row) => (
              <div key={row} style={{ display: "flex" }}>
                {row}
              </div>
            ))}
          </div>
        ) : null}

        <CelestialRule />
      </div>
    </div>,
    {
      height: 630,
      headers: {
        "Cache-Control": isVersioned
          ? versionedShareImageCacheControl
          : legacyShareImageCacheControl,
      },
      ...(model.kind === "complete-deck"
        ? {
            fonts: [
              {
                data: shareImageFont,
                name: "Noto Sans KR",
                style: "normal" as const,
                weight: 600 as const,
              },
            ],
          }
        : {}),
      width: 1200,
    },
  );
}

export function getShareImageModel(
  request: Request,
): ShareImageModel | Response {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const versionValues = url.searchParams.getAll(shareImageVersionParam);
  const version = versionValues[0];

  if (
    versionValues.length > 1 ||
    (version !== undefined &&
      version !== legacyShareImageVersion &&
      version !== completeDeckLegacyShareImageVersion &&
      version !== shareImageVersion)
  ) {
    return new Response("Invalid share image version", { status: 400 });
  }

  if (
    url.searchParams.getAll("locale").length > 1 ||
    (localeParam !== null && !isLocale(localeParam))
  ) {
    return new Response("Invalid locale", { status: 400 });
  }

  const locale = localeParam ?? defaultLocale;
  const searchParams: Record<string, string | readonly string[]> = {};

  for (const key of new Set(url.searchParams.keys())) {
    if (key === "locale" || key === shareImageVersionParam) {
      continue;
    }

    const values = url.searchParams.getAll(key);
    searchParams[key] = values.length === 1 ? (values[0] ?? "") : values;
  }

  const snapshot = getShareReadingSnapshot(locale, searchParams);

  if (!snapshot) {
    return new Response("Invalid share state", { status: 400 });
  }

  const isLegacy = version === undefined || version === legacyShareImageVersion;

  if (isLegacy) {
    const artUrls = snapshot.cards.map(({ card }) =>
      getCardArtDataUrl(card.id, "legacy"),
    );

    if (artUrls.some((artUrl) => artUrl === undefined)) {
      return new Response("Unsupported legacy card art", { status: 400 });
    }

    return {
      cardArtUrls: artUrls as readonly string[],
      kind: "legacy",
    };
  }

  return {
    cards: snapshot.cards.map(({ card }) => ({
      artUrl: getCardArtDataUrl(
        card.id,
        version === shareImageVersion ? "v3" : "legacy",
      ),
      id: card.id,
      mark: getCardMark(card.id),
      name: card.name,
    })),
    kind: "complete-deck",
  };
}

function getCardArtDataUrl(
  cardId: TarotCardId,
  sourceVersion: "legacy" | "v3",
) {
  const cacheKey = `${sourceVersion}:${cardId}`;
  const cachedDataUrl = cardArtDataUrls.get(cacheKey);

  if (cachedDataUrl) {
    return cachedDataUrl;
  }

  const artSource =
    sourceVersion === "v3"
      ? cardArtSources[cardId]
      : legacyCardArtSources[cardId];

  if (!artSource) {
    return undefined;
  }

  const publicPath = artSource.replace(/^\//, "");
  const image = readFileSync(path.join(process.cwd(), "public", publicPath));
  const dataUrl = `data:image/jpeg;base64,${image.toString("base64")}`;
  cardArtDataUrls.set(cacheKey, dataUrl);

  return dataUrl;
}

function CompleteDeckCardFace({
  card,
  cardHeight,
  cardWidth,
  hasDeepSpread,
  index,
}: {
  readonly card: ShareImageCard;
  readonly cardHeight: number;
  readonly cardWidth: number;
  readonly hasDeepSpread: boolean;
  readonly index: number;
}) {
  const lines = splitCardName(card.name);
  const fontSize = getCardNameFontSize(lines, hasDeepSpread);

  if (card.artUrl) {
    return (
      <div
        style={{
          display: "flex",
          height: cardHeight,
          position: "relative",
          width: cardWidth,
        }}
      >
        <CardArtImage
          cardHeight={cardHeight}
          cardWidth={cardWidth}
          hasDeepSpread={hasDeepSpread}
          src={card.artUrl}
        />
        <div
          style={{
            alignItems: "center",
            background: "rgba(255, 253, 252, 0.94)",
            bottom: 0,
            color: "#3a2633",
            display: "flex",
            fontFamily: "Noto Sans KR",
            fontSize: hasDeepSpread ? 17 : 23,
            justifyContent: "center",
            left: 0,
            minHeight: hasDeepSpread ? 40 : 50,
            padding: "5px 8px",
            position: "absolute",
            textAlign: "center",
            width: "100%",
          }}
        >
          {card.name}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(160deg, #fffdfc 0%, #f7e9ee 55%, #efe3d5 100%)",
        borderRadius: hasDeepSpread ? 10 : 14,
        color: "#3a2633",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Noto Sans KR",
        height: cardHeight,
        justifyContent: "space-between",
        padding: hasDeepSpread ? "18px 10px" : "28px 18px",
        textAlign: "center",
        width: cardWidth,
      }}
    >
      <div
        style={{
          color: "#704158",
          display: "flex",
          fontSize: hasDeepSpread ? 14 : 19,
          letterSpacing: "0.12em",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          fontSize,
          gap: hasDeepSpread ? 1 : 4,
          justifyContent: "center",
          lineHeight: 1.18,
          width: "100%",
        }}
      >
        {lines.map((line) => (
          <div key={line} style={{ display: "flex", whiteSpace: "nowrap" }}>
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          color: "#8a6230",
          display: "flex",
          fontSize: hasDeepSpread ? 12 : 17,
          letterSpacing: "0.08em",
        }}
      >
        {card.mark}
      </div>
    </div>
  );
}

function CardArtImage({
  cardHeight,
  cardWidth,
  hasDeepSpread,
  src,
}: {
  readonly cardHeight: number;
  readonly cardWidth: number;
  readonly hasDeepSpread: boolean;
  readonly src: string;
}) {
  return (
    // ImageResponse renders data URL image nodes itself.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      height={cardHeight}
      src={src}
      style={{
        borderRadius: hasDeepSpread ? 10 : 14,
        height: cardHeight,
        objectFit: "cover",
        width: cardWidth,
      }}
      width={cardWidth}
    />
  );
}

function splitCardName(name: string) {
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words;
  }

  let bestSplit = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const difference = Math.abs(first.length - second.length);

    if (difference < smallestDifference) {
      bestSplit = index;
      smallestDifference = difference;
    }
  }

  return [
    words.slice(0, bestSplit).join(" "),
    words.slice(bestSplit).join(" "),
  ];
}

function chunkCardNames(cards: readonly ShareImageCard[]) {
  const rows: string[] = [];

  for (let index = 0; index < cards.length; index += 3) {
    rows.push(
      cards
        .slice(index, index + 3)
        .map(({ name }) => name)
        .join(" · "),
    );
  }

  return rows;
}

function getCardNameFontSize(lines: readonly string[], hasDeepSpread: boolean) {
  const longestLine = Math.max(...lines.map((line) => line.length));

  if (hasDeepSpread) {
    return longestLine > 10 ? 18 : longestLine > 7 ? 21 : 24;
  }

  return longestLine > 14 ? 30 : longestLine > 10 ? 34 : 40;
}

function getCardMark(cardId: TarotCardId) {
  const definition = getTarotCardDefinition(cardId);

  if (definition.arcana === "major") {
    return `MAJOR · ${definition.number}`;
  }

  const rank =
    definition.rank === "ace"
      ? "A"
      : definition.rank === "page"
        ? "P"
        : definition.rank === "knight"
          ? "N"
          : definition.rank === "queen"
            ? "Q"
            : definition.rank === "king"
              ? "K"
              : definition.rank;

  return `${definition.suit.toUpperCase()} · ${rank}`;
}

function CelestialRule() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 14,
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#d9ccd2",
          display: "flex",
          height: 2,
          width: 170,
        }}
      />
      <div
        style={{
          border: "3px solid #b7863e",
          display: "flex",
          height: 18,
          transform: "rotate(45deg)",
          width: 18,
        }}
      />
      <div
        style={{
          background: "#d9ccd2",
          display: "flex",
          height: 2,
          width: 170,
        }}
      />
    </div>
  );
}
