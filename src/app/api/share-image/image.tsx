import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cardArtSources } from "@/components/visual/tarot-card-art-sources";
import type { TarotCardId } from "@/domain/tarot";
import { getShareReadingSnapshot } from "@/features/share-reading";
import {
  legacyShareImageCacheControl,
  shareImageVersion,
  shareImageVersionParam,
  versionedShareImageCacheControl,
} from "@/features/share-reading/share-image-config";
import { defaultLocale, isLocale } from "@/i18n/config";

export type ShareImageModel = {
  readonly cardArtUrls: readonly string[];
};

const cardArtDataUrls = new Map<TarotCardId, string>();

export function getShareImageResponse(request: Request) {
  const model = getShareImageModel(request);

  if (model instanceof Response) {
    return model;
  }

  const hasDeepSpread = model.cardArtUrls.length > 3;
  const cardWidth = hasDeepSpread ? 150 : 250;
  const cardHeight = hasDeepSpread ? 210 : 350;
  const isVersioned =
    new URL(request.url).searchParams.get(shareImageVersionParam) ===
    shareImageVersion;

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
          {model.cardArtUrls.map((cardArtUrl, index) => (
            <div
              key={cardArtUrl}
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
              {/* ImageResponse renders remote-style image nodes itself. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                height={cardHeight}
                src={cardArtUrl}
                style={{
                  borderRadius: hasDeepSpread ? 10 : 14,
                  height: cardHeight,
                  objectFit: "cover",
                  width: cardWidth,
                }}
                width={cardWidth}
              />
            </div>
          ))}
        </div>

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

  if (
    versionValues.length > 1 ||
    (versionValues.length === 1 && versionValues[0] !== shareImageVersion)
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

  return {
    cardArtUrls: snapshot.cards.map(({ card }) => getCardArtDataUrl(card.id)),
  };
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
