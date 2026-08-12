import "server-only";

import type { Metadata } from "next";
import { type Locale } from "@/i18n/config";
import { withLocalizedAlternates } from "@/i18n/seo";
import enMessages from "@/messages/en/relationship-questions.json";
import koMessages from "@/messages/ko/relationship-questions.json";
import {
  relationshipQuestionDefinitions,
  relationshipQuestionFocusIds,
  type RelationshipQuestionFocusId,
  type RelationshipQuestionId,
} from "@/domain/tarot";
import { getRelationshipQuestionPath } from "./paths";
import type {
  RelationshipQuestion,
  RelationshipQuestionCatalog,
} from "./types";

type RawQuestionCopy = {
  readonly title: string;
  readonly summary: string;
  readonly focus: string;
  readonly ctaLabel: string;
};

type RelationshipQuestionMessages = {
  readonly metadata: {
    readonly title: string;
    readonly description: string;
  };
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly methodHeading: string;
  readonly methodIntro: string;
  readonly methodGuideLinkLabel: string;
  readonly methodSteps: readonly string[];
  readonly comparisonHeading: string;
  readonly weakQuestionLabel: string;
  readonly weakQuestion: string;
  readonly strongQuestionLabel: string;
  readonly strongQuestion: string;
  readonly browseHeading: string;
  readonly categoryNavigationLabel: string;
  readonly workedExampleHeading: string;
  readonly workedExampleBody: string;
  readonly workedExampleItems: readonly string[];
  readonly disclaimer: string;
  readonly categories: Readonly<
    Record<
      RelationshipQuestionFocusId,
      { readonly title: string; readonly intro: string }
    >
  >;
  readonly questions: Readonly<Record<RelationshipQuestionId, RawQuestionCopy>>;
};

const messagesByLocale = {
  en: enMessages,
  ko: koMessages,
} satisfies Record<Locale, RelationshipQuestionMessages>;

export function getRelationshipQuestionCatalog(
  locale: Locale,
): RelationshipQuestionCatalog {
  const messages = messagesByLocale[locale];
  const questions = relationshipQuestionDefinitions.map(
    (definition): RelationshipQuestion => ({
      ...definition,
      ...messages.questions[definition.id],
    }),
  );

  return {
    questions,
    categories: relationshipQuestionFocusIds.map((focusId) => ({
      id: focusId,
      ...messages.categories[focusId],
      questions: questions.filter((question) => question.focusId === focusId),
    })),
  };
}

export function getRelationshipQuestionExplorerShellCopy(locale: Locale) {
  const {
    metadata: _metadata,
    categories: _categories,
    questions: _questions,
    ...copy
  } = messagesByLocale[locale];

  return copy;
}

export function getRelationshipQuestionExplorerMetadata(
  locale: Locale,
): Metadata {
  return withLocalizedAlternates(
    messagesByLocale[locale].metadata,
    locale,
    getRelationshipQuestionPath,
  );
}
