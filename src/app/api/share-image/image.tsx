import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cardArtSources } from "@/components/visual/tarot-card-art-sources";
import type { TarotCardId } from "@/domain/tarot";
import {
  legacyShareImageQueryParam,
  legacyShareImageQueryValue,
  privateShareImageCacheControl,
  shareImageCacheControl,
} from "@/features/share-reading/share-image-config";
import { getShareReadingSnapshot } from "@/features/share-reading/state";
import { defaultLocale, isLocale } from "@/i18n/config";

export type ShareImageModel = {
  readonly cards: readonly ShareImageCard[];
};

type ShareImageCard = {
  readonly artUrl: string;
  readonly id: TarotCardId;
  readonly name: string;
};

const cardArtDataUrls = new Map<TarotCardId, string>();
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

  const hasDeepSpread = model.cards.length > 3;
  const deepSpreadNameRows = hasDeepSpread ? chunkCardNames(model.cards) : [];
  const cardWidth = hasDeepSpread ? 150 : 250;
  const cardHeight = hasDeepSpread ? 210 : 350;

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
          {model.cards.map((card, index) => (
            <div
              key={card.id}
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
              <ShareImageCardFace
                card={card}
                cardHeight={cardHeight}
                cardWidth={cardWidth}
                hasDeepSpread={hasDeepSpread}
              />
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
      fonts: [
        {
          data: shareImageFont,
          name: "Noto Sans KR",
          style: "normal" as const,
          weight: 600 as const,
        },
      ],
      height: 630,
      headers: {
        "Cache-Control": shareImageCacheControl,
      },
      width: 1200,
    },
  );
}

export function getShareImageModel(
  request: Request,
): ShareImageModel | Response {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const legacyValues = url.searchParams.getAll(legacyShareImageQueryParam);

  if (
    legacyValues.length > 1 ||
    (legacyValues.length === 1 &&
      legacyValues[0] !== legacyShareImageQueryValue)
  ) {
    return invalidShareImage("Invalid legacy share image URL");
  }

  if (
    url.searchParams.getAll("locale").length > 1 ||
    (localeParam !== null && !isLocale(localeParam))
  ) {
    return invalidShareImage("Invalid locale");
  }

  const locale = localeParam ?? defaultLocale;
  const searchParams: Record<string, string | readonly string[]> = {};

  for (const key of new Set(url.searchParams.keys())) {
    if (key === "locale" || key === legacyShareImageQueryParam) {
      continue;
    }

    const values = url.searchParams.getAll(key);
    searchParams[key] = values.length === 1 ? (values[0] ?? "") : values;
  }

  const snapshot = getShareReadingSnapshot(locale, searchParams);

  if (!snapshot) {
    return invalidShareImage("Invalid share state");
  }

  if (legacyValues.length === 1) {
    url.searchParams.delete(legacyShareImageQueryParam);
    return new Response(null, {
      headers: {
        "Cache-Control": privateShareImageCacheControl,
        Location: url.toString(),
      },
      status: 308,
    });
  }

  return {
    cards: snapshot.cards.map(({ card }) => ({
      artUrl: getCardArtDataUrl(card.id),
      id: card.id,
      name: card.name,
    })),
  };
}

function invalidShareImage(message: string) {
  return new Response(message, {
    headers: { "Cache-Control": privateShareImageCacheControl },
    status: 400,
  });
}

function getCardArtDataUrl(cardId: TarotCardId) {
  const cachedDataUrl = cardArtDataUrls.get(cardId);

  if (cachedDataUrl) {
    return cachedDataUrl;
  }

  const publicPath = cardArtSources[cardId].replace(/^\//, "");
  const image = readFileSync(path.join(process.cwd(), "public", publicPath));
  const dataUrl = `data:image/jpeg;base64,${image.toString("base64")}`;
  cardArtDataUrls.set(cardId, dataUrl);

  return dataUrl;
}

function ShareImageCardFace({
  card,
  cardHeight,
  cardWidth,
  hasDeepSpread,
}: {
  readonly card: ShareImageCard;
  readonly cardHeight: number;
  readonly cardWidth: number;
  readonly hasDeepSpread: boolean;
}) {
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
