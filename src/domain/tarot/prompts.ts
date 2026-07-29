import { formatTemplateStrict } from "@/i18n/template";
import type { DrawnCard, PromptTemplate, ReadingLens, Topic } from "./types";

export function buildPrompt(
  template: PromptTemplate,
  topic: Topic,
  cards: readonly DrawnCard[],
  lens: ReadingLens,
  context = "tarot promptTemplate",
): string {
  const spread = cards
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

  return formatTemplateStrict(
    template.lines.join("\n"),
    {
      lensInstruction: lens.instruction,
      lensLabel: lens.label,
      promptLead: topic.promptLead,
      spread,
      topicLabel: topic.label,
    },
    `${context}.lines`,
  );
}
