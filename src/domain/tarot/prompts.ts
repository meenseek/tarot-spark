import { formatTemplateStrict } from "@/i18n/template";
import type {
  DrawnCard,
  PromptPack,
  PromptSlotId,
  PromptTemplate,
  ReadingLens,
  ReadingStyle,
  Spread,
  Topic,
} from "./types";

export const maxUserContextLength = 500;
export const promptVersion = "prompt-pack-v2";

type BuildPromptInput = {
  readonly cards: readonly DrawnCard[];
  readonly lens: ReadingLens;
  readonly readingStyle: ReadingStyle;
  readonly spread: Spread;
  readonly template: PromptTemplate;
  readonly topic: Topic;
  readonly userContext?: string;
  readonly promptSlotId?: PromptSlotId;
};

export function buildPrompt(
  {
    cards,
    lens,
    readingStyle,
    spread,
    template,
    topic,
    userContext = "",
    promptSlotId = "main",
  }: BuildPromptInput,
  context = "tarot promptTemplate",
): string {
  const normalizedUserContext = normalizeUserContext(userContext);
  const spreadLines = cards
    .map(({ position, card }) =>
      formatTemplateStrict(
        template.spreadLine,
        {
          cardName: card.name,
          cardTone: card.tone,
          archetype: card.archetype,
          keywords: card.keywords.join(", "),
          symbols: card.symbols.join(", "),
          light: card.light,
          shadow: card.shadow,
          agency: card.agency,
          caution: card.caution,
          positionLabel: position.label,
          promptAngle: card.promptAngle,
          reflection: card.reflection,
          upright: card.upright,
        },
        `${context}.spreadLine`,
      ),
    )
    .join("\n");
  const userContextBlock = formatTemplateStrict(
    template.userContextBlock,
    {
      userContext: JSON.stringify(
        normalizedUserContext || template.emptyUserContext,
      ),
    },
    `${context}.userContextBlock`,
  );

  return formatTemplateStrict(
    [...template.lines, ...template.slotInstructions[promptSlotId]].join("\n"),
    {
      lensInstruction: lens.instruction,
      lensLabel: lens.label,
      promptLead: topic.promptLead,
      readingStyleInstruction: readingStyle.instruction,
      readingStyleLabel: readingStyle.label,
      spread: spreadLines,
      spreadLabel: spread.promptLabel,
      outputLengthInstruction: spread.outputLengthInstruction,
      topicLabel: topic.label,
      userContextBlock,
    },
    `${context}.lines`,
  );
}

export function buildPromptPack(
  input: Omit<BuildPromptInput, "promptSlotId">,
  context = "tarot promptTemplate",
): PromptPack {
  return {
    main: buildPrompt(
      { ...input, promptSlotId: "main" },
      `${context}.slotInstructions.main`,
    ),
    "other-view": buildPrompt(
      { ...input, promptSlotId: "other-view" },
      `${context}.slotInstructions.other-view`,
    ),
    action: buildPrompt(
      { ...input, promptSlotId: "action" },
      `${context}.slotInstructions.action`,
    ),
    emotion: buildPrompt(
      { ...input, promptSlotId: "emotion" },
      `${context}.slotInstructions.emotion`,
    ),
  };
}

export function normalizeUserContext(value: string) {
  const normalizedValue = value.replace(/\r\n?/g, "\n").trim();

  if (normalizedValue.length > maxUserContextLength) {
    throw new RangeError(
      `Tarot context must be ${maxUserContextLength} characters or fewer.`,
    );
  }

  return normalizedValue;
}
