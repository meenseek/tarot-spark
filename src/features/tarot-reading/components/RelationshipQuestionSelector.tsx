import type {
  RelationshipQuestion,
  RelationshipQuestionId,
} from "@/features/relationship-questions/registry";

type RelationshipQuestionSelectorProps = {
  readonly label: string;
  readonly onSelect: (questionId: RelationshipQuestionId) => void;
  readonly questions: readonly RelationshipQuestion[];
  readonly selectedQuestionId: RelationshipQuestionId;
};

export function RelationshipQuestionSelector({
  label,
  onSelect,
  questions,
  selectedQuestionId,
}: RelationshipQuestionSelectorProps) {
  const selectId = "relationship-question-selector";

  return (
    <label
      className="grid min-w-0 gap-2 text-sm font-semibold text-ts-ink"
      htmlFor={selectId}
    >
      {label}
      <select
        className="min-h-11 min-w-0 w-full rounded-ts-control border-2 border-ts-border bg-ts-surface px-3 py-2 text-sm font-medium text-ts-ink outline-none transition-colors duration-[var(--ts-motion-fast)] focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
        data-testid="relationship-question-selector"
        id={selectId}
        onChange={(event) => {
          const question = questions.find(
            ({ id }) => id === event.currentTarget.value,
          );

          if (question) {
            onSelect(question.id);
          }
        }}
        value={selectedQuestionId}
      >
        {questions.map((question) => (
          <option key={question.id} value={question.id}>
            {question.title}
          </option>
        ))}
      </select>
    </label>
  );
}
