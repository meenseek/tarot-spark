import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themedSourceFiles = [
  "src/components/layout/LocaleSwitch.tsx",
  "src/components/visual/CelestialMark.tsx",
  "src/components/visual/TarotCardGlyph.tsx",
  "src/components/visual/class-names.ts",
  "src/features/daily-question/DailyQuestionClient.tsx",
  "src/features/public-pages/PublicPage.tsx",
  "src/features/tarot-reading/TarotExperienceClient.tsx",
  "src/features/tarot-reading/components/CardSpread.tsx",
  "src/features/tarot-reading/components/LanguageSwitch.tsx",
  "src/features/tarot-reading/components/ReadingResult.tsx",
  "src/features/tarot-reading/components/TopicSelector.tsx",
] as const;

const legacyPalettePattern =
  /\b(?:bg|border|from|outline|ring|shadow|text|to|via)-(?:amber|emerald|neutral|pink|rose|stone)-/;
const hardcodedColorPattern = /#[0-9a-f]{3,8}\b/gi;
const kakaoBrandSource =
  "src/features/tarot-reading/components/ReadingResult.tsx";

const rootTokens = {
  "--ts-color-canvas": "#fbf7f2",
  "--ts-color-surface": "#fffdfc",
  "--ts-color-ink": "#3a2633",
  "--ts-color-muted": "#66515d",
  "--ts-color-action": "#704158",
  "--ts-color-action-hover": "#5e334c",
  "--ts-color-action-pressed": "#4f293f",
  "--ts-color-on-action": "#fffdfc",
  "--ts-color-blush": "#e9d2dd",
  "--ts-color-blush-strong": "#dfc2d0",
  "--ts-color-border": "#8b737f",
  "--ts-color-divider": "#d9ccd2",
  "--ts-color-gold": "#b7863e",
  "--ts-color-danger": "#8c2f4a",
  "--ts-color-success": "#2f604e",
  "--ts-font-sans":
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  "--ts-font-display":
    '"Iowan Old Style", "Palatino Linotype", "Noto Serif KR", "Nanum Myeongjo", AppleMyungjo, Georgia, serif',
  "--ts-radius-panel": "0.875rem",
  "--ts-radius-control": "0.75rem",
  "--ts-radius-inset": "1rem",
  "--ts-shadow-paper": "0 1.125rem 3.5rem rgb(58 38 51 / 10%)",
  "--ts-shadow-card": "0 0.625rem 1.75rem rgb(58 38 51 / 8%)",
  "--ts-motion-fast": "160ms",
  "--ts-motion-base": "200ms",
  "--ts-motion-card-arrive": "520ms",
  "--ts-motion-card-art": "360ms",
  "--ts-motion-card-stagger": "80ms",
  "--ts-motion-card-art-offset": "120ms",
  "--ts-motion-ease": "cubic-bezier(0.2, 0.75, 0.25, 1)",
} as const;

const themeAliases = {
  "--color-ts-canvas": "--ts-color-canvas",
  "--color-ts-surface": "--ts-color-surface",
  "--color-ts-ink": "--ts-color-ink",
  "--color-ts-muted": "--ts-color-muted",
  "--color-ts-action": "--ts-color-action",
  "--color-ts-action-hover": "--ts-color-action-hover",
  "--color-ts-action-pressed": "--ts-color-action-pressed",
  "--color-ts-on-action": "--ts-color-on-action",
  "--color-ts-blush": "--ts-color-blush",
  "--color-ts-blush-strong": "--ts-color-blush-strong",
  "--color-ts-border": "--ts-color-border",
  "--color-ts-divider": "--ts-color-divider",
  "--color-ts-gold": "--ts-color-gold",
  "--color-ts-danger": "--ts-color-danger",
  "--color-ts-success": "--ts-color-success",
  "--font-ts-sans": "--ts-font-sans",
  "--font-ts-display": "--ts-font-display",
  "--radius-ts-panel": "--ts-radius-panel",
  "--radius-ts-control": "--ts-radius-control",
  "--radius-ts-inset": "--ts-radius-inset",
  "--shadow-ts-paper": "--ts-shadow-paper",
  "--shadow-ts-card": "--ts-shadow-card",
} as const;

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCssValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

describe("visual design system contract", () => {
  it("keeps legacy palette utilities and color literals out of themed UI", () => {
    themedSourceFiles.forEach((relativePath) => {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      const hardcodedColors = (source.match(hardcodedColorPattern) ?? []).map(
        (color) => color.toUpperCase(),
      );

      expect(source, relativePath).not.toMatch(legacyPalettePattern);
      expect(source, relativePath).not.toContain("radial-gradient");
      expect(source, relativePath).not.toContain("font-mono");
      expect(hardcodedColors, relativePath).toEqual(
        relativePath === kakaoBrandSource ? ["#FEE500"] : [],
      );
    });
  });

  it("scopes the Kakao brand color to its artwork wrapper", () => {
    const source = readFileSync(
      resolve(process.cwd(), kakaoBrandSource),
      "utf8",
    );

    expect(source.match(/#FEE500/g)).toHaveLength(1);
    expect(source).toMatch(
      /<span className="[^"]*bg-\[#FEE500\][^"]*">\s*<Image[\s\S]*?src="\/brand\/kakaotalk-symbol\.svg"/,
    );
  });

  it("defines each locked root token exactly once", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    Object.entries(rootTokens).forEach(([token, expectedValue]) => {
      const declarations = [
        ...css.matchAll(
          new RegExp(
            `^\\s*${escapeRegularExpression(token)}:\\s*([^;]+);`,
            "gm",
          ),
        ),
      ];

      expect(declarations, token).toHaveLength(1);
      expect(normalizeCssValue(declarations[0]?.[1] ?? ""), token).toBe(
        expectedValue,
      );
    });
  });

  it("connects every Tailwind design alias to its root token once", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    Object.entries(themeAliases).forEach(([alias, rootToken]) => {
      const aliasDeclaration = new RegExp(
        `^\\s*${escapeRegularExpression(alias)}:\\s*var\\(${escapeRegularExpression(rootToken)}\\);\\s*$`,
        "gm",
      );

      expect(css.match(aliasDeclaration) ?? [], alias).toHaveLength(1);
    });
  });
});
