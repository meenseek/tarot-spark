import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicQuestionCatalog } from "@/features/reading-questions";
import { PublicQuestionPicker } from "./PublicQuestionPicker";

const copy = {
  clearQuestionLabel: "Clear question",
  questionPickerIntro: "Choose one question for a closer look.",
  questionPickerOptional: "Optional",
  questionPickerSummary: "Choose a question",
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

    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getAllByTestId("public-question-option")).toHaveLength(6);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Which strength am I overlooking/,
      }),
    );
    expect(onSelect).toHaveBeenCalledWith("career-underused-strength");
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
    fireEvent.click(screen.getByRole("button", { name: "Clear question" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
