import { formatTemplateStrict } from "@/i18n/template";
import type {
  DrawnCard,
  PromptTemplate,
  ReadingLens,
  ReadingStyle,
  Spread,
  Topic,
} from "./types";

export const maxUserContextLength = 500;

type BuildPromptInput = {
  readonly cards: readonly DrawnCard[];
  readonly lens: ReadingLens;
  readonly readingStyle: ReadingStyle;
  readonly spread: Spread;
  readonly template: PromptTemplate;
  readonly topic: Topic;
  readonly userContext?: string;
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
    template.lines.join("\n"),
    {
      lensInstruction: lens.instruction,
      lensLabel: lens.label,
      promptLead: topic.promptLead,
      readingStyleInstruction: readingStyle.instruction,
      readingStyleLabel: readingStyle.label,
      spread: spreadLines,
      spreadLabel: spread.promptLabel,
      topicLabel: topic.label,
      userContextBlock,
    },
    `${context}.lines`,
  );
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
