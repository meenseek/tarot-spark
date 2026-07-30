import { ImageResponse } from "next/og";
import { getShareReadingSnapshot } from "@/features/share-reading";
import { defaultLocale, isLocale } from "@/i18n/config";

export function getShareImageResponse(request: Request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");

  if (
    url.searchParams.getAll("locale").length > 1 ||
    (localeParam !== null && !isLocale(localeParam))
  ) {
    return new Response("Invalid locale", { status: 400 });
  }

  const locale = localeParam ?? defaultLocale;
  const searchParams: Record<string, string | readonly string[]> = {};

  for (const key of new Set(url.searchParams.keys())) {
    if (key === "locale") {
      continue;
    }

    const values = url.searchParams.getAll(key);
    searchParams[key] = values.length === 1 ? (values[0] ?? "") : values;
  }

  const snapshot = getShareReadingSnapshot(locale, searchParams);

  if (!snapshot) {
    return new Response("Invalid share state", { status: 400 });
  }

  const displaySnapshot =
    locale === "en"
      ? snapshot
      : (getShareReadingSnapshot("en", searchParams) ?? snapshot);
  const heading = "A reflective tarot prompt";
  const spreadLabel = `${displaySnapshot.spread.label} / ${displaySnapshot.readingStyle.label}`;

  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#fbf7f2",
        color: "#3a2633",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "56px 64px",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            color: "#704158",
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          tarot-spark
        </div>
        <div
          style={{
            color: "#66515d",
            display: "flex",
            fontSize: 20,
          }}
        >
          {spreadLabel}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            color: "#704158",
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {displaySnapshot.topic.label}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            maxWidth: 980,
          }}
        >
          {heading}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {displaySnapshot.cards.map(({ card, position }, index) => (
          <div
            key={card.id}
            style={{
              background: "#fffdfc",
              border: "2px solid #d9ccd2",
              borderRadius: 18,
              display: "flex",
              flex: 1,
              flexDirection: "column",
              gap: 12,
              minHeight: 180,
              padding: "22px 18px",
            }}
          >
            <div
              style={{
                color: "#b7863e",
                display: "flex",
                fontSize: 30,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: displaySnapshot.cards.length > 3 ? 21 : 27,
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              {card.name}
            </div>
            <div
              style={{
                color: "#66515d",
                display: "flex",
                fontSize: displaySnapshot.cards.length > 3 ? 16 : 19,
              }}
            >
              {position.label}
            </div>
          </div>
        ))}
      </div>
    </div>,
    {
      height: 630,
      width: 1200,
    },
  );
}
