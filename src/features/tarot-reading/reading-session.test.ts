import { describe, expect, it } from "vitest";
import type { DrawnCard } from "@/domain/tarot";
import {
  createResultSession,
  createSetupSession,
  readingSessionReducer,
  type ReadingInputs,
  type Session,
  type SessionAction,
} from "./reading-session";

const defaultInputs: ReadingInputs = {
  topicId: "love",
  spreadId: "quick",
  styleId: "balanced",
  privateContext: "A private situation",
};

const firstCards = [createDrawnCard("the-fool", "The Fool")];
const secondCards = [createDrawnCard("the-magician", "The Magician")];

describe("reading session reducer", () => {
  it("creates setup and restored result sessions with isolated inputs", () => {
    const setup = createSetupSession(defaultInputs);
    const restored = createResultSession({
      inputs: defaultInputs,
      cards: firstCards,
      drawStyleId: "direct",
    });

    expect(setup).toEqual({ mode: "setup", draft: defaultInputs });
    expect(setup.mode === "setup" && setup.draft).not.toBe(defaultInputs);
    expect(restored).toEqual({
      mode: "result",
      current: {
        inputs: defaultInputs,
        cards: firstCards,
        drawStyleId: "direct",
        cardInstanceId: 1,
        publicStateRevision: 1,
        promptRevision: 1,
      },
    });
    expect(restored.mode === "result" && restored.current.inputs).not.toBe(
      defaultInputs,
    );
  });

  it("copies every current input into an independent next-draw draft", () => {
    const result = createResult();
    const editing = readingSessionReducer(result, { type: "ENTER_EDIT" });

    expect(editing.mode).toBe("edit-next-draw");
    if (editing.mode !== "edit-next-draw" || result.mode !== "result") {
      throw new Error("Expected result to enter edit mode");
    }

    expect(editing.current).toBe(result.current);
    expect(editing.draft).toEqual(result.current.inputs);
    expect(editing.draft).not.toBe(result.current.inputs);
  });

  it("changes every draft control without mutating the committed result", () => {
    const result = createResult();
    const editing = reduce(result, [
      { type: "ENTER_EDIT" },
      { type: "SET_DRAFT_TOPIC", topicId: "career-direction" },
      { type: "SET_DRAFT_SPREAD", spreadId: "deep" },
      { type: "SET_DRAFT_STYLE", styleId: "practical" },
      {
        type: "SET_DRAFT_PRIVATE_CONTEXT",
        privateContext: "Next draw only",
      },
    ]);

    expect(editing.mode).toBe("edit-next-draw");
    if (editing.mode !== "edit-next-draw" || result.mode !== "result") {
      throw new Error("Expected an editable result");
    }

    expect(editing.current).toBe(result.current);
    expect(editing.current.inputs).toEqual(defaultInputs);
    expect(editing.draft).toEqual({
      topicId: "career-direction",
      spreadId: "deep",
      styleId: "practical",
      privateContext: "Next draw only",
    });
  });

  it("discards the entire draft when edit mode is canceled", () => {
    const result = createResult();
    const editing = reduce(result, [
      { type: "ENTER_EDIT" },
      { type: "SET_DRAFT_TOPIC", topicId: "feelings" },
      { type: "SET_DRAFT_PRIVATE_CONTEXT", privateContext: "Discard me" },
    ]);
    const canceled = readingSessionReducer(editing, { type: "CANCEL_EDIT" });

    expect(canceled).toEqual(result);
    if (canceled.mode !== "result" || result.mode !== "result") {
      throw new Error("Expected cancel to restore the result");
    }
    expect(canceled.current).toBe(result.current);
  });

  it("commits setup inputs and cards as one first result snapshot", () => {
    const setup = createSetupSession(defaultInputs);
    const result = readingSessionReducer(setup, {
      type: "DRAW_COMMIT",
      cards: firstCards,
    });

    expect(result).toEqual({
      mode: "result",
      current: {
        inputs: defaultInputs,
        cards: firstCards,
        drawStyleId: "balanced",
        cardInstanceId: 1,
        publicStateRevision: 1,
        promptRevision: 1,
      },
    });
  });

  it("atomically commits the next-draw draft and advances all draw identities", () => {
    const editing = reduce(createResult(), [
      { type: "ENTER_EDIT" },
      { type: "SET_DRAFT_TOPIC", topicId: "reunion" },
      { type: "SET_DRAFT_SPREAD", spreadId: "deep" },
      { type: "SET_DRAFT_STYLE", styleId: "direct" },
      {
        type: "SET_DRAFT_PRIVATE_CONTEXT",
        privateContext: "Committed context",
      },
    ]);
    const result = readingSessionReducer(editing, {
      type: "DRAW_COMMIT",
      cards: secondCards,
    });

    expect(result).toEqual({
      mode: "result",
      current: {
        inputs: {
          topicId: "reunion",
          spreadId: "deep",
          styleId: "direct",
          privateContext: "Committed context",
        },
        cards: secondCards,
        drawStyleId: "direct",
        cardInstanceId: 2,
        publicStateRevision: 2,
        promptRevision: 2,
      },
    });
  });

  it("redraws with committed inputs", () => {
    const changed = reduce(createResult(), [
      { type: "SET_CURRENT_STYLE", styleId: "relational" },
      {
        type: "SET_CURRENT_PRIVATE_CONTEXT",
        privateContext: "Updated current context",
      },
    ]);
    const redrawn = readingSessionReducer(changed, {
      type: "REDRAW_CURRENT",
      cards: secondCards,
    });

    expect(redrawn.mode).toBe("result");
    if (redrawn.mode !== "result" || changed.mode !== "result") {
      throw new Error("Expected a result after redraw");
    }

    expect(redrawn.current.inputs).toEqual(changed.current.inputs);
    expect(redrawn.current.cards).toBe(secondCards);
    expect(redrawn.current.drawStyleId).toBe("relational");
    expect(redrawn.current.cardInstanceId).toBe(
      changed.current.cardInstanceId + 1,
    );
    expect(redrawn.current.publicStateRevision).toBe(
      changed.current.publicStateRevision + 1,
    );
    expect(redrawn.current.promptRevision).toBe(
      changed.current.promptRevision + 1,
    );
  });

  it("changes current style while preserving the draw snapshot identity", () => {
    const result = createResult();
    const changed = readingSessionReducer(result, {
      type: "SET_CURRENT_STYLE",
      styleId: "direct",
    });

    expect(changed.mode).toBe("result");
    if (changed.mode !== "result" || result.mode !== "result") {
      throw new Error("Expected a current result");
    }

    expect(changed.current.inputs.styleId).toBe("direct");
    expect(changed.current.drawStyleId).toBe("balanced");
    expect(changed.current.cards).toBe(result.current.cards);
    expect(changed.current.cardInstanceId).toBe(result.current.cardInstanceId);
    expect(changed.current.publicStateRevision).toBe(
      result.current.publicStateRevision + 1,
    );
    expect(changed.current.promptRevision).toBe(
      result.current.promptRevision + 1,
    );
  });

  it("changes current context with a prompt-only revision", () => {
    const result = createResult();
    const contextChanged = readingSessionReducer(result, {
      type: "SET_CURRENT_PRIVATE_CONTEXT",
      privateContext: "Updated current context",
    });
    expect(contextChanged.mode).toBe("result");
    if (contextChanged.mode !== "result" || result.mode !== "result") {
      throw new Error("Expected a current result");
    }

    expect(contextChanged.current.inputs.privateContext).toBe(
      "Updated current context",
    );
    expect(contextChanged.current.cardInstanceId).toBe(
      result.current.cardInstanceId,
    );
    expect(contextChanged.current.publicStateRevision).toBe(
      result.current.publicStateRevision,
    );
    expect(contextChanged.current.promptRevision).toBe(
      result.current.promptRevision + 1,
    );
  });

  it.each([
    [{ type: "SET_DRAFT_TOPIC", topicId: "love" }],
    [{ type: "SET_DRAFT_SPREAD", spreadId: "quick" }],
    [{ type: "SET_DRAFT_STYLE", styleId: "balanced" }],
    [
      {
        type: "SET_DRAFT_PRIVATE_CONTEXT",
        privateContext: "A private situation",
      },
    ],
  ] satisfies readonly [SessionAction][])(
    "returns the identical setup session for an unchanged draft action %#",
    (action) => {
      const setup = createSetupSession(defaultInputs);

      expect(readingSessionReducer(setup, action)).toBe(setup);
    },
  );

  it.each([
    [{ type: "SET_CURRENT_STYLE", styleId: "balanced" }],
    [
      {
        type: "SET_CURRENT_PRIVATE_CONTEXT",
        privateContext: "A private situation",
      },
    ],
  ] satisfies readonly [SessionAction][])(
    "returns the identical result session for an unchanged current action %#",
    (action) => {
      const result = createResult();

      expect(readingSessionReducer(result, action)).toBe(result);
    },
  );

  it("treats actions outside their owning mode as total no-ops", () => {
    const setup = createSetupSession(defaultInputs);
    const result = createResult();
    const editing = readingSessionReducer(result, { type: "ENTER_EDIT" });

    expect(readingSessionReducer(setup, { type: "CANCEL_EDIT" })).toBe(setup);
    expect(readingSessionReducer(setup, { type: "ENTER_EDIT" })).toBe(setup);
    expect(
      readingSessionReducer(setup, {
        type: "SET_CURRENT_STYLE",
        styleId: "direct",
      }),
    ).toBe(setup);
    expect(
      readingSessionReducer(result, {
        type: "SET_DRAFT_TOPIC",
        topicId: "feelings",
      }),
    ).toBe(result);
    expect(
      readingSessionReducer(result, {
        type: "DRAW_COMMIT",
        cards: secondCards,
      }),
    ).toBe(result);
    expect(
      readingSessionReducer(editing, {
        type: "REDRAW_CURRENT",
        cards: secondCards,
      }),
    ).toBe(editing);
  });
});

function createResult(): Session {
  return createResultSession({ inputs: defaultInputs, cards: firstCards });
}

function reduce(initial: Session, actions: readonly SessionAction[]): Session {
  return actions.reduce(readingSessionReducer, initial);
}

function createDrawnCard(
  cardId: "the-fool" | "the-magician",
  name: string,
): DrawnCard {
  return {
    card: {
      id: cardId,
      name,
      meaning: "test meaning",
      reflection: "test reflection",
    },
  };
}
