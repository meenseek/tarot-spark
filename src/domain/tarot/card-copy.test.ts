import { describe, expect, it } from "vitest";
import enCards from "@/messages/en/tarot-cards.json";
import koCards from "@/messages/ko/tarot-cards.json";
import { canonicalTarotCardIds } from "./card-catalog";

const copyByLocale = { en: enCards, ko: koCards } as const;
const forbiddenVisualTerms = {
  en: /\b(image|imagery|picture|pictured|depicts?|depicted|illustrations?|illustrated|animals?|dogs?|lions?|figures?|symbols?|colou?rs?)\b/i,
  ko: /(그림|이미지|묘사|그려진|동물|강아지|사자|인물|상징|색깔|색상)/,
} as const;
const deterministicTerms = {
  en: /\b(definitely|certainly|will (?:happen|occur)|(?:is|are) destined|guarantees?|predicts?)\b/i,
  ko: /(반드시|무조건|틀림없이|확실히 .*할 것입니다|곧 .*옵니다|재회하게 됩니다|결혼하게 됩니다|미래를 예측)/,
} as const;
const courtPersonTerms = {
  en: /\b(woman|women|man|men|boy|girl|male|female|child)\b/i,
  ko: /(여성|남성|여자|남자|아이|소년|소녀|특정 인물)/,
} as const;
const majorNames = {
  en: [
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
  ],
  ko: [
    "바보",
    "마법사",
    "여사제",
    "여황제",
    "황제",
    "교황",
    "연인",
    "전차",
    "힘",
    "은둔자",
    "운명의 수레바퀴",
    "정의",
    "매달린 사람",
    "죽음",
    "절제",
    "악마",
    "탑",
    "별",
    "달",
    "태양",
    "심판",
    "세계",
  ],
} as const;

describe("localized tarot card copy", () => {
  it.each(Object.entries(copyByLocale))(
    "%s contains exact, nonvisual copy for all 78 cards",
    (locale, cards) => {
      expect(Object.keys(cards)).toEqual(canonicalTarotCardIds);

      for (const cardId of canonicalTarotCardIds) {
        const card = cards[cardId];
        const allCopy = `${card.meaning}\n${card.reflection}`;

        expect(card.name.trim()).not.toBe("");
        expect(card.meaning.trim()).not.toBe("");
        expect(card.reflection.trim()).not.toBe("");
        expect(allCopy).not.toMatch(
          forbiddenVisualTerms[locale as keyof typeof forbiddenVisualTerms],
        );
        expect(allCopy).not.toMatch(
          deterministicTerms[locale as keyof typeof deterministicTerms],
        );

        if (
          /^(wands|cups|swords|pentacles)-(page|knight|queen|king)$/.test(
            cardId,
          )
        ) {
          expect(allCopy).not.toMatch(
            courtPersonTerms[locale as keyof typeof courtPersonTerms],
          );
        }
      }
    },
  );

  it("locks exact major names in both locales", () => {
    const majorIds = canonicalTarotCardIds.slice(0, 22);

    expect(majorIds.map((cardId) => enCards[cardId].name)).toEqual(
      majorNames.en,
    );
    expect(majorIds.map((cardId) => koCards[cardId].name)).toEqual(
      majorNames.ko,
    );
  });

  it("uses exact Korean suit-first names for every minor card", () => {
    const suitNames = {
      cups: "컵",
      pentacles: "펜타클",
      swords: "소드",
      wands: "완드",
    } as const;
    const rankNames = {
      ace: "에이스",
      "2": "2",
      "3": "3",
      "4": "4",
      "5": "5",
      "6": "6",
      "7": "7",
      "8": "8",
      "9": "9",
      "10": "10",
      page: "페이지",
      knight: "나이트",
      queen: "퀸",
      king: "킹",
    } as const;

    for (const cardId of canonicalTarotCardIds) {
      const [suit, rank] = cardId.split("-");

      if (suit && suit in suitNames && rank && rank in rankNames) {
        expect(koCards[cardId].name).toBe(
          `${suitNames[suit as keyof typeof suitNames]} ${rankNames[rank as keyof typeof rankNames]}`,
        );
      }
    }
  });

  it("uses exact conventional English names for every minor card", () => {
    const suitNames = {
      cups: "Cups",
      pentacles: "Pentacles",
      swords: "Swords",
      wands: "Wands",
    } as const;
    const rankNames = {
      ace: "Ace",
      "2": "Two",
      "3": "Three",
      "4": "Four",
      "5": "Five",
      "6": "Six",
      "7": "Seven",
      "8": "Eight",
      "9": "Nine",
      "10": "Ten",
      page: "Page",
      knight: "Knight",
      queen: "Queen",
      king: "King",
    } as const;

    for (const cardId of canonicalTarotCardIds) {
      const [suit, rank] = cardId.split("-");

      if (suit && suit in suitNames && rank && rank in rankNames) {
        expect(enCards[cardId].name).toBe(
          `${rankNames[rank as keyof typeof rankNames]} of ${suitNames[suit as keyof typeof suitNames]}`,
        );
      }
    }
  });

  it("keeps high-risk card meanings nonliteral and non-deterministic", () => {
    expect(koCards.death.meaning).toContain("실제 죽음의 예고가 아니라");
    expect(koCards["the-devil"].meaning).toContain(
      "초자연적 존재의 단정이 아니라",
    );
    expect(koCards["the-tower"].meaning).toContain("재난의 예고가 아니라");
    expect(enCards.death.meaning).toContain(
      "not a prediction of physical death",
    );
    expect(enCards["the-devil"].meaning).toContain(
      "not a literal supernatural claim",
    );
    expect(enCards["the-tower"].meaning).toContain(
      "not a prediction of disaster",
    );
  });
});
