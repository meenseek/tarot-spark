import { useId } from "react";
import { Select } from "@measure-twice/react";
import {
  getTopicTaxonomy,
  readingDomainIds,
  type ReadingDomainId,
  type Topic,
  type TopicId,
} from "@/domain/tarot";

type TopicSelectorProps = {
  readonly topics: readonly Topic[];
  readonly selectedTopicId: TopicId;
  readonly heading: string;
  readonly description: string;
  readonly disabled: boolean;
  readonly selectLabel: string;
  readonly groupLabels: Readonly<Record<ReadingDomainId, string>>;
  readonly onSelect: (topicId: TopicId) => void;
};

export function TopicSelector({
  topics,
  selectedTopicId,
  heading,
  description,
  disabled,
  selectLabel,
  groupLabels,
  onSelect,
}: TopicSelectorProps) {
  const descriptionId = useId();

  return (
    <div
      className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] md:items-center md:gap-8"
      data-testid="topic-choice"
    >
      <div className="grid gap-1">
        <p className="font-semibold text-ts-ink">{heading}</p>
        <p className="text-xs leading-5 text-ts-muted" id={descriptionId}>
          {description}
        </p>
      </div>

      <Select
        announceError={false}
        aria-describedby={descriptionId}
        data-testid="topic-select"
        disabled={disabled}
        label={selectLabel}
        name="tarot-topic"
        onChange={(event) => onSelect(event.currentTarget.value as TopicId)}
        size="lg"
        value={selectedTopicId}
        wrapperClassName="ts-topic-select"
      >
        {readingDomainIds.map((domainId) => (
          <optgroup key={domainId} label={groupLabels[domainId]}>
            {topics
              .filter(
                (topic) => getTopicTaxonomy(topic.id).domainId === domainId,
              )
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
          </optgroup>
        ))}
      </Select>
    </div>
  );
}
