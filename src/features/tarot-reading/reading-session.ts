import type {
  DrawnCard,
  ReadingStyleId,
  SpreadId,
  TopicId,
} from "@/domain/tarot";

export type ReadingInputs = {
  readonly topicId: TopicId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly privateContext: string;
};

export type CurrentResult = {
  readonly inputs: ReadingInputs;
  readonly cards: readonly DrawnCard[];
  readonly drawStyleId: ReadingStyleId;
  readonly cardInstanceId: number;
  readonly publicStateRevision: number;
  readonly promptRevision: number;
};

export type Session =
  | { readonly mode: "setup"; readonly draft: ReadingInputs }
  | { readonly mode: "result"; readonly current: CurrentResult }
  | {
      readonly mode: "edit-next-draw";
      readonly current: CurrentResult;
      readonly draft: ReadingInputs;
    };

export type SessionAction =
  | { readonly type: "SET_DRAFT_TOPIC"; readonly topicId: TopicId }
  | { readonly type: "SET_DRAFT_SPREAD"; readonly spreadId: SpreadId }
  | { readonly type: "SET_DRAFT_STYLE"; readonly styleId: ReadingStyleId }
  | {
      readonly type: "SET_DRAFT_PRIVATE_CONTEXT";
      readonly privateContext: string;
    }
  | { readonly type: "ENTER_EDIT" }
  | { readonly type: "CANCEL_EDIT" }
  | { readonly type: "DRAW_COMMIT"; readonly cards: readonly DrawnCard[] }
  | { readonly type: "REDRAW_CURRENT"; readonly cards: readonly DrawnCard[] }
  | { readonly type: "SET_CURRENT_STYLE"; readonly styleId: ReadingStyleId }
  | {
      readonly type: "SET_CURRENT_PRIVATE_CONTEXT";
      readonly privateContext: string;
    };

export type ResultSessionSeed = {
  readonly inputs: ReadingInputs;
  readonly cards: readonly DrawnCard[];
  readonly drawStyleId?: ReadingStyleId;
};

export function createSetupSession(inputs: ReadingInputs): Session {
  return { mode: "setup", draft: { ...inputs } };
}

export function createResultSession(seed: ResultSessionSeed): Session {
  return {
    mode: "result",
    current: {
      inputs: { ...seed.inputs },
      cards: seed.cards,
      drawStyleId: seed.drawStyleId ?? seed.inputs.styleId,
      cardInstanceId: 1,
      publicStateRevision: 1,
      promptRevision: 1,
    },
  };
}

export function readingSessionReducer(
  session: Session,
  action: SessionAction,
): Session {
  switch (action.type) {
    case "SET_DRAFT_TOPIC":
      return updateDraft(session, "topicId", action.topicId);
    case "SET_DRAFT_SPREAD":
      return updateDraft(session, "spreadId", action.spreadId);
    case "SET_DRAFT_STYLE":
      return updateDraft(session, "styleId", action.styleId);
    case "SET_DRAFT_PRIVATE_CONTEXT":
      return updateDraft(session, "privateContext", action.privateContext);
    case "ENTER_EDIT":
      return session.mode === "result"
        ? {
            mode: "edit-next-draw",
            current: session.current,
            draft: { ...session.current.inputs },
          }
        : session;
    case "CANCEL_EDIT":
      return session.mode === "edit-next-draw"
        ? { mode: "result", current: session.current }
        : session;
    case "DRAW_COMMIT":
      if (session.mode === "result") {
        return session;
      }

      return commitDraw(
        session.draft,
        action.cards,
        session.mode === "edit-next-draw" ? session.current : undefined,
      );
    case "REDRAW_CURRENT":
      return session.mode === "result"
        ? commitDraw(session.current.inputs, action.cards, session.current)
        : session;
    case "SET_CURRENT_STYLE":
      if (
        session.mode !== "result" ||
        session.current.inputs.styleId === action.styleId
      ) {
        return session;
      }

      return {
        mode: "result",
        current: {
          ...session.current,
          inputs: { ...session.current.inputs, styleId: action.styleId },
          publicStateRevision: session.current.publicStateRevision + 1,
          promptRevision: session.current.promptRevision + 1,
        },
      };
    case "SET_CURRENT_PRIVATE_CONTEXT":
      if (
        session.mode !== "result" ||
        session.current.inputs.privateContext === action.privateContext
      ) {
        return session;
      }

      return {
        mode: "result",
        current: {
          ...session.current,
          inputs: {
            ...session.current.inputs,
            privateContext: action.privateContext,
          },
          promptRevision: session.current.promptRevision + 1,
        },
      };
  }
}

function updateDraft<Key extends keyof ReadingInputs>(
  session: Session,
  key: Key,
  value: ReadingInputs[Key],
): Session {
  if (session.mode === "result" || session.draft[key] === value) {
    return session;
  }

  return {
    ...session,
    draft: { ...session.draft, [key]: value },
  };
}

function commitDraw(
  inputs: ReadingInputs,
  cards: readonly DrawnCard[],
  previous?: CurrentResult,
): Session {
  return {
    mode: "result",
    current: {
      inputs: { ...inputs },
      cards,
      drawStyleId: inputs.styleId,
      cardInstanceId: (previous?.cardInstanceId ?? 0) + 1,
      publicStateRevision: (previous?.publicStateRevision ?? 0) + 1,
      promptRevision: (previous?.promptRevision ?? 0) + 1,
    },
  };
}
