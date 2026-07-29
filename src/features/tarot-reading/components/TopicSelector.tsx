import type { Topic, TopicId } from "@/domain/tarot";
import {
  interactiveFocusClassName,
  interactiveMotionClassName,
} from "@/components/visual/class-names";

type TopicSelectorProps = {
  readonly topics: readonly Topic[];
  readonly selectedTopicId: TopicId;
  readonly ariaLabel: string;
  readonly cardCountLabel: string;
  readonly onSelect: (topicId: TopicId) => void;
};

export function TopicSelector({
  topics,
  selectedTopicId,
  ariaLabel,
  cardCountLabel,
  onSelect,
}: TopicSelectorProps) {
  return (
    <div aria-label={ariaLabel} className="grid gap-3">
      {topics.map((topic) => {
        const isSelected = topic.id === selectedTopicId;

        return (
          <button
            aria-label={`${topic.label} ${cardCountLabel}`}
            aria-pressed={isSelected}
            className={`${interactiveFocusClassName} ${interactiveMotionClassName} flex min-h-14 items-center justify-between rounded-ts-control border-2 px-4 py-3 text-left text-sm text-ts-ink ${
              isSelected
                ? "border-ts-action bg-ts-blush hover:bg-ts-blush-strong active:border-ts-action-pressed active:bg-ts-blush-strong"
                : "border-ts-border bg-ts-surface hover:border-ts-action hover:bg-ts-blush active:border-ts-action-pressed active:bg-ts-blush-strong"
            }`}
            key={topic.id}
            onClick={() => onSelect(topic.id)}
            type="button"
          >
            <span className="font-semibold">{topic.label}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-ts-muted">{cardCountLabel}</span>
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 place-items-center rounded-full border text-xs ${
                  isSelected
                    ? "border-ts-action bg-ts-action text-ts-on-action opacity-100"
                    : "border-ts-divider text-transparent opacity-0"
                }`}
                data-selected-indicator={topic.id}
              >
                ✓
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
