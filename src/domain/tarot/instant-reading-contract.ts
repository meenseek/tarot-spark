export const instantReadingGenerationConfig = {
  max_output_tokens: 1800,
  thinking_level: "low",
} as const;

export const instantReadingSystemInstruction = [
  "당신은 타로를 미래 예측이나 사실 확인이 아니라 자기 성찰을 위한 언어로 읽습니다.",
  "카드 이미지는 첨부되지 않았습니다. 그림·이미지·일러스트·삽화를 보았다고 말하거나 인물, 동물, 사물, 색, 배치, 방향, 상징을 추측하지 마세요.",
  "제공된 비시각적 정방향 핵심 의미, 주제, 말투만 사용하세요. 카드 이름은 제공되지 않습니다. 모델이 알고 있는 카드 이름, 다른 카드 지식, 그림, 상징이나 개인 상황을 추가하지 마세요.",
  "입력 번호는 응답 배열을 맞추기 위한 참조용이며 사용자 화면의 정확한 카드 이름과 순서는 별도로 표시됩니다. 응답 본문에는 카드 이름, 번호, 순서, '카드'라는 단어, 자리 이름이나 역할 이름을 쓰지 마세요.",
  "카드 번호는 입력 순서만 나타내며 과거·현재·미래나 원인·장애물·조언 같은 자리 의미가 없습니다.",
  "모든 카드는 정방향으로만 읽으세요. 역방향, 역위치, 리버스, 정위치가 아닌 해석, 정방향 외의 해석을 만들지 마세요.",
  "제공된 의미를 특정 성별·나이·실제 인물을 가리키는 정보로 바꾸지 마세요.",
  "상대의 숨은 생각이나 감정, 미래 결과를 안다고 말하지 마세요.",
  "의료, 법률, 재정, 투자, 정신 건강에 관한 진단이나 전문 조언을 하지 마세요.",
  "자해, 강압, 스토킹, 감시, 반복 연락을 행동 방법으로 제안하지 마세요.",
  "불안을 키우거나 결정을 재촉하지 말고 작고 되돌릴 수 있는 행동만 제안하세요.",
  "자연스럽고 간결한 한국어로 쓰고 모델, AI, 프롬프트, JSON, 시스템 지침을 언급하지 마세요.",
].join("\n");

export type InstantReadingPromptMaterials = {
  readonly topicLabel: string;
  readonly promptLead: string;
  readonly spreadLabel: string;
  readonly styleLabel: string;
  readonly styleInstruction: string;
  readonly cards: readonly {
    readonly meaning: string;
  }[];
};

export function buildInstantReadingContractPrompt(
  materials: InstantReadingPromptMaterials,
) {
  const cardLines = materials.cards.map(
    ({ meaning }, index) => `${index + 1}. 제공된 정방향 핵심 의미: ${meaning}`,
  );
  const cardLengthGuide = materials.cards.length === 3 ? "70~90자" : "45~65자";

  return [
    `주제: ${materials.topicLabel}`,
    `살펴볼 점: ${materials.promptLead}`,
    `카드 수: ${materials.spreadLabel}`,
    `답변 분위기: ${materials.styleLabel}`,
    `말투 안내: ${materials.styleInstruction}`,
    "사용자가 적은 개인 상황은 없습니다. 개인 상황을 추측해서 채우지 마세요.",
    "입력별 검토된 의미:",
    ...cardLines,
    "",
    "작성 기준:",
    "- 사용자에게 보이는 모든 텍스트를 합쳐 공백 포함 한국어 500~900자로 쓰세요.",
    `- headline 15~30자, synthesis 80~120자, 각 interpretation ${cardLengthGuide}, strongestConnection.explanation 60~90자, uncertainty 45~70자, nextStep 40~60자, reflection 30~50자를 목표로 쓰세요.`,
    "- 모든 카드를 입력 순서대로 한 번씩 해석하고 cardReadings도 같은 순서를 지키세요.",
    "- 카드 해석의 근거는 각 카드 옆에 제공된 정방향 핵심 의미로만 제한하세요.",
    "- 카드명과 순서는 화면이 붙입니다. headline, synthesis, interpretation, explanation, uncertainty, nextStep, reflection에는 카드 이름·번호·순서·'카드'라는 단어·자리/역할 이름을 반복하지 마세요.",
    "- 번호나 순서에 시간, 원인, 장애물, 조언 같은 자리 의미를 붙이지 마세요.",
    "- 그림·이미지·일러스트·삽화를 보았다고 말하거나 그 안의 인물·동물·사물·색·상징을 추가하지 마세요.",
    "- strongestConnection.cardIndexes에는 연결이 가장 뚜렷한 서로 다른 카드 번호 두 개 이상만 넣으세요.",
    "- uncertainty에는 제공된 정보만으로 알 수 없고 직접 확인해야 하는 부분을 쓰세요.",
    "- nextStep에는 작고 되돌릴 수 있는 행동 한 가지만 쓰세요.",
    "- reflection에는 앞선 내용을 되풀이하지 않는 질문 한 개를 쓰세요.",
  ].join("\n");
}

export function buildInstantReadingResponseSchema(cardCount: number) {
  const cardReadings = Array.from({ length: cardCount }, () => ({
    type: "object",
    additionalProperties: false,
    properties: {
      interpretation: {
        type: "string",
        description:
          "같은 순서의 입력 의미만 반영하고 카드 이름·번호·자리·역할 표현을 쓰지 않은 비시각적 정방향 해석",
      },
    },
    required: ["interpretation"],
  }));

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      synthesis: { type: "string" },
      cardReadings: {
        type: "array",
        prefixItems: cardReadings,
        minItems: cardCount,
        maxItems: cardCount,
      },
      strongestConnection: {
        type: "object",
        additionalProperties: false,
        properties: {
          relationType: {
            type: "string",
            enum: ["reinforcement", "tension", "progression", "integration"],
          },
          cardIndexes: {
            type: "array",
            minItems: 2,
            maxItems: cardCount,
            items: {
              type: "integer",
              enum: Array.from({ length: cardCount }, (_, index) => index + 1),
            },
          },
          explanation: { type: "string" },
        },
        required: ["relationType", "cardIndexes", "explanation"],
      },
      uncertainty: { type: "string" },
      nextStep: { type: "string" },
      reflection: { type: "string" },
    },
    required: [
      "headline",
      "synthesis",
      "cardReadings",
      "strongestConnection",
      "uncertainty",
      "nextStep",
      "reflection",
    ],
  } as const;
}

const unsupportedVisualClaimPatterns = [
  /(?:그림|이미지|일러스트|삽화)/u,
  /(?<![가-힣])(?:사자|강아지|고양이|물고기|늑대|동물|독수리|염소|숫양|가재|토끼|달팽이|나비|도롱뇽|황소|뱀)(?:가|는|은|이|의|를|을|와|과|로|에게|처럼)?(?![가-힣])/u,
  /(?<![가-힣])게(?:가|는|의|를|와|처럼)(?![가-힣]).{0,18}(?:기어|보이|그려|등장|상징|뜻|의미|나타(?:내|냅))/u,
  /(?<![가-힣])(?:작은\s*개|개(?:가|는|를)).{0,18}(?:짖|따르|보이|그려|등장|달(?:리|려)|서\s*있)/u,
  /(?<![가-힣])새(?:가|는|를).{0,18}(?:날|울|보이|그려|등장|앉)/u,
  /(?<![가-힣])(?:검은|흰|갈색)?\s*말(?:은|는|이|가|을|를).{0,18}(?:보이|그려|묘사|등장|달(?:리|려)|서\s*있|타고)/u,
  /(?:그림|이미지|일러스트|삽화)\s*(?:에는|에|의|속|에서)/u,
  /카드(?:의)?\s*(?:배경|색)(?:은|는|이|가|의)/u,
  /카드(?:는|가|의\s*배경(?:은|는|이|가))\s*(?:붉은|빨간|주황|갈색|푸른|파란|남색|초록|분홍|검은|하얀|흰|노란|보라|회색|금빛|은빛)/u,
  /(?:카드|그림|이미지|일러스트|삽화)\s*(?:안|속|위|중앙|가운데|한가운데|중심)(?:에는|에는|에|의|에서)?\s*(?:천사|여성|남성|여자|남자|아이|인물|사람|동물|빛|별|태양|달|왕관|왕좌|검|칼|컵|나무|꽃|배|산)(?:은|는|이|가|을|를)?(?![가-힣]).{0,18}(?:있|서\s*있|앉|놓|보이|그려|묘사|담|뜻|의미|상징|암시|나타내)/u,
  /(?:그림|이미지|일러스트|삽화)(?:는|가)\s*(?:천사|여성|남성|여자|남자|아이|인물|사람|동물)(?:은|는|이|가|을|를)?(?![가-힣]).{0,18}(?:묘사|담|보여|그려|나타내)/u,
  /(?:그림|이미지|일러스트|삽화)(?:은|는|이|가)\s*(?:온통\s*)?(?:붉은|빨간|주황|갈색|푸른|파란|남색|초록|분홍|검은|새하얀|하얀|흰|노란|보라|회색|금빛|은빛)(?:색|\s*빛|\s*옷)?/u,
  /(?:그림|이미지|일러스트|삽화)(?:은|는|이|가).{0,30}(?:천사|여왕|왕|노인|여성|남성|여자|남자|아이|인물|사람|동물|바다|산|배|왕좌|왕관|검|칼|컵|나무|꽃|배경)(?:은|는|이|가|을|를)?(?![가-힣]).{0,18}(?:담|묘사|보여|그려|있|서\s*있|앉)/u,
  /카드(?:에는|에)\s*(?:(?:붉은|빨간|주황|갈색|푸른|파란|남색|초록|분홍|검은|새하얀|하얀|흰|노란|보라|회색|금빛|은빛)(?:색|\s*빛|\s*배경)|(?:붉은|빨간|주황|갈색|푸른|파란|남색|초록|분홍|검은|새하얀|하얀|흰|노란|보라|회색|금빛|은빛)\s*옷(?:을\s*입은|의)\s*(?:여성|남성|여자|남자|여인|소년|소녀|아이|인물|사람)|(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)?\s*(?:명의?\s*)?(?:천사|여왕|왕|노인|여성|남성|여자|남자|여인|소년|소녀|아이|인물|사람|동물)|바다|강물|정원|산|배|왕좌|왕관|검|칼|컵|완드|지팡이|소드|펜타클|탑|구름|태양|달|별|강|길|문|나무|꽃|배경)(?:은|는|이|가|을|를|의)?(?![가-힣])\s*(?:있|쓰|보이|보입|담|그려|묘사|서\s*있|앉|떠\s*있|놓|흐르|흐릅|펼쳐|펼쳐집)/u,
  /카드(?:는|가)\s*(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)?\s*(?:명의?\s*)?(?:천사|여왕|왕|노인|여성|남성|여자|남자|아이|인물|사람|동물)(?:은|는|이|가|을|를)?(?![가-힣]).{0,18}(?:담|묘사|보여|그려)/u,
  /카드(?:에|에서)\s*(?:(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*)?(?:명의?\s*)?(?:천사|여왕|왕|노인|여성|남성|여자|남자|여인|소년|소녀|아이|인물|사람|동물)(?:은|는|이|가|을|를)?(?![가-힣]).{0,18}(?:등장|있|보이|그려|묘사|담)/u,
  /카드(?:에|에서)\s*등장하는\s*(?:천사|여왕|왕|노인|여성|남성|여자|남자|여인|소년|소녀|아이|인물|사람|동물)(?:은|는|이|가)?(?![가-힣])/u,
  /카드의\s*(?:중심|중앙|가운데|주요)\s*(?:인물|사람)(?:은|는|이|가)\s*(?:천사|여왕|왕|노인|여성|남성|여자|남자|아이|인물|사람)/u,
  /카드\s*속(?:의|에서)?\s*(?:인물|여성|남성|여자|남자|아이|사람|붉은색|파란색|초록색|검은색|흰색)/u,
  /카드의\s*(?:인물|여성|남성|여자|남자|아이|사람)/u,
  /(?:카드|그림|이미지|일러스트|삽화).{0,24}(?:여성|남성|여자|남자|아이|인물|사람)(?:은|는|이|가|을|를)?(?![가-힣]).{0,24}(?:왕관을\s*쓰|검을\s*들|칼을\s*들|손을\s*맞잡|미소\s*짓|하늘을\s*바라|앉|걷|서\s*있|타고)/u,
  /(?:카드|그림|이미지|일러스트|삽화).{0,24}(?:왕관|왕좌|검|칼|별|태양|달|컵|나무|꽃)(?:\s*(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*개)?(?:은|는|이|가|을|를)?(?![가-힣]).{0,18}(?:있|놓|자라|떠\s*있|피어|들고|앉|보이|그려|등장)/u,
  /(?:(?:완드|컵|소드|펜타클)\s*(?:에이스|[2-9]|10|페이지|나이트|퀸|킹)|바보|마법사|여사제|여황제|황제|교황|연인|전차|힘|은둔자|운명의\s*수레바퀴|정의|매달린\s*사람|죽음|절제|악마|탑|별|달|태양|심판|세계)의\s*(?:해바라기|왕관|왕좌|검|칼|컵|완드|지팡이|펜타클|동전|별|태양|달|탑|수레바퀴|기둥|꽃|나무|산|배|강|강물|정원|길|문|말|사자|개|고양이|새|물고기|동물)(?:은|는|이|가|을|를|의)?(?![가-힣])/u,
  /(?:여성|남성|여자|남자|아이|인물|사람)(?:은|는|이|가).{0,24}(?:왕관을\s*쓰|검을\s*들|칼을\s*들|손을\s*맞잡|미소\s*짓|하늘을\s*바라|왕좌에\s*앉|말을\s*타|걷고\s*있|서\s*있)/u,
  /(?:^|[.!?\n]\s*)(?:(?:검은|흰|갈색)\s*말|세\s*자루의\s*검|왕좌|붉은\s*옷|검|칼|왕관|기둥|천사)(?:은|는|이|가|의)\s*[^.!?\n]{0,20}(?:뜻|의미|상징|암시|나타(?:내|냅)|보여)/u,
  /\b(?:image|picture|illustration)\b/iu,
  /\b(?:lion|dog|cat|fish|wolf|bird|snake|bull|eagle|goat|ram|crab|lobster|rabbit|snail|butterfly|salamander|animal)\b/iu,
  /\b(?:in|on) the (?:card|image|picture)\b/iu,
  /\b(?:the )?(?:card|image|picture|illustration) (?:shows|depicts|portrays)\b/iu,
  /\b(?:depicted|illustrated) (?:animal|dog|lion|person|figure|object|symbol)\b/iu,
  /\b(?:lion|dog|animal|crown|flower|pillar|figure|angel|black horse|white horse)\b.{0,28}\b(?:means|represents|symboli[sz]es|suggests|signifies|shows)\b/iu,
  /\bthe\s+(?:(?:black|white|red|blue|green|gold(?:en)?|silver|dark|pale)\s+)?(?:throne|robe|ship|mountain|sword|cup|wand|pentacle|coin|crown|flower|pillar|figure|angel|horse|sun|moon|star|tower|wheel|river|water|garden|tree|path|gate|bird|lion|dog|cat|fish|wolf|snake|bull|eagle|goat|ram|crab|lobster|rabbit|snail|butterfly|salamander|animal|colou?r)\b.{0,28}\b(?:means|represents|symboli[sz]es|suggests|signifies|shows)\b/iu,
] as const;

export function hasUnsupportedVisualClaim(value: string) {
  return unsupportedVisualClaimPatterns.some((pattern) => pattern.test(value));
}
