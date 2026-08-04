import type { Topic, TopicId } from "@/domain/tarot";
import {
  interactiveFocusClassName,
  interactiveMotionClassName,
} from "@/components/visual/class-names";

type TopicSelectorProps = {
  readonly topics: readonly Topic[];
  readonly selectedTopicId: TopicId;
  readonly ariaLabel: string;
  readonly onSelect: (topicId: TopicId) => void;
};

export function TopicSelector({
  topics,
  selectedTopicId,
  ariaLabel,
  onSelect,
}: TopicSelectorProps) {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-base font-semibold text-ts-ink">
        {ariaLabel}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {topics.map((topic) => {
          const isSelected = topic.id === selectedTopicId;

          return (
            <label
              className={`${interactiveFocusClassName} ${interactiveMotionClassName} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ts-action flex min-h-14 cursor-pointer items-center justify-between gap-2 rounded-ts-control border-2 px-3 py-3 text-left text-sm text-ts-ink sm:px-4 ${
                isSelected
                  ? "border-ts-action bg-ts-blush hover:bg-ts-blush-strong active:border-ts-action-pressed active:bg-ts-blush-strong"
                  : "border-ts-border bg-ts-surface hover:border-ts-action hover:bg-ts-blush active:border-ts-action-pressed active:bg-ts-blush-strong"
              }`}
              key={topic.id}
            >
              <input
                checked={isSelected}
                className="sr-only"
                name="tarot-topic"
                onChange={() => onSelect(topic.id)}
                type="radio"
                value={topic.id}
              />
              <span className="min-w-0 font-semibold leading-5">
                {topic.label}
              </span>
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${
                  isSelected
                    ? "border-ts-action bg-ts-action text-ts-on-action opacity-100"
                    : "border-ts-divider text-transparent opacity-0"
                }`}
                data-selected-indicator={topic.id}
              >
                ✓
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
