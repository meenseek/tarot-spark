import "server-only";

import {
  publicQuestionDefinitions,
  type CareerQuestionFocusId,
  type CareerQuestionId,
  type RelationshipQuestionFocusId,
  type RelationshipQuestionId,
  type SelfQuestionFocusId,
  type SelfQuestionId,
} from "@/domain/tarot";
import type { Locale } from "@/i18n/config";
import enCareerMessages from "@/messages/en/career-questions.json";
import enRelationshipMessages from "@/messages/en/relationship-questions.json";
import enSelfMessages from "@/messages/en/self-questions.json";
import koCareerMessages from "@/messages/ko/career-questions.json";
import koRelationshipMessages from "@/messages/ko/relationship-questions.json";
import koSelfMessages from "@/messages/ko/self-questions.json";
import type {
  PublicQuestion,
  PublicQuestionCatalog,
  PublicQuestionGroup,
} from "./types";

type QuestionCopy = {
  readonly title: string;
  readonly summary: string;
  readonly focus: string;
  readonly ctaLabel: string;
};

type GroupCopy = {
  readonly title: string;
  readonly intro: string;
};

type RelationshipMessages = {
  readonly categories: Readonly<Record<RelationshipQuestionFocusId, GroupCopy>>;
  readonly questions: Readonly<Record<RelationshipQuestionId, QuestionCopy>>;
};

type CareerMessages = {
  readonly categories: Readonly<Record<CareerQuestionFocusId, GroupCopy>>;
  readonly questions: Readonly<Record<CareerQuestionId, QuestionCopy>>;
};

type SelfMessages = {
  readonly categories: Readonly<Record<SelfQuestionFocusId, GroupCopy>>;
  readonly questions: Readonly<Record<SelfQuestionId, QuestionCopy>>;
};

const relationshipMessagesByLocale = {
  en: enRelationshipMessages,
  ko: koRelationshipMessages,
} satisfies Record<Locale, RelationshipMessages>;

const careerMessagesByLocale = {
  en: enCareerMessages,
  ko: koCareerMessages,
} satisfies Record<Locale, CareerMessages>;

const selfMessagesByLocale = {
  en: enSelfMessages,
  ko: koSelfMessages,
} satisfies Record<Locale, SelfMessages>;

export function getPublicQuestionCatalog(
  locale: Locale,
): PublicQuestionCatalog {
  const relationshipMessages = relationshipMessagesByLocale[locale];
  const careerMessages = careerMessagesByLocale[locale];
  const selfMessages = selfMessagesByLocale[locale];
  const questions = publicQuestionDefinitions.map((definition) => {
    const copy = (() => {
      switch (definition.domainId) {
        case "relationship":
          return relationshipMessages.questions[definition.id];
        case "career":
          return careerMessages.questions[definition.id];
        case "self":
          return selfMessages.questions[definition.id];
      }
    })();

    return { ...definition, ...copy } as PublicQuestion;
  });

  const groups = publicQuestionDefinitions.reduce<PublicQuestionGroup[]>(
    (groups, definition) => {
      if (
        groups.some(
          ({ domainId, id }) =>
            domainId === definition.domainId && id === definition.focusId,
        )
      ) {
        return groups;
      }

      const copy = (() => {
        switch (definition.domainId) {
          case "relationship":
            return relationshipMessages.categories[definition.focusId];
          case "career":
            return careerMessages.categories[definition.focusId];
          case "self":
            return selfMessages.categories[definition.focusId];
        }
      })();

      return [
        ...groups,
        {
          id: definition.focusId,
          domainId: definition.domainId,
          ...copy,
          questions: questions.filter(
            (question) =>
              question.domainId === definition.domainId &&
              question.focusId === definition.focusId,
          ),
        },
      ];
    },
    [],
  );

  return {
    groups,
    questions,
  };
}
