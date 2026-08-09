import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tarotCardIds } from "@/domain/tarot";
import { cardArtSources } from "./tarot-card-art-sources";

const releasedDeckSha256 =
  "42757b386fe8e54f4917de4b778c04c80fb9df0400637cb62a3556946dab8e41";
const deckDirectory = path.join(process.cwd(), "public", "cards");

describe("released card art", () => {
  it("contains exactly one correctly sized final JPEG for every card", () => {
    const expectedFileNames = tarotCardIds
      .map((cardId) => `${cardId}.jpg`)
      .sort();
    const actualFileNames = readdirSync(deckDirectory).sort();

    expect(actualFileNames).toEqual(expectedFileNames);
    expect(Object.keys(cardArtSources).sort()).toEqual(
      [...tarotCardIds].sort(),
    );

    for (const cardId of tarotCardIds) {
      const expectedSource = `/cards/${cardId}.jpg`;
      const image = readFileSync(path.join(deckDirectory, `${cardId}.jpg`));

      expect(cardArtSources[cardId]).toBe(expectedSource);
      expect(readJpegDimensions(image)).toEqual({ height: 980, width: 700 });
      expect(image.byteLength).toBeLessThanOrEqual(512 * 1024);
    }
  });

  it("matches the released aggregate asset fingerprint", () => {
    const hash = createHash("sha256");
    let totalBytes = 0;

    for (const fileName of tarotCardIds
      .map((cardId) => `${cardId}.jpg`)
      .sort()) {
      const image = readFileSync(path.join(deckDirectory, fileName));

      hash.update(fileName);
      hash.update("\0");
      hash.update(image);
      totalBytes += image.byteLength;
    }

    expect(hash.digest("hex")).toBe(releasedDeckSha256);
    expect(totalBytes).toBeLessThanOrEqual(30 * 1024 * 1024);
  });
});

function readJpegDimensions(image: Buffer) {
  if (image[0] !== 0xff || image[1] !== 0xd8) {
    throw new Error("Card art must be a JPEG");
  }

  let offset = 2;

  while (offset < image.length) {
    while (image[offset] === 0xff) {
      offset += 1;
    }

    const marker = image[offset];
    offset += 1;

    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = image.readUInt16BE(offset);

    if (isStartOfFrameMarker(marker)) {
      return {
        height: image.readUInt16BE(offset + 3),
        width: image.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  throw new Error("Card art JPEG has no size marker");
}

function isStartOfFrameMarker(marker: number) {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}
