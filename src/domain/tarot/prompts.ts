import { formatTemplateStrict } from "@/i18n/template";
import type {
  AnswerTarget,
  DrawnCard,
  PromptTemplate,
  ReadingStyle,
  Spread,
  Topic,
} from "./types";

export const maxUserContextLength = 500;

type BuildPromptInput = {
  readonly answerTarget: AnswerTarget;
  readonly cards: readonly DrawnCard[];
  readonly readingStyle: ReadingStyle;
  readonly questionFocus?: string;
  readonly spread: Spread;
  readonly template: PromptTemplate;
  readonly topic: Topic;
  readonly userContext?: string;
};

export function buildPrompt(
  {
    answerTarget,
    cards,
    readingStyle,
    questionFocus = "",
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
  const normalizedQuestionFocus = questionFocus.trim();
  if (!answerTarget) {
    throw new RangeError("Tarot prompt requires an answer target.");
  }
  if (
    !normalizedQuestionFocus &&
    answerTarget.id !== topic.taxonomy.defaultAnswerTargetId
  ) {
    throw new RangeError(
      "Tarot prompt answer target does not match the topic default.",
    );
  }
  const cardLines = cards
    .map(({ card }, index) =>
      formatTemplateStrict(
        template.cardLine,
        {
          cardIndex: String(index + 1),
          cardMeaning: card.meaning,
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
  const readingFocusBlock = normalizedQuestionFocus
    ? formatTemplateStrict(
        template.questionFocusBlock,
        { questionFocus: normalizedQuestionFocus },
        `${context}.questionFocusBlock`,
      )
    : formatTemplateStrict(
        template.topicFocusBlock,
        { topicPromptLead: topic.promptLead },
        `${context}.topicFocusBlock`,
      );

  return formatTemplateStrict(
    template.lines.join("\n"),
    {
      cards: cardLines,
      answerTargetInstruction: answerTarget.instruction,
      readingFocusBlock,
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
