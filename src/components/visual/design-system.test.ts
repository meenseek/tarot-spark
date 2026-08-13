import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ESLint } from "eslint";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

const themedSourceFiles = [
  "src/components/layout/LocaleSwitch.tsx",
  "src/components/layout/SiteFooter.tsx",
  "src/components/layout/SiteHeader.tsx",
  "src/components/layout/SiteShell.tsx",
  "src/components/visual/CelestialMark.tsx",
  "src/components/visual/TarotCardBack.tsx",
  "src/components/visual/class-names.ts",
  "src/features/daily-question/DailyQuestionClient.tsx",
  "src/features/public-pages/PublicPage.tsx",
  "src/features/relationship-flow/RelationshipFlowLanding.tsx",
  "src/features/relationship-questions/RelationshipQuestionExplorer.tsx",
  "src/features/tarot-reading/TarotExperienceClient.tsx",
  "src/features/tarot-reading/components/CardSpread.tsx",
  "src/features/tarot-reading/components/CurrentPromptCustomization.tsx",
  "src/features/tarot-reading/components/InstantReadingPanel.tsx",
  "src/features/tarot-reading/components/LanguageSwitch.tsx",
  "src/features/tarot-reading/components/ReadingResult.tsx",
  "src/features/tarot-reading/components/SituationContextInput.tsx",
  "src/features/tarot-reading/components/TopicSelector.tsx",
  "src/features/privacy-consent/PrivacyConsent.tsx",
] as const;

const siteShellConsumers = [
  "src/features/daily-question/DailyQuestionClient.tsx",
  "src/features/public-pages/PublicPage.tsx",
  "src/features/relationship-flow/RelationshipFlowLanding.tsx",
  "src/features/relationship-questions/RelationshipQuestionExplorer.tsx",
  "src/features/tarot-reading/TarotExperienceClient.tsx",
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
  "--ts-color-success": "var(--ts-color-action)",
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
  "--ts-motion-card-flip": "480ms",
  "--ts-motion-card-stagger": "80ms",
  "--ts-motion-card-flip-offset": "120ms",
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

const measureTwiceAliases = {
  "--mt-color-bg-canvas": "--ts-color-canvas",
  "--mt-color-bg-surface": "--ts-color-surface",
  "--mt-color-bg-subtle": "--ts-color-blush",
  "--mt-color-bg-emphasis": "--ts-color-ink",
  "--mt-color-text": "--ts-color-ink",
  "--mt-color-text-muted": "--ts-color-muted",
  "--mt-color-text-subtle": "--ts-color-muted",
  "--mt-color-text-inverse": "--ts-color-on-action",
  "--mt-color-border": "--ts-color-divider",
  "--mt-color-border-strong": "--ts-color-border",
  "--mt-color-control-border": "--ts-color-border",
  "--mt-color-control-border-hover": "--ts-color-action",
  "--mt-color-control-placeholder": "--ts-color-muted",
  "--mt-color-action": "--ts-color-action",
  "--mt-color-action-hover": "--ts-color-action-hover",
  "--mt-color-action-pressed": "--ts-color-action-pressed",
  "--mt-color-action-soft": "--ts-color-blush",
  "--mt-color-action-soft-hover": "--ts-color-blush-strong",
  "--mt-color-action-soft-pressed": "--ts-color-blush-strong",
  "--mt-color-action-border": "--ts-color-action",
  "--mt-color-action-text": "--ts-color-action",
  "--mt-color-neutral": "--ts-color-ink",
  "--mt-color-neutral-hover": "--ts-color-action-hover",
  "--mt-color-neutral-pressed": "--ts-color-action-pressed",
  "--mt-color-neutral-soft": "--ts-color-blush",
  "--mt-color-neutral-soft-hover": "--ts-color-blush-strong",
  "--mt-color-neutral-soft-pressed": "--ts-color-blush-strong",
  "--mt-color-neutral-border": "--ts-color-border",
  "--mt-color-neutral-text": "--ts-color-ink",
  "--mt-color-focus": "--ts-color-action",
  "--mt-color-danger": "--ts-color-danger",
  "--mt-color-danger-hover": "--ts-color-danger",
  "--mt-color-danger-pressed": "--ts-color-danger",
  "--mt-color-danger-soft": "--ts-color-blush",
  "--mt-color-danger-soft-hover": "--ts-color-blush-strong",
  "--mt-color-danger-soft-pressed": "--ts-color-blush-strong",
  "--mt-color-danger-border": "--ts-color-danger",
  "--mt-color-danger-text": "--ts-color-danger",
  "--mt-color-feedback-success-bg": "--ts-color-surface",
  "--mt-color-feedback-success-border": "--ts-color-success",
  "--mt-color-feedback-success-text": "--ts-color-success",
  "--mt-color-feedback-danger-bg": "--ts-color-surface",
  "--mt-color-feedback-danger-border": "--ts-color-danger",
  "--mt-color-feedback-danger-text": "--ts-color-danger",
  "--mt-color-disabled-bg": "--ts-color-divider",
  "--mt-color-disabled-text": "--ts-color-muted",
  "--mt-color-loading-indicator": "--ts-color-muted",
  "--mt-radius-control": "--ts-radius-control",
  "--mt-radius-md": "--ts-radius-control",
  "--mt-radius-surface": "--ts-radius-panel",
  "--mt-font-sans": "--ts-font-sans",
  "--mt-duration-fast": "--ts-motion-fast",
  "--mt-duration-normal": "--ts-motion-base",
  "--mt-ease-standard": "--ts-motion-ease",
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

  it("keeps public feature surfaces inside the canonical site shell", () => {
    siteShellConsumers.forEach((relativePath) => {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

      expect(source, relativePath).toContain(
        'import { SiteShell } from "@/components/layout/SiteShell";',
      );
      expect(source, relativePath).toContain("<SiteShell");
      expect(source, relativePath).not.toMatch(/<(?:main|header|footer)\b/);
    });
  });

  it("keeps prompt copy primary and repeated or optional reading actions secondary", () => {
    const promptResultSource = readFileSync(
      resolve(
        process.cwd(),
        "src/features/tarot-reading/components/ReadingResult.tsx",
      ),
      "utf8",
    );
    const instantReadingSource = readFileSync(
      resolve(
        process.cwd(),
        "src/features/tarot-reading/components/InstantReadingPanel.tsx",
      ),
      "utf8",
    );
    const questionCatalogSource = readFileSync(
      resolve(
        process.cwd(),
        "src/features/relationship-questions/RelationshipQuestionExplorer.tsx",
      ),
      "utf8",
    );

    expect(promptResultSource).toMatch(
      /<Button\s+className="ts-primary-action[^\"]*"\s+onClick={onCopyPrompt}/,
    );
    expect(instantReadingSource).toContain('className="ts-secondary-action"');
    expect(promptResultSource).toContain("Button,");
    expect(promptResultSource).toContain("InlineMessage,");
    expect(instantReadingSource).toContain("Button, InlineMessage");
    expect(promptResultSource).not.toContain("<InlineMessage role=");
    expect(instantReadingSource).not.toContain("<InlineMessage role=");
    expect(instantReadingSource).not.toContain("primaryButtonClassName");
    expect(instantReadingSource).not.toContain("bg-ts-blush");
    expect(questionCatalogSource).toContain("secondaryButtonClassName");
    expect(questionCatalogSource).not.toContain("primaryButtonClassName");
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

  it("maps every adopted Measure Twice role to the Tarot Spark theme", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    Object.entries(measureTwiceAliases).forEach(([alias, rootToken]) => {
      const aliasDeclaration = new RegExp(
        `^\\s*${escapeRegularExpression(alias)}:\\s*var\\(${escapeRegularExpression(rootToken)}\\);\\s*$`,
        "gm",
      );

      expect(css.match(aliasDeclaration) ?? [], alias).toHaveLength(1);
    });

    expect(css.match(/^\s*--mt-shadow-sm:\s*none;\s*$/gm) ?? []).toHaveLength(
      1,
    );
    expect(css.match(/^\s*--mt-shadow-md:\s*none;\s*$/gm) ?? []).toHaveLength(
      1,
    );
    expect(
      css.match(
        /^\s*--mt-focus-ring:\s*2px solid var\(--ts-color-action\);\s*$/gm,
      ) ?? [],
    ).toHaveLength(1);
    expect(
      css.match(/^\s*--mt-control-border-width:\s*2px;\s*$/gm) ?? [],
    ).toHaveLength(1);
    expect(
      css.match(/^\s*--mt-focus-ring-offset:\s*2px;\s*$/gm) ?? [],
    ).toHaveLength(1);
  });

  it("preserves Tarot control boundaries through public contracts", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    expect(css).toMatch(
      /\.ts-secondary-action,\s*\.ts-primary-action\s*{[^}]*min-height:\s*44px;[^}]*border-width:\s*2px;/,
    );
    expect(css).toMatch(
      /\.ts-primary-action\s*{[^}]*min-height:\s*48px;[^}]*border-color:\s*var\(--ts-color-action\);/,
    );
    expect(css).toMatch(
      /\.ts-topic-select\s*{[^}]*width:\s*100%;[^}]*max-width:\s*none;/,
    );
    expect(css).toMatch(
      /\.ts-topic-select:focus-within\s*{[^}]*--mt-focus-ring-offset:\s*calc\(-1 \* var\(--mt-control-border-width\)\);/,
    );
    expect(css).toMatch(
      /@media \(min-width: 48rem\)\s*{[\s\S]*?\.ts-topic-select\s*{[^}]*max-width:\s*28rem;/,
    );
    expect(css).toMatch(
      /\.ts-skip-link\s*{[^}]*border-width:\s*2px;[^}]*box-shadow:\s*none;/,
    );
    expect(css).toMatch(
      /\.ts-privacy-option\s*{[^}]*--mt-checkbox-card-min-height:\s*5rem;[^}]*--mt-checkbox-card-padding:\s*0\.75rem;[^}]*--mt-checkbox-card-gap:\s*0\.75rem;/,
    );
    expect(css).toMatch(
      /\.ts-choice-card\s*{[^}]*--mt-radio-card-body-gap:\s*0\.25rem;[^}]*--mt-radio-card-label-font-weight:\s*600;[^}]*--mt-radio-card-description-line-height:\s*1\.25rem;/,
    );
    expect(css).toMatch(
      /@media \(forced-colors:\s*none\)\s*{[\s\S]*?\.ts-privacy-option\s*{[^}]*--mt-checkbox-card-border-width:\s*1px;[^}]*--mt-checkbox-card-border-color:\s*var\(--ts-color-divider\);[^}]*--mt-checkbox-card-background:\s*var\(--ts-color-canvas\);/,
    );
    expect(css).toMatch(
      /@media \(forced-colors:\s*none\)\s*{[\s\S]*?\.ts-choice-card\s*{[^}]*--mt-radio-card-border-width:\s*2px;[^}]*--mt-radio-card-border-color:\s*var\(--ts-color-border\);[^}]*--mt-radio-card-background:\s*var\(--ts-color-canvas\);[^}]*--mt-radio-card-border-color-selected:\s*var\(--ts-color-action\);[^}]*--mt-radio-card-background-selected:\s*var\(--ts-color-blush\);/,
    );
    expect(css).toMatch(
      /@media \(min-width: 40rem\)\s*{[\s\S]*?\.ts-choice-group--two-column\s*{[^}]*--mt-radio-group-options-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(css).toMatch(
      /\.ts-field\s+\.ts-textarea-input\s*{[^}]*padding:\s*0\.75rem;[^}]*font-size:\s*0\.875rem;[^}]*line-height:\s*1\.5rem;/,
    );
    expect(css).toMatch(
      /\.ts-field\s+\.ts-textarea-input--prompt\s*{[^}]*min-height:\s*14rem;[^}]*padding:\s*1rem;/,
    );
    expect(css).toMatch(/\.ts-manual-share-input\s*{[^}]*min-height:\s*40px;/);
    expect(css).not.toMatch(/\.mt-/);
    expect(css).not.toContain(":has(");
  });

  it("adopts compatible Measure Twice fields without adding live regions", () => {
    const packageManifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const lockfile = readFileSync(
      resolve(process.cwd(), "pnpm-lock.yaml"),
      "utf8",
    );
    const adoptedFieldSources = {
      "src/features/privacy-consent/PrivacyConsent.tsx": {
        announceErrorCount: 2,
        cardAppearanceCount: 2,
        imports: ["Checkbox"],
        rejectedNativeTags: ["<input"],
      },
      "src/features/tarot-reading/components/CurrentPromptCustomization.tsx": {
        announceErrorCount: 2,
        cardAppearanceCount: 1,
        imports: ["Radio", "RadioGroup", "Textarea"],
        rejectedNativeTags: ["<input", "<textarea"],
      },
      "src/features/tarot-reading/components/ReadingPreferences.tsx": {
        announceErrorCount: 2,
        cardAppearanceCount: 2,
        imports: ["Radio", "RadioGroup"],
        rejectedNativeTags: ["<input"],
      },
      "src/features/tarot-reading/components/ReadingResult.tsx": {
        announceErrorCount: 2,
        cardAppearanceCount: 0,
        imports: ["Textarea", "TextField"],
        rejectedNativeTags: ["<input", "<textarea"],
      },
      "src/features/tarot-reading/components/TopicSelector.tsx": {
        announceErrorCount: 1,
        cardAppearanceCount: 0,
        imports: ["Select"],
        rejectedNativeTags: ["<input", "<select"],
      },
      "src/features/tarot-reading/components/SituationContextInput.tsx": {
        announceErrorCount: 1,
        cardAppearanceCount: 0,
        imports: ["Textarea"],
        rejectedNativeTags: ["<textarea"],
      },
    } as const;

    expect(packageManifest.dependencies["@measure-twice/react"]).toBe("0.4.0");
    expect(lockfile).toContain("specifier: 0.4.0");
    expect(lockfile).toMatch(/["']@measure-twice\/react@0\.4\.0["']:/);

    Object.entries(adoptedFieldSources).forEach(([relativePath, contract]) => {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

      contract.imports.forEach((componentName) => {
        expect(source, relativePath).toContain(componentName);
      });
      expect(
        source.match(/announceError={false}/g) ?? [],
        relativePath,
      ).toHaveLength(contract.announceErrorCount);
      expect(
        source.match(/appearance="card"/g) ?? [],
        relativePath,
      ).toHaveLength(contract.cardAppearanceCount);
      contract.rejectedNativeTags.forEach((tag) => {
        expect(source, relativePath).not.toContain(tag);
      });
    });
  });

  it("adopts the Measure Twice skip link at the canonical shell boundary", () => {
    const shellSource = readFileSync(
      resolve(process.cwd(), "src/components/layout/SiteShell.tsx"),
      "utf8",
    );
    const skipLinkSource = readFileSync(
      resolve(process.cwd(), "src/components/layout/SiteSkipLink.tsx"),
      "utf8",
    );

    expect(skipLinkSource.startsWith('"use client";')).toBe(true);
    expect(skipLinkSource).toContain(
      'import { SkipLink } from "@measure-twice/react";',
    );
    expect(skipLinkSource).toContain('className="ts-skip-link"');
    expect(skipLinkSource).toContain('href="#site-main-content"');
    expect(shellSource).toContain(
      'import { SiteSkipLink } from "./SiteSkipLink";',
    );
    expect(shellSource).toContain(
      "<SiteSkipLink label={skipToContentLabel} />",
    );
    expect(shellSource).not.toContain("@measure-twice/react");
    expect(shellSource).toContain('id="site-main-content"');
    expect(shellSource).toContain("tabIndex={-1}");
  });

  it("loads Measure Twice styles before Tarot Spark's consumer overrides", () => {
    ["src/app/(root)/layout.tsx", "src/app/[locale]/layout.tsx"].forEach(
      (relativePath) => {
        const source = readFileSync(
          resolve(process.cwd(), relativePath),
          "utf8",
        );
        const measureTwiceImport = source.indexOf(
          'import "@measure-twice/react/styles.css";',
        );
        const tarotImport = source.indexOf('import "../globals.css";');

        expect(measureTwiceImport, relativePath).toBeGreaterThanOrEqual(0);
        expect(tarotImport, relativePath).toBeGreaterThan(measureTwiceImport);
      },
    );
  });

  it("enforces the package ownership boundary in both source languages", () => {
    const eslintSource = readFileSync(
      resolve(process.cwd(), "eslint.config.mjs"),
      "utf8",
    );
    const stylelintSource = readFileSync(
      resolve(process.cwd(), "stylelint.config.mjs"),
      "utf8",
    );
    const packageManifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(eslintSource).toContain(
      'import measureTwice from "@measure-twice/react/eslint";',
    );
    expect(eslintSource).toContain("measureTwice.configs.recommended");
    expect(stylelintSource).toContain(
      'import measureTwice from "@measure-twice/react/stylelint";',
    );
    expect(packageManifest.scripts["lint"]).toContain('stylelint "**/*.css"');
  });

  it("rejects private package contracts while allowing public and app-owned names", async () => {
    const cwd = process.cwd();
    const ruleName = "measure-twice/no-private-contracts";
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: resolve(cwd, "eslint.config.mjs"),
    });
    const privateClassName = ["mt", "button"].join("-");
    const privateTokenName = ["--mt", "private-token"].join("-");
    const [privateSourceResult] = await eslint.lintText(
      `export const Bad = () => <div className="${privateClassName}" style={{ "${privateTokenName}": "red" }} />;`,
      {
        filePath: resolve(cwd, "src/consumer-boundary-fixture.tsx"),
      },
    );
    const [publicSourceResult] = await eslint.lintText(
      'export const Good = () => <div className="mt-2 ts-card" style={{ "--mt-color-action": "red" }} />;',
      {
        filePath: resolve(cwd, "src/consumer-boundary-fixture.tsx"),
      },
    );

    expect(
      privateSourceResult?.messages.filter(({ ruleId }) => ruleId === ruleName),
    ).toHaveLength(2);
    expect(
      publicSourceResult?.messages.filter(({ ruleId }) => ruleId === ruleName),
    ).toEqual([]);

    const privateStylesResult = await stylelint.lint({
      code: `.ts-card .${privateClassName} { color: var(${privateTokenName}); }`,
      codeFilename: resolve(cwd, "src/consumer-boundary-fixture.css"),
      configFile: resolve(cwd, "stylelint.config.mjs"),
    });
    const publicStylesResult = await stylelint.lint({
      code: ".mt-2.ts-card { color: var(--mt-color-action); }",
      codeFilename: resolve(cwd, "src/consumer-boundary-fixture.css"),
      configFile: resolve(cwd, "stylelint.config.mjs"),
    });

    expect(
      privateStylesResult.results[0]?.warnings.filter(
        ({ rule }) => rule === ruleName,
      ),
    ).toHaveLength(2);
    expect(
      publicStylesResult.results[0]?.warnings.filter(
        ({ rule }) => rule === ruleName,
      ),
    ).toEqual([]);
  });
});
