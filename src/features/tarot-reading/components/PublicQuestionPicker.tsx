import type {
  PublicQuestion,
  PublicQuestionGroup,
  PublicQuestionId,
} from "@/features/reading-questions/registry";
import {
  interactiveFocusClassName,
  interactiveMotionClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";

type PublicQuestionPickerCopy = {
  readonly clearQuestionLabel: string;
  readonly questionPickerIntro: string;
  readonly questionPickerOptional: string;
  readonly questionPickerSummary: string;
  readonly selectedQuestionFocusLabel: string;
  readonly selectedQuestionLabel: string;
};

type PublicQuestionPickerProps = {
  readonly copy: PublicQuestionPickerCopy;
  readonly groups: readonly PublicQuestionGroup[];
  readonly onClear: () => void;
  readonly onSelect: (questionId: PublicQuestionId) => void;
  readonly selectedQuestion: PublicQuestion | undefined;
};

export function PublicQuestionPicker({
  copy,
  groups,
  onClear,
  onSelect,
  selectedQuestion,
}: PublicQuestionPickerProps) {
  if (groups.length === 0) return null;

  return (
    <details
      className="group rounded-ts-panel border border-ts-divider bg-ts-surface"
      data-testid="public-question-picker"
      open={selectedQuestion ? true : undefined}
    >
      <summary
        className={`${interactiveFocusClassName} flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-ts-panel px-4 py-3 marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden`}
      >
        <span className="grid gap-0.5">
          <span className="font-semibold text-ts-ink">
            {copy.questionPickerSummary}
          </span>
          <span className="text-xs font-medium text-ts-muted">
            {selectedQuestion?.title ?? copy.questionPickerOptional}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-lg text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>

      <div className="grid gap-4 border-t border-ts-divider p-4 sm:p-5">
        <p className="max-w-3xl text-sm leading-6 text-ts-muted">
          {copy.questionPickerIntro}
        </p>

        {selectedQuestion ? (
          <aside
            className="grid gap-3 rounded-ts-control border border-ts-gold/50 bg-ts-canvas p-4"
            data-testid="selected-public-question"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ts-action">
              {copy.selectedQuestionLabel}
            </p>
            <p className="font-ts-display text-xl font-semibold leading-7 text-ts-ink">
              {selectedQuestion.title}
            </p>
            <div className="grid gap-1 border-l-2 border-ts-gold pl-3">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ts-action">
                {copy.selectedQuestionFocusLabel}
              </p>
              <p className="text-sm leading-6 text-ts-ink">
                {selectedQuestion.summary}
              </p>
            </div>
            <button
              className={`${secondaryButtonClassName} w-fit`}
              onClick={onClear}
              type="button"
            >
              {copy.clearQuestionLabel}
            </button>
          </aside>
        ) : null}

        <div className="grid gap-3" data-testid="public-question-groups">
          {groups.map((group, groupIndex) => (
            <details
              className="group/question rounded-ts-control border border-ts-divider bg-ts-canvas"
              key={group.id}
              open={
                selectedQuestion?.focusId === group.id || groupIndex === 0
                  ? true
                  : undefined
              }
            >
              <summary
                className={`${interactiveFocusClassName} flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-ts-control px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden`}
              >
                <span className="grid gap-1">
                  <span className="font-semibold text-ts-ink">
                    {group.title}
                  </span>
                  <span className="text-xs leading-5 text-ts-muted">
                    {group.intro}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open/question:rotate-180"
                >
                  ⌄
                </span>
              </summary>
              <div className="grid gap-3 border-t border-ts-divider p-3 md:grid-cols-2">
                {group.questions.map((question) => {
                  const isSelected = selectedQuestion?.id === question.id;

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`${interactiveFocusClassName} ${interactiveMotionClassName} grid min-h-28 content-start gap-2 rounded-ts-control border-2 p-4 text-left ${
                        isSelected
                          ? "border-ts-action bg-ts-blush"
                          : "border-ts-divider bg-ts-surface hover:border-ts-action hover:bg-ts-blush"
                      }`}
                      data-testid="public-question-option"
                      key={question.id}
                      onClick={() => onSelect(question.id)}
                      type="button"
                    >
                      <span className="font-semibold leading-6 text-ts-ink">
                        {question.title}
                      </span>
                      <span className="text-sm leading-6 text-ts-muted">
                        {question.summary}
                      </span>
                      <span className="mt-auto text-xs font-semibold text-ts-action">
                        {question.ctaLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </details>
  );
}
