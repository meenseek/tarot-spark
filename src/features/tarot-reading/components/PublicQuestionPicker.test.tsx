import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicQuestionCatalog } from "@/features/reading-questions";
import { PublicQuestionPicker } from "./PublicQuestionPicker";

const copy = {
  clearQuestionLabel: "Clear specific question",
  questionPickerIntro:
    "A question may adjust the topic above. Clearing it keeps that topic.",
  questionPickerCount: "{count} questions in this area",
  questionPickerSummary: "Or choose a specific question",
  selectedQuestionFocusLabel: "What to explore",
  selectedQuestionLabel: "Your question",
};

describe("PublicQuestionPicker", () => {
  afterEach(cleanup);

  it("groups relevant questions while keeping the question optional", () => {
    const onSelect = vi.fn();
    const groups = getPublicQuestionCatalog("en").groups.filter(
      ({ domainId }) => domainId === "career",
    );

    render(
      <PublicQuestionPicker
        copy={copy}
        groups={groups}
        onClear={vi.fn()}
        onSelect={onSelect}
        selectedQuestion={undefined}
      />,
    );

    expect(screen.getByText("14 questions in this area")).toBeInTheDocument();
    expect(screen.getAllByTestId("public-question-option")).toHaveLength(14);
    const picker = screen.getByTestId(
      "public-question-picker",
    ) as HTMLDetailsElement;
    const summary = screen
      .getByText("Or choose a specific question")
      .closest("summary");
    const question = screen.getByRole("button", {
      name: /Which strength am I overlooking/,
    });

    picker.open = true;
    expect(
      picker.querySelector<HTMLDetailsElement>("[data-question-focus]")
        ?.dataset["questionFocus"],
    ).toBe("perception-recognition");
    expect(
      picker.querySelector<HTMLDetailsElement>("[data-question-focus]"),
    ).toHaveAttribute("open");
    question.focus();
    fireEvent.click(question);

    expect(onSelect).toHaveBeenCalledWith("career-underused-strength");
    expect(picker).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();
  });

  it("shows friendly selected copy and clears back to the broad topic", () => {
    const catalog = getPublicQuestionCatalog("en");
    const selectedQuestion = catalog.questions.find(
      ({ id }) => id === "career-sustainable-boundary",
    );
    const onClear = vi.fn();

    render(
      <PublicQuestionPicker
        copy={copy}
        groups={catalog.groups.filter(({ domainId }) => domainId === "career")}
        onClear={onClear}
        onSelect={vi.fn()}
        selectedQuestion={selectedQuestion}
      />,
    );

    expect(screen.getByTestId("selected-public-question")).toHaveTextContent(
      "Find one lasting limit for time, responsibility, or communication",
    );
    expect(
      screen.getByTestId("selected-public-question"),
    ).not.toHaveTextContent("Do not assess my health");
    const picker = screen.getByTestId(
      "public-question-picker",
    ) as HTMLDetailsElement;
    const summary = screen
      .getByText("Or choose a specific question")
      .closest("summary");
    expect(summary).toHaveTextContent("Which work limit should I set first?");
    expect(summary).not.toHaveTextContent("14 questions in this area");

    picker.open = true;
    fireEvent.click(
      screen.getByRole("button", { name: "Clear specific question" }),
    );

    expect(onClear).toHaveBeenCalledOnce();
    expect(picker).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();
  });

  it("resets open groups when the picker closes", () => {
    const catalog = getPublicQuestionCatalog("en");
    const groups = catalog.groups.filter(
      ({ domainId }) => domainId === "career",
    );
    const selectedQuestion = catalog.questions.find(
      ({ id }) => id === "career-sustainable-boundary",
    );

    render(
      <PublicQuestionPicker
        copy={copy}
        groups={groups}
        onClear={vi.fn()}
        onSelect={vi.fn()}
        selectedQuestion={selectedQuestion}
      />,
    );

    const picker = screen.getByTestId(
      "public-question-picker",
    ) as HTMLDetailsElement;
    const questionGroups = Array.from(
      picker.querySelectorAll<HTMLDetailsElement>("[data-question-focus]"),
    );

    questionGroups.forEach((group) => {
      group.open = true;
    });
    picker.open = false;
    fireEvent(picker, new Event("toggle"));

    expect(questionGroups.filter(({ open }) => open)).toHaveLength(1);
    expect(
      questionGroups.find(({ open }) => open)?.dataset["questionFocus"],
    ).toBe(selectedQuestion?.focusId);
  });
});
