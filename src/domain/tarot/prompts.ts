import { formatTemplateStrict } from "@/i18n/template";
import type {
  DrawnCard,
  PromptTemplate,
  ReadingStyle,
  Spread,
  Topic,
} from "./types";

export const maxUserContextLength = 500;
export const promptVersion = "tarot-prompt-v3";

type BuildPromptInput = {
  readonly cards: readonly DrawnCard[];
  readonly readingStyle: ReadingStyle;
  readonly spread: Spread;
  readonly template: PromptTemplate;
  readonly topic: Topic;
  readonly userContext?: string;
};

export function buildPrompt(
  {
    cards,
    readingStyle,
    spread,
    template,
    topic,
    userContext = "",
  }: BuildPromptInput,
  context = "tarot promptTemplate",
): string {
  if (cards.length !== spread.cardCount) {
    throw new RangeError(
      `Tarot prompt expected ${spread.cardCount} cards, received ${cards.length}.`,
    );
  }

  const normalizedUserContext = normalizeUserContext(userContext);
  const cardLines = cards
    .map(({ card }, index) =>
      formatTemplateStrict(
        template.cardLine,
        {
          cardIndex: String(index + 1),
          cardName: card.name,
        },
        `${context}.cardLine`,
      ),
    )
    .join("\n");
  const userContextBlock = normalizedUserContext
    ? formatTemplateStrict(
        template.userContextBlock,
        { userContext: JSON.stringify(normalizedUserContext) },
        `${context}.userContextBlock`,
      )
    : "";

  return formatTemplateStrict(
    template.lines.join("\n"),
    {
      cards: cardLines,
      outputLengthInstruction: spread.outputLengthInstruction,
      promptLead: topic.promptLead,
      readingStyleInstruction: readingStyle.instruction,
      readingStyleLabel: readingStyle.label,
      spreadLabel: spread.promptLabel,
      topicLabel: topic.label,
      userContextBlock,
    },
    `${context}.lines`,
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
