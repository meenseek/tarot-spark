import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const assetDirectory = path.join(process.cwd(), "public", "brand");
const assetFileNames = [
  "tarot-spark-social-card.png",
  "tarot-spark-social-card.svg",
] as const;
const releasedSocialCardSha256 =
  "606b2c3b87af39492df50ee0f5e47cc1b60a7ad321647346598cd7d82c7acc55";

describe("released social card", () => {
  it("keeps the SVG language-neutral and free of fixed card roles", () => {
    const svg = readFileSync(
      path.join(assetDirectory, "tarot-spark-social-card.svg"),
      "utf8",
    );
    const visibleText = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(
      ([, text]) => text,
    );

    expect(svg).toContain('width="1200" height="630"');
    expect(visibleText).toEqual(["tarot-spark"]);
    expect(svg).not.toMatch(
      />SPARK<|SHADOW|NEXT STEP|A clearer prompt|for your situation|Context, spread/,
    );
  });

  it("keeps the released PNG at the social preview contract", () => {
    const png = readFileSync(
      path.join(assetDirectory, "tarot-spark-social-card.png"),
    );

    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(png.byteLength).toBeLessThanOrEqual(256 * 1024);
  });

  it("matches the released source and PNG fingerprint", () => {
    const hash = createHash("sha256");

    for (const fileName of assetFileNames) {
      hash.update(fileName);
      hash.update("\0");
      hash.update(readFileSync(path.join(assetDirectory, fileName)));
    }

    expect(hash.digest("hex")).toBe(releasedSocialCardSha256);
  });
});
