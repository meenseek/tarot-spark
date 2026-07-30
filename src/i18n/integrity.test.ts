import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  promptSlotIds,
  readingLensIds,
  readingStyleIds,
  spreadIds,
  spreadPositionIds,
  tarotCardIds,
  topicIds,
} from "@/domain/tarot";
import { publicPageIds } from "@/features/public-pages";
import enDailyQuestion from "@/messages/en/daily-question.json";
import enPublicPages from "@/messages/en/public-pages.json";
import enPrivacyConsent from "@/messages/en/privacy-consent.json";
import enRelationshipFlow from "@/messages/en/relationship-flow.json";
import enTarotMessages from "@/messages/en/tarot-domain.json";
import enCopy from "@/messages/en/tarot-reading.json";
import koDailyQuestion from "@/messages/ko/daily-question.json";
import koPublicPages from "@/messages/ko/public-pages.json";
import koPrivacyConsent from "@/messages/ko/privacy-consent.json";
import koRelationshipFlow from "@/messages/ko/relationship-flow.json";
import koTarotMessages from "@/messages/ko/tarot-domain.json";
import koCopy from "@/messages/ko/tarot-reading.json";
import {
  defaultLocale,
  prefixedLocales,
  supportedLocales,
  type Locale,
} from "./config";
import { getTarotData } from "./tarot-data";
import { assertTemplatePlaceholders } from "./template";

const uiCopyByLocale = {
  en: enCopy,
  ko: koCopy,
} satisfies Record<Locale, unknown>;

const tarotMessagesByLocale = {
  en: enTarotMessages,
  ko: koTarotMessages,
} satisfies Record<Locale, unknown>;

const publicPageMessagesByLocale = {
  en: enPublicPages,
  ko: koPublicPages,
} satisfies Record<Locale, unknown>;

const dailyQuestionMessagesByLocale = {
  en: enDailyQuestion,
  ko: koDailyQuestion,
} satisfies Record<Locale, unknown>;

const privacyConsentMessagesByLocale = {
  en: enPrivacyConsent,
  ko: koPrivacyConsent,
} satisfies Record<Locale, unknown>;

const relationshipFlowMessagesByLocale = {
  en: enRelationshipFlow,
  ko: koRelationshipFlow,
} satisfies Record<Locale, unknown>;

const jsonFiles = [
  {
    label: "messages/en/tarot-reading.json",
    path: "src/messages/en/tarot-reading.json",
  },
  {
    label: "messages/ko/tarot-reading.json",
    path: "src/messages/ko/tarot-reading.json",
  },
  {
    label: "messages/en/tarot-domain.json",
    path: "src/messages/en/tarot-domain.json",
  },
  {
    label: "messages/ko/tarot-domain.json",
    path: "src/messages/ko/tarot-domain.json",
  },
  {
    label: "messages/en/public-pages.json",
    path: "src/messages/en/public-pages.json",
  },
  {
    label: "messages/ko/public-pages.json",
    path: "src/messages/ko/public-pages.json",
  },
  {
    label: "messages/en/daily-question.json",
    path: "src/messages/en/daily-question.json",
  },
  {
    label: "messages/ko/daily-question.json",
    path: "src/messages/ko/daily-question.json",
  },
  {
    label: "messages/en/privacy-consent.json",
    path: "src/messages/en/privacy-consent.json",
  },
  {
    label: "messages/ko/privacy-consent.json",
    path: "src/messages/ko/privacy-consent.json",
  },
  {
    label: "messages/en/relationship-flow.json",
    path: "src/messages/en/relationship-flow.json",
  },
  {
    label: "messages/ko/relationship-flow.json",
    path: "src/messages/ko/relationship-flow.json",
  },
] as const;

type JsonSchema =
  | "string"
  | readonly [JsonSchema]
  | {
      readonly [key: string]: JsonSchema;
    };
type JsonObjectSchema = {
  readonly [key: string]: JsonSchema;
};

const uiCopySchema = {
  metadata: {
    title: "string",
    description: "string",
  },
  brand: "string",
  heading: "string",
  intro: "string",
  deckPreviewNote: "string",
  personalizationHeading: "string",
  personalizationIntro: "string",
  spreadSelectorLabel: "string",
  readingStyleSelectorLabel: "string",
  contextLabel: "string",
  contextOptional: "string",
  contextPlaceholder: "string",
  contextHelp: "string",
  contextCountLabel: "string",
  topicSelectorLabel: "string",
  cardCountLabel: "string",
  drawButton: "string",
  workspaceLabel: "string",
  cardMarkLabel: "string",
  promptPack: {
    heading: "string",
    intro: "string",
    selectorLabel: "string",
    slots: exactRecordSchema(promptSlotIds, {
      label: "string",
      description: "string",
    }),
  },
  cardDetails: {
    archetype: "string",
    keywords: "string",
    symbols: "string",
    light: "string",
    shadow: "string",
    agency: "string",
    caution: "string",
    reflection: "string",
  },
  generatedPromptLabel: "string",
  interpretationLensLabel: "string",
  copyPrompt: "string",
  copied: "string",
  copyUrl: "string",
  copiedUrl: "string",
  instagramShare: "string",
  instagramCopied: "string",
  kakaoShare: "string",
  kakaoShared: "string",
  share: "string",
  shared: "string",
  copiedShareText: "string",
  blockedAction: "string",
  emptyHeading: "string",
  emptyBody: "string",
  disclaimer: "string",
  languageSwitchLabel: "string",
  dailyQuestionLink: "string",
  socialImageAlt: "string",
  shareTitle: "string",
  shareText: "string",
  placeholderCardName: "string",
  placeholderCardTone: "string",
} as const satisfies JsonSchema;

const tarotMessagesSchema = {
  promptTemplate: {
    spreadLine: "string",
    userContextBlock: "string",
    emptyUserContext: "string",
    lines: ["string"],
    slotInstructions: exactRecordSchema(promptSlotIds, ["string"]),
  },
  spreads: exactRecordSchema(spreadIds, {
    label: "string",
    description: "string",
    promptLabel: "string",
    outputLengthInstruction: "string",
  }),
  readingLenses: exactRecordSchema(readingLensIds, {
    label: "string",
    instruction: "string",
  }),
  readingStyles: exactRecordSchema(readingStyleIds, {
    label: "string",
    description: "string",
    instruction: "string",
  }),
  topics: exactRecordSchema(topicIds, {
    label: "string",
    promptLead: "string",
    resultFrame: "string",
  }),
  spreadPositions: exactRecordSchema(spreadPositionIds, {
    label: "string",
  }),
  cards: exactRecordSchema(tarotCardIds, {
    name: "string",
    tone: "string",
    archetype: "string",
    keywords: ["string"],
    symbols: ["string"],
    upright: "string",
    light: "string",
    shadow: "string",
    agency: "string",
    caution: "string",
    reflection: "string",
    promptAngle: "string",
  }),
} satisfies JsonSchema;

const publicPageMessagesSchema = {
  brand: "string",
  homeLabel: "string",
  languageSwitchLabel: "string",
  pageNavigationLabel: "string",
  pages: exactRecordSchema(publicPageIds, {
    metadata: {
      title: "string",
      description: "string",
    },
    linkLabel: "string",
    title: "string",
    intro: "string",
    sections: [
      {
        heading: "string",
        paragraphs: ["string"],
      },
    ],
  }),
} satisfies JsonSchema;

const dailyQuestionMessagesSchema = {
  metadata: {
    title: "string",
    description: "string",
  },
  brand: "string",
  eyebrow: "string",
  heading: "string",
  intro: "string",
  loadingLabel: "string",
  todayCardLabel: "string",
  meaningLabel: "string",
  questionLabel: "string",
  deckNote: "string",
  homeLink: "string",
  languageSwitchLabel: "string",
  disclaimer: "string",
} satisfies JsonSchema;

const privacyConsentMessagesSchema = {
  heading: "string",
  body: "string",
  analyticsLabel: "string",
  analyticsDescription: "string",
  advertisingLabel: "string",
  advertisingDescription: "string",
  saveChoices: "string",
  rejectOptional: "string",
  settingsButton: "string",
} satisfies JsonSchema;

const relationshipFlowMessagesSchema = {
  metadata: {
    title: "string",
    description: "string",
  },
  eyebrow: "string",
  heading: "string",
  intro: "string",
  benefitsHeading: "string",
  benefits: [
    {
      title: "string",
      body: "string",
    },
  ],
  stepsHeading: "string",
  steps: [
    {
      title: "string",
      body: "string",
    },
  ],
  exampleEyebrow: "string",
  exampleHeading: "string",
  exampleBody: "string",
  faqHeading: "string",
  faqs: [
    {
      question: "string",
      answer: "string",
    },
  ],
  ctaHeading: "string",
  ctaBody: "string",
  ctaButton: "string",
  privacyNote: "string",
  disclaimer: "string",
} satisfies JsonSchema;

describe("i18n integrity", () => {
  it("keeps locale files aligned with supported locales", () => {
    expect(Object.keys(uiCopyByLocale).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    expect(Object.keys(tarotMessagesByLocale).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    expect(Object.keys(publicPageMessagesByLocale).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    expect(Object.keys(dailyQuestionMessagesByLocale).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    expect(Object.keys(privacyConsentMessagesByLocale).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    expect(Object.keys(relationshipFlowMessagesByLocale).sort()).toEqual(
      [...supportedLocales].sort(),
    );
  });

  it("keeps prefixed locale paths canonical", () => {
    expect(prefixedLocales).not.toContain(defaultLocale);
    expect([...prefixedLocales, defaultLocale].sort()).toEqual(
      [...supportedLocales].sort(),
    );
  });

  it("keeps UI copy keys identical across locales", () => {
    expect(collectShapePaths(koCopy)).toEqual(collectShapePaths(enCopy));
  });

  it("keeps tarot message keys identical across locales", () => {
    expect(collectShapePaths(koTarotMessages)).toEqual(
      collectShapePaths(enTarotMessages),
    );
  });

  it("keeps public page message keys identical across locales", () => {
    expect(collectShapePaths(koPublicPages)).toEqual(
      collectShapePaths(enPublicPages),
    );
  });

  it("keeps daily question message keys identical across locales", () => {
    expect(collectShapePaths(koDailyQuestion)).toEqual(
      collectShapePaths(enDailyQuestion),
    );
  });

  it("keeps privacy consent message keys identical across locales", () => {
    expect(collectShapePaths(koPrivacyConsent)).toEqual(
      collectShapePaths(enPrivacyConsent),
    );
  });

  it("keeps relationship flow message keys identical across locales", () => {
    expect(collectShapePaths(koRelationshipFlow)).toEqual(
      collectShapePaths(enRelationshipFlow),
    );
  });

  it("matches supported locale JSON schemas exactly", () => {
    const schemaErrors = [
      ...collectLocaleSchemaErrors(uiCopyByLocale, uiCopySchema, "$.uiCopy"),
      ...collectLocaleSchemaErrors(
        tarotMessagesByLocale,
        tarotMessagesSchema,
        "$.tarotMessages",
      ),
      ...collectLocaleSchemaErrors(
        publicPageMessagesByLocale,
        publicPageMessagesSchema,
        "$.publicPageMessages",
      ),
      ...collectLocaleSchemaErrors(
        dailyQuestionMessagesByLocale,
        dailyQuestionMessagesSchema,
        "$.dailyQuestionMessages",
      ),
      ...collectLocaleSchemaErrors(
        privacyConsentMessagesByLocale,
        privacyConsentMessagesSchema,
        "$.privacyConsentMessages",
      ),
      ...collectLocaleSchemaErrors(
        relationshipFlowMessagesByLocale,
        relationshipFlowMessagesSchema,
        "$.relationshipFlowMessages",
      ),
    ];

    expect(schemaErrors).toEqual([]);
  });

  it("materializes tarot data in canonical id order", () => {
    for (const locale of supportedLocales) {
      const data = getTarotData(locale);

      expect(
        data.topics.map((topic) => topic.id),
        `topic order for ${locale}`,
      ).toEqual(topicIds);
      expect(
        data.spreadPositions.map((position) => position.id),
        `spread position order for ${locale}`,
      ).toEqual(spreadPositionIds);
      expect(
        data.spreads.map((spread) => spread.id),
        `spread order for ${locale}`,
      ).toEqual(spreadIds);
      expect(
        data.readingLenses.map((lens) => lens.id),
        `reading lens order for ${locale}`,
      ).toEqual(readingLensIds);
      expect(
        data.readingStyles.map((style) => style.id),
        `reading style order for ${locale}`,
      ).toEqual(readingStyleIds);
      expect(
        data.cards.map((card) => card.id),
        `card order for ${locale}`,
      ).toEqual(tarotCardIds);
    }
  });

  it("keeps template placeholders exact", () => {
    const templateErrors = supportedLocales.flatMap((locale) => {
      const copy = uiCopyByLocale[locale];
      const tarotMessages = tarotMessagesByLocale[locale];

      return [
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot-reading.cardCountLabel`,
          copy.cardCountLabel,
          ["count"],
        ),
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot-reading.deckPreviewNote`,
          copy.deckPreviewNote,
          ["count"],
        ),
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot-reading.contextCountLabel`,
          copy.contextCountLabel,
          ["count", "max"],
        ),
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot-reading.shareText`,
          copy.shareText,
          ["cardNames", "topicLabel"],
        ),
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot promptTemplate.spreadLine`,
          tarotMessages.promptTemplate.spreadLine,
          [
            "agency",
            "archetype",
            "cardName",
            "cardTone",
            "caution",
            "keywords",
            "light",
            "positionLabel",
            "promptAngle",
            "reflection",
            "shadow",
            "symbols",
            "upright",
          ],
        ),
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot promptTemplate.userContextBlock`,
          tarotMessages.promptTemplate.userContextBlock,
          ["userContext"],
        ),
        ...collectTemplatePlaceholderErrors(
          `${locale} tarot promptTemplate.lines`,
          tarotMessages.promptTemplate.lines.join("\n"),
          [
            "lensInstruction",
            "lensLabel",
            "outputLengthInstruction",
            "promptLead",
            "readingStyleInstruction",
            "readingStyleLabel",
            "spread",
            "spreadLabel",
            "topicLabel",
            "userContextBlock",
          ],
        ),
        ...promptSlotIds.flatMap((slotId) =>
          collectTemplatePlaceholderErrors(
            `${locale} tarot promptTemplate.slotInstructions.${slotId}`,
            tarotMessages.promptTemplate.slotInstructions[slotId].join("\n"),
            [],
          ),
        ),
      ];
    });

    expect(templateErrors).toEqual([]);
  });

  it("does not duplicate JSON object keys", () => {
    const duplicateKeys = jsonFiles.flatMap(({ label, path: jsonPath }) => {
      const text = readFileSync(path.join(process.cwd(), jsonPath), "utf8");
      return findDuplicateJsonKeys(text).map((duplicate) => ({
        ...duplicate,
        file: label,
      }));
    });

    expect(duplicateKeys).toEqual([]);
  });

  it("does not leave localized strings blank", () => {
    const blankStrings = [
      ...collectBlankStringPaths(uiCopyByLocale, "$.uiCopyByLocale"),
      ...collectBlankStringPaths(tarotMessagesByLocale, "$.tarotMessages"),
      ...collectBlankStringPaths(
        publicPageMessagesByLocale,
        "$.publicPageMessages",
      ),
      ...collectBlankStringPaths(
        dailyQuestionMessagesByLocale,
        "$.dailyQuestionMessages",
      ),
      ...collectBlankStringPaths(
        privacyConsentMessagesByLocale,
        "$.privacyConsentMessages",
      ),
      ...collectBlankStringPaths(
        relationshipFlowMessagesByLocale,
        "$.relationshipFlowMessages",
      ),
    ];

    expect(blankStrings).toEqual([]);
  });
});

function exactRecordSchema(
  keys: readonly string[],
  itemSchema: JsonSchema,
): JsonObjectSchema {
  return Object.fromEntries(keys.map((key) => [key, itemSchema]));
}

function collectLocaleSchemaErrors<T extends Record<Locale, unknown>>(
  localizedValues: T,
  schema: JsonSchema,
  path: string,
) {
  return supportedLocales.flatMap((locale) =>
    collectSchemaErrors(localizedValues[locale], schema, `${path}.${locale}`),
  );
}

function collectSchemaErrors(
  value: unknown,
  schema: JsonSchema,
  path: string,
): string[] {
  if (schema === "string") {
    return typeof value === "string" ? [] : [`${path} expected string`];
  }

  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) {
      return [`${path} expected array`];
    }

    const itemSchema = schema[0];

    if (itemSchema === undefined) {
      return value.length === 0 ? [] : [`${path} expected empty array`];
    }

    return value.flatMap((item, index) =>
      collectSchemaErrors(item, itemSchema, `${path}[${index}]`),
    );
  }

  if (!isRecord(value)) {
    return [`${path} expected object`];
  }

  const objectSchema = schema as JsonObjectSchema;
  const expectedKeys = Object.keys(objectSchema).sort();
  const actualKeys = Object.keys(value).sort();
  const missingKeys = expectedKeys.filter((key) => !actualKeys.includes(key));
  const unexpectedKeys = actualKeys.filter(
    (key) => !expectedKeys.includes(key),
  );
  const keyErrors = [
    formatSchemaKeyError(path, "missing", missingKeys),
    formatSchemaKeyError(path, "unexpected", unexpectedKeys),
  ].filter((message): message is string => message !== undefined);

  return [
    ...keyErrors,
    ...expectedKeys.flatMap((key) => {
      const childSchema = objectSchema[key];

      if (childSchema === undefined || !(key in value)) {
        return [];
      }

      return collectSchemaErrors(value[key], childSchema, `${path}.${key}`);
    }),
  ];
}

function formatSchemaKeyError(
  path: string,
  label: string,
  keys: readonly string[],
) {
  return keys.length > 0
    ? `${path} ${label} keys: ${keys.join(", ")}`
    : undefined;
}

function collectTemplatePlaceholderErrors(
  context: string,
  template: string,
  expectedKeys: readonly string[],
) {
  try {
    assertTemplatePlaceholders(template, expectedKeys, context);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

function collectShapePaths(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return [
      path,
      ...value.flatMap((item, index) =>
        collectShapePaths(item, `${path}[${index}]`),
      ),
    ];
  }

  if (isRecord(value)) {
    return [
      path,
      ...Object.keys(value)
        .sort()
        .flatMap((key) => collectShapePaths(value[key], `${path}.${key}`)),
    ];
  }

  return [path];
}

function collectBlankStringPaths(value: unknown, path = "$"): string[] {
  if (typeof value === "string") {
    return value.trim().length === 0 ? [path] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectBlankStringPaths(item, `${path}[${index}]`),
    );
  }

  if (isRecord(value)) {
    return Object.keys(value).flatMap((key) =>
      collectBlankStringPaths(value[key], `${path}.${key}`),
    );
  }

  return [];
}

function findDuplicateJsonKeys(text: string) {
  const duplicates: { readonly key: string; readonly offset: number }[] = [];
  const stack: { readonly keys: Set<string> }[] = [];
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (character === "{") {
      stack.push({ keys: new Set<string>() });
      index += 1;
      continue;
    }

    if (character === "}") {
      stack.pop();
      index += 1;
      continue;
    }

    if (character !== '"') {
      index += 1;
      continue;
    }

    const parsedString = parseJsonString(text, index);
    const nextTokenIndex = findNextNonWhitespaceIndex(text, parsedString.end);

    if (stack.length > 0 && text[nextTokenIndex] === ":") {
      const currentObject = stack[stack.length - 1];

      if (currentObject?.keys.has(parsedString.value)) {
        duplicates.push({ key: parsedString.value, offset: index });
      }

      currentObject?.keys.add(parsedString.value);
    }

    index = parsedString.end;
  }

  return duplicates;
}

function parseJsonString(text: string, start: number) {
  let index = start + 1;
  let value = "";

  while (index < text.length) {
    const character = text[index];

    if (character === "\\") {
      value += text[index + 1] ?? "";
      index += 2;
      continue;
    }

    if (character === '"') {
      return { value, end: index + 1 };
    }

    value += character;
    index += 1;
  }

  throw new Error(`Unterminated JSON string at offset ${start}.`);
}

function findNextNonWhitespaceIndex(text: string, start: number) {
  let index = start;

  while (/\s/.test(text[index] ?? "")) {
    index += 1;
  }

  return index;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
