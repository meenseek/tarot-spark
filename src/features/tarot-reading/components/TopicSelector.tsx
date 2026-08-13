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
  readonly ariaLabel: string;
  readonly description: string;
  readonly groupLabels: Readonly<Record<ReadingDomainId, string>>;
  readonly onSelect: (topicId: TopicId) => void;
};

export function TopicSelector({
  topics,
  selectedTopicId,
  ariaLabel,
  description,
  groupLabels,
  onSelect,
}: TopicSelectorProps) {
  return (
    <Select
      announceError={false}
      data-testid="topic-select"
      description={description}
      label={ariaLabel}
      name="tarot-topic"
      onChange={(event) => onSelect(event.currentTarget.value as TopicId)}
      size="lg"
      value={selectedTopicId}
      wrapperClassName="ts-topic-select"
    >
      {readingDomainIds.map((domainId) => (
        <optgroup key={domainId} label={groupLabels[domainId]}>
          {topics
            .filter((topic) => getTopicTaxonomy(topic.id).domainId === domainId)
            .map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.label}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  );
}
