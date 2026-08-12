import "server-only";

import {
  careerQuestionDefinitions,
  publicQuestionDefinitions,
  relationshipQuestionDefinitions,
  type CareerQuestionFocusId,
  type CareerQuestionId,
  type RelationshipQuestionFocusId,
  type RelationshipQuestionId,
} from "@/domain/tarot";
import type { Locale } from "@/i18n/config";
import enCareerMessages from "@/messages/en/career-questions.json";
import enRelationshipMessages from "@/messages/en/relationship-questions.json";
import koCareerMessages from "@/messages/ko/career-questions.json";
import koRelationshipMessages from "@/messages/ko/relationship-questions.json";
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

const relationshipMessagesByLocale = {
  en: enRelationshipMessages,
  ko: koRelationshipMessages,
} satisfies Record<Locale, RelationshipMessages>;

const careerMessagesByLocale = {
  en: enCareerMessages,
  ko: koCareerMessages,
} satisfies Record<Locale, CareerMessages>;

export function getPublicQuestionCatalog(
  locale: Locale,
): PublicQuestionCatalog {
  const relationshipMessages = relationshipMessagesByLocale[locale];
  const careerMessages = careerMessagesByLocale[locale];
  const questions = publicQuestionDefinitions.map((definition) => {
    const copy =
      definition.domainId === "relationship"
        ? relationshipMessages.questions[definition.id]
        : careerMessages.questions[definition.id];

    return { ...definition, ...copy } as PublicQuestion;
  });

  const relationshipGroups = relationshipQuestionDefinitions.reduce<
    PublicQuestionGroup[]
  >((groups, definition) => {
    if (groups.some(({ id }) => id === definition.focusId)) return groups;
    return [
      ...groups,
      {
        id: definition.focusId,
        domainId: "relationship",
        ...relationshipMessages.categories[definition.focusId],
        questions: questions.filter(
          (question) =>
            question.domainId === "relationship" &&
            question.focusId === definition.focusId,
        ),
      },
    ];
  }, []);
  const careerGroups = careerQuestionDefinitions.reduce<PublicQuestionGroup[]>(
    (groups, definition) => {
      if (groups.some(({ id }) => id === definition.focusId)) return groups;
      return [
        ...groups,
        {
          id: definition.focusId,
          domainId: "career",
          ...careerMessages.categories[definition.focusId],
          questions: questions.filter(
            (question) =>
              question.domainId === "career" &&
              question.focusId === definition.focusId,
          ),
        },
      ];
    },
    [],
  );

  return {
    groups: [...relationshipGroups, ...careerGroups],
    questions,
  };
}
