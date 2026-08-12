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
    <fieldset className="@container grid gap-3">
      <legend className="text-base font-semibold text-ts-ink">
        {ariaLabel}
      </legend>
      <div
        className="grid rounded-ts-control border border-ts-border bg-ts-surface @[640px]:grid-cols-5"
        data-testid="topic-options"
      >
        {topics.map((topic, index) => {
          const isSelected = topic.id === selectedTopicId;
          const nextIsSelected = topics[index + 1]?.id === selectedTopicId;
          const hasDivider =
            index < topics.length - 1 && !isSelected && !nextIsSelected;

          return (
            <label
              className={`${interactiveFocusClassName} ${interactiveMotionClassName} group relative flex min-h-12 cursor-pointer items-center justify-between gap-2 border-2 border-transparent px-3 py-2 text-left text-sm text-ts-ink first:rounded-t-[11px] last:rounded-b-[11px] hover:z-10 active:z-10 has-[:focus-visible]:z-20 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ts-action @[640px]:min-h-16 @[640px]:px-2 @[640px]:py-3 @[640px]:first:rounded-bl-[11px] @[640px]:first:rounded-tr-none @[640px]:last:rounded-bl-none @[640px]:last:rounded-tr-[11px] ${
                isSelected
                  ? "z-10 border-ts-action bg-ts-blush hover:bg-ts-blush-strong active:border-ts-action-pressed active:bg-ts-blush-strong"
                  : "bg-ts-surface hover:border-ts-action hover:bg-ts-blush active:border-ts-action-pressed active:bg-ts-blush-strong"
              }`}
              data-testid="topic-option"
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
              <span
                className="min-w-0 font-semibold leading-5 @[640px]:mr-6"
                data-testid="topic-option-label"
              >
                {topic.label}
              </span>
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs @[640px]:absolute @[640px]:top-1/2 @[640px]:right-2 @[640px]:-translate-y-1/2 ${
                  isSelected
                    ? "border-ts-action bg-ts-action text-ts-on-action opacity-100"
                    : "border-ts-divider text-transparent opacity-0"
                }`}
                data-selected-indicator={topic.id}
              >
                ✓
              </span>
              {hasDivider && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-px bg-ts-divider group-hover:hidden group-active:hidden @[640px]:inset-y-2 @[640px]:-right-0.5 @[640px]:left-auto @[640px]:h-auto @[640px]:w-px"
                  data-testid="topic-divider"
                />
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
