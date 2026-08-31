import {
  readingStyleIds,
  spreadIds,
  tarotCardIds,
  topicIds,
  type ReadingStyleId,
  type SpreadId,
  type TarotCardId,
  type TopicId,
} from "./ids";
import {
  getReadingTaxonomy,
  getPublicQuestionDefinition,
  isPublicQuestionId,
  type PublicQuestionId,
  type ReadingTaxonomy,
} from "./taxonomy";

export type InstantReadingCardInput = {
  readonly cardId: TarotCardId;
};

export type InstantReadingRequest = {
  readonly topicId: TopicId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly cards: readonly InstantReadingCardInput[];
  readonly questionId?: PublicQuestionId;
};

export type InstantReading = {
  readonly text: string;
};

export const instantReadingMarkers = [
  "[전체 흐름]",
  "[카드별 흐름]",
  "[가장 강한 연결]",
  "[가능성 A]",
  "[가능성 B]",
  "[현실 확인]",
  "[다음 행동]",
  "[성찰 질문]",
] as const;

export function isInstantReadingTaxonomyEligible(
  taxonomy: ReadingTaxonomy,
): boolean {
  return taxonomy.domainId === "relationship" || taxonomy.domainId === "career";
}

const realityLabels = [
  "아직 모르는 점:",
  "관찰할 점:",
  "다시 볼 조건:",
] as const;
const actionLabels = ["작은 행동:", "멈추거나 다시 볼 조건:"] as const;
const requestKeys = ["topicId", "spreadId", "styleId", "cards"] as const;
const requestKeysWithQuestion = [...requestKeys, "questionId"] as const;
const cardInputKeys = ["cardId"] as const;
const responseKeys = ["text"] as const;
const technicalPattern =
  /```|<\/?[a-z][^>]*>|\bJSON\b|프롬프트|시스템\s*메시지|언어\s*모델|인공지능|\bAI\b/iu;
const explicitReaderSubjectPattern =
  /(?:^|\s)(?:(?:독자|나|저|당신)(?:은|는|이|가)|(?:내|제)가|(?:(?:독자|나|저|당신)의|내|제)\s*(?:마음|감정|호감|관심|사랑)(?:은|는|이|가))(?:\s|$)/u;
const explicitReaderFeelingOwnerPattern =
  /(?:^|\s)(?:(?:독자|나|저|당신)에게(?:는)?\s+[^.!?！？\n]{0,24}(?:마음|감정|호감|관심|사랑)(?:은|는|이|가)|(?:(?:독자|나|저|당신)의|내|제)\s*(?:마음|감정|호감|관심|사랑)(?:은|는|이|가|에는|에))(?:\s|$)/u;
const explicitReaderDesirePattern =
  /(?:^|\s)(?:(?:독자|나|저|당신)(?:은|는|이|가)|(?:내|제)가)[^.!?！？\n]{0,72}(?:고\s*싶은|길\s*바라는|원하는)\s*(?:마음|감정)(?:은|는|이|가|에는|에)?(?:\s|$)/u;
const explicitReaderRomanticReflectionPattern =
  /(?:인지|한지|은지|는지|될지|아닌지)[^.!?！？\n]{0,32}(?:고민|궁금|생각)[^.!?！？\n]{0,16}(?:마음|감정)(?:은|는|이|가|에는|에)?(?:\s|$)/u;
const explicitOtherPersonSubjectPattern =
  /(?:^|\s)(?:상대(?:방)?|그\s*사람)(?:(?:은|는|이|가)|에게(?:는)?|의\s*(?:마음|감정|호감|관심|사랑)(?:은|는|이|가))(?:\s|$)/u;
const explicitOtherPersonAttractionOwnerPattern =
  /(?:(?:상대(?:방)?|그\s*사람|그분)(?:\s*(?:(?:쪽|측)(?:의)?|안의)|의)\s*(?:마음|감정|호감|관심|사랑|끌림|설렘|두근거림)|(?:상대(?:방)?|그\s*사람|그분)(?:은|는|이|가)[^.!?！？\n]{0,64}(?:사랑|호감|연애\s*감정|관심|끌림|설렘|두근거림))/u;
const readerAsAttractionObjectPattern =
  /(?:^|\s)(?:독자|나|저|당신)(?:은|는|이|가)[^.!?！？\n]{0,24}(?:(?:사랑|호감|관심)[^.!?！？\n]{0,8}(?:대상|상대)|연애(?:적)?\s*(?:대상|상대))\s*(?:입니다|이에요|예요|아닙니다|아니에요)(?:\s|$)/u;
const readerAsLikedObjectPattern =
  /(?:상대(?:방)?|그\s*사람)에게(?:는)?[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)[^.!?！？\n]{0,16}마음에\s*(?:안\s*)?(?:들|듭)/u;
const readerAsRomanticClassificationPattern =
  /(?:독자|나|저|당신)(?:은|는|이|가)[^.!?！？\n]{0,24}(?:(?:연인|이성|애인)(?:\s*(?:후보|대상|상대)(?:로|일|이라고|입니다|이에요|예요|(?:이|가)\s*(?:아닐|아닙니다|아니에요))|\s*같은\s*사람(?:일|이라고|입니다|이에요|예요|이\s*(?:아닐|아닙니다|아니에요))|일|이라고|으로|처럼|입니다|이에요|예요|아닙니다|아니에요|이\s*(?:아닐|아닙니다|아니에요))|(?:연애|데이트|교제)(?:적)?\s*상대로|사귈\s*상대로|(?:(?:누군가|상대(?:방)?|그\s*사람|타인|다른\s*사람(?:들)?|이성(?:들)?)의\s*)?이상형|(?:이성(?:들)?|사람(?:들)?|타인|다른\s*사람(?:들)?)\s*(?:에게|한테|께)(?:는)?[^.!?！？\n]{0,16}매력적인?\s*(?:사람|상대|대상)?)/u;
const hiddenFeelingClaimPattern =
  /(?:(?:사랑|호감|애정|연정|관심|끌림|망설임|연애\s*대상|그리움|그리워|후회|좋아|마음|감정)(.{0,24}?)(?:있습니다|없습니다|합니다|느낍니다|원합니다|봅니다|여깁니다|생각합니다|남아\s*있습니다|읽힙니다|입니다|아닙니다|있어요|없어요|해요|느껴요|원해요|봐요|여겨요|생각해요|남아\s*있어요|읽혀요|이에요|예요|아니에요|것입니다|거예요)|끌립니다|끌려요|마음에\s*(?:안\s*)?(?:듭니다|들어요|들지\s*않습니다|들지\s*않아요))/gu;
const romanticAttractionLexemeSource = String.raw`(?:사랑|호감|애정|연정|설렘|설레(?:는|어|었|일|일지도)?|두근거림|이성적(?:인)?\s*(?:관심|호감|끌림|감정|매력)|(?:연애|데이트|교제)(?:적)?\s*(?:대상|상대|감정|관심|끌림|매력)|사귈\s*상대|사귀|교제|연애\s*중|좋아(?:하|해|합|했|할|한|하는)|끌림|끌(?:리|립|려|렸|릴|린)|반(?:하|해|합|했|한|할)|썸\s*(?:상대|관계)?|이상형|(?:연인|이성|애인)(?=\s*(?:후보|같은|대상|상대|일|이라고|으로|처럼|입니다|이에요|예요|아닙니다|아니에요|이\s*아|적\s*대상))|마음이\s*(?:독자|나|저|당신)\s*쪽으로\s*움직)`;
const attractionIntentLexemeSource = String.raw`(?:${romanticAttractionLexemeSource}|마음이\s*(?:가|간|갔)|마음에\s*(?:안\s*)?(?:들|듭))`;
const attractionReferencePattern = new RegExp(
  attractionIntentLexemeSource,
  "gu",
);
const attractionIntentLexemePattern = new RegExp(
  attractionIntentLexemeSource,
  "u",
);
const relationshipStatusPattern =
  /(?:연인|이성|애인|커플|썸\s*관계|데이트\s*중|연애\s*(?:관계|중)|교제|사귀|(?:(?:둘이|두\s*사람이)|(?:상대(?:방)?|그\s*사람)(?:과|와))\s*(?:이미\s*)?(?:만나는|데이트하는|특별한|공식적인)\s*(?:사이|관계))/u;
const externalInnerStatePattern =
  /(?:상대(?:방)?|상대\s*측|그\s*사람|그분|타인)(?:의)?\s*(?:감정|마음|생각|의도|태도)/u;
const calibratedActionClaimPattern = /(?:가능성|수\s*있|일지도|일\s*수도)/u;
const hardFactualizingClaimSource = String.raw`(?:확신|확실시|확정|단정|규정|기정사실로\s*삼|기정사실화|못\s*박|판정|결정|(?:정답|사실)(?:로|으로)?\s*만(?:들|드|듭))`;
const factualizingActionClaimPattern = new RegExp(
  String.raw`(?:${hardFactualizingClaimSource}|전제로\s*삼|전제|가정|상상|받아들(?:이|여|인|였|일)|믿|여기|간주|인정|판단|생각|결론\s*내리)`,
  "u",
);
const contextualFactualizingActionClaimPattern = /(?:판단|생각|결론\s*내리)/u;
const factualizingActionComplementPattern =
  /(?:사실|진실|현실|확실|분명|확정|틀림없|맞(?:다고|는\s*것)|(?:연인|애인|이성|연애|교제|사귀)[^.!?！？\n]{0,12}(?:이?라고|사이라고))/u;
const indirectQuestionActionClaimPattern =
  /(?:인지|아닌지|는지|은지|을지|일지)[^.!?！？\n]{0,16}(?:판단|생각)/u;
const assumptiveRelationshipActionPattern =
  /(?:(?:처럼|인\s*것\s*처럼|인\s*양)[^.!?！？\n]{0,28}?(?:대하|행동하|연락하|말하|다가가|기다리|굴)|(?:연인|애인|이성|커플|썸\s*관계|데이트\s*중|연애\s*(?:관계|중)|교제|사귀)[^.!?！？\n]{0,16}?행세(?:를)?\s*하)/u;
const factualRelationshipStateFramePattern =
  /(?:연인|애인|이성|커플|썸\s*관계|데이트\s*중|연애\s*(?:관계|중)|교제|사귀)[^.!?！？\n]{0,36}(?:사실로\s*(?:놓|두|정)[^.!?！？\n]{0,8}상태|(?:사실|정답|확정)(?:인|이라는|로\s*정한)\s*(?:상태|틀|기준)(?!인지)|맞다는\s*(?:상태|틀|기준)(?!이?\s*사실인지)|(?:이미\s*)?(?:정해진|성립된|굳어진|결정된|확정된)\s*(?:상태|전제))/u;
const possibilityFactualizationActionPattern =
  /가능성(?:을|를)[^.!?！？\n]{0,24}(?:(?:사실|진실|현실|확실|확정)[^.!?！？\n]{0,12}(받아들(?:이|여|인|였|일)|믿|여기|간주|인정|판단|생각|확신)|(확신))/gu;
const interveningActionClaimPattern =
  /(?:확인|관찰|질문|대화|비교|구분|살펴보|살피|지켜보|생각|판단|검토|점검|대하|행동하|연락하|기다리|굴|행세|전하|묻|물어보)/u;
const safeAttractionOrStatusActionPattern =
  /(?:확인|관찰|질문|대화|비교|구분|살펴보|살피|지켜보|묻|물어보|점검|검토|기록|정리|표현|전하|존중|기다리|멈추|중단|거리[^.!?！？\n]{0,8}두|서두르지|압박하지|경계[^.!?！？\n]{0,8}(?:세우|정하)|기준[^.!?！？\n]{0,8}(?:적|정하))/u;
const genericNegativeActionPattern =
  /(?:하|삼|믿|보|두|정하|기대하|추측하)?지(?:는)?\s*(?:말|마|않)/u;
const actionClauseBoundarySource = String.raw`(?:(?:[가-힣]+(?<![다라자냐])고도|[가-힣]+(?<![다라자냐])고(?!\s+싶)|[가-힣]+(?:으면서도|면서도|으면서|면서|는데도|은데도|인데도|는데|은데|인데|으며|며|(?:아|어|해|여)도|더라도|거나|으나|되|지만|기보다)|(?:[가-힣]+(?:아|어|여|겨|해)|[가-힣]*봐)|[가-힣]+(?:한|은|는|인)\s*(?:채|대신)|[가-힣]+\s+(?:후|뒤|다음)|[가-힣]+는\s*반면|반면|대신|하지만|그러나|그리고|한편)(?:\s*[,，]?\s+)|[,，;；]\s*)`;
const selfAttractionActionPattern =
  /(?:자신|나|저|스스로|(?:당신|자기)\s*자신)(?:을|를)\s*(?:(?:사랑|좋아하)하는\s*(?:(?:작은|건강한|구체적인|매일의)\s*)?(?:행동|습관|연습|방식|태도|선택|시간)|(?:사랑하|좋아하)기|(?:사랑해|좋아해)\s*보)/u;
const externalSelfAttractionActorPattern =
  /(?:타인|상대(?:방)?|상대\s*측|그\s*사람|그분|그가|상사|관리자|팀장|리더|동료|팀원|면접관|직장\s*사람들|조직\s*구성원(?:들)?)(?:은|는|이|가|께서|에게|한테|측에서|쪽에서)/u;
const externalActorBeforeSelfAttractionPattern =
  /(?:상대(?:방)?|그\s*사람|그분|상사|관리자|팀장|리더|동료|팀원|면접관|직장\s*사람들|조직\s*구성원(?:들)?)(?:은|는|이|가|께서)[^.!?！？\n]{0,32}$/u;
const claimBoundaryPattern =
  /(?:하지만|그러나|반면|다만|으나|지만|는데|(?:가능성|것)(?:이고|이며|이나|인데)|\s있으며|\s있고|그리고|또한)\s*/gu;
const relationshipPerceptionAnchorPattern =
  /(?:상대(?:방)?|그\s*사람|타인|(?<![가-힣])(?:독자|나|저|당신)(?=(?:은|는|이|가|를|에게(?:는)?|의)?(?:\s|$))|(?<![가-힣])(?:내|제)가(?=\s|$)|인상|이미지|사람|매력|거리감)/gu;
const relationshipPerceptionPredicatePattern =
  /(?:(?<![가-힣])(?:봅니다|봐요)|여깁니다|여겨요|생각합니다|생각해요|판단합니다|판단해요|평가합니다|평가해요|인식합니다|인식해요|느낍니다|느껴요|믿습니다|믿어요|(?:인상|이미지|사람|인물|유형|매력|거리감|파트너)[^.!?！？\n]{0,16}(?:입니다|이에요|예요|아닙니다|아니에요)|(?:친절|성실|꼼꼼|차분|솔직|독립적)(?:합니다|해요)|(?:신중|차갑|따뜻|친절|성실|꼼꼼|차분|솔직|독립적|매력적|부담스럽|편안|유능|무능|믿음직|밝|조심스럽)(?:하|이)?지\s*않(?:습니다|아요)|신중합니다|신중해요|차갑습니다|차가워요|따뜻합니다|따뜻해요|밝습니다|밝아요|조심스럽습니다|조심스러워요|매력적입니다|매력적이에요|부담스럽습니다|부담스러워요|편안합니다|편안해요|거리감이\s*있습니다|거리감이\s*있어요|다가가기\s*쉽습니다|다가가기\s*쉬워요|다가가기\s*어렵습니다|다가가기\s*어려워요)/gu;
const externalSubjectParticleSource = String.raw`(?:은|는|이|가|께서(?:는)?)`;
const relationshipExternalSubjectLexemeSource = String.raw`(?:상대(?:방)?|상대\s*(?:측|쪽)|그\s*사람|그분|그녀|그쪽|그|타인|남들|다른\s*(?:사람(?:들)?|이들)|이성(?:들)?|사람(?:들)?)`;
const workplaceExternalRoleLexemeSource = String.raw`(?:(?:직속\s*)?(?:상사|관리자|책임자)|팀장|리더|동료|팀원|면접관|윗사람|선배|경영진|(?:인사|채용)\s*담당자)(?:님|분)?`;
const workplaceExternalPeopleLexemeSource = String.raw`(?:${workplaceExternalRoleLexemeSource}(?:들)?|직장(?:\s*(?:내|안))?\s*사람들|조직\s*구성원(?:들)?)`;
const workplaceExternalCollectiveLexemeSource = String.raw`(?:회사|조직|팀|부서|업계|사내)(?:\s*(?:측|쪽))?`;
const externalAudienceDativeSource = String.raw`(?:에게|한테|께)`;
const workplaceAudienceLocativeSource = String.raw`(?:(?:직장|회사|조직|팀|부서)(?:(?:에서|에서는)|\s*(?:내|안)에서(?:는)?)|(?:사내|업계)(?:에서|에서는))`;
const relationshipPeopleAudienceLocativeSource = String.raw`${relationshipExternalSubjectLexemeSource}(?:들)?\s*사이에서(?:는)?`;
const workplacePeopleAudienceLocativeSource = String.raw`${workplaceExternalPeopleLexemeSource}\s*사이에서(?:는)?`;
const perspectiveCaseSource = String.raw`(?:(?:에|에서|으로)(?:는)?|에선|으론|론)`;
const workplacePerceptionSubjectPattern = new RegExp(
  String.raw`(?:${workplaceExternalPeopleLexemeSource}|${workplaceExternalCollectiveLexemeSource}|그들|그\s*사람들)`,
  "u",
);
const careerExternalRolePattern = new RegExp(
  String.raw`(?:${workplaceExternalPeopleLexemeSource}|${workplaceExternalCollectiveLexemeSource}|그들|그\s*사람들)`,
  "u",
);
const careerRomanticAttractionPattern = new RegExp(
  romanticAttractionLexemeSource,
  "u",
);
const careerRomanticReaderTargetPattern =
  /(?:독자|나|저|당신)(?:에게|한테|께|을|를|의)(?:는)?(?:\s|$)/u;
const careerWorkObjectPattern =
  /(?:일|업무|직무|직업|역할)(?:(?:을|를|에|에는|에\s*대한|과|와|으로|에서)(?:는)?)?/u;
const careerWorkOutputPattern =
  /(?:디자인|발표|브랜드|제품|서비스|기획|콘텐츠|결과물|산출물|아이디어|제안|프로젝트|작업)/u;
const careerAudienceReceptionPattern =
  /(?:고객|청중|사용자|이용자|소비자|시장|대중)(?:에게|한테|께)(?:는)?[^.!?！？\n]{0,32}(?:호감(?:을|이)?[^.!?！？\n]{0,8}(?:주|줄|준|주는|줍|줘|얻|받)|사랑받)/u;
const readerSubjectBeforeWorkAttachmentPattern =
  /(?:독자|나|저|당신)(?:은|는|이|가)[^.!?！？\n]{0,20}$/u;
const careerReaderSubjectPattern =
  /(?:^|\s)(?:독자|나|저|당신)(?:은|는|이|가)(?=\s|$)/gu;
const workActionAfterAttachmentPattern =
  /^(?:을|를)?\s*(?:담아|쏟(?:아|는|을)?|품고|가지고)\s*(?:일(?:하|할|해)|업무|직무|역할)/u;
const relationshipEmbeddedExternalSubjectPattern = new RegExp(
  String.raw`${relationshipExternalSubjectLexemeSource}(?:들)?${externalSubjectParticleSource}(?:\s|$)`,
  "u",
);
const relationshipExternalAttractionStateSubjectPattern =
  /(?:(?:상대(?:방)?|그\s*사람|그분)(?:\s*(?:(?:쪽|측)(?:의)?|안의)|의)?\s*(?:호감|애정|연정|연애\s*감정|끌림|설렘|두근거림|관심|마음|감정)(?:은|는|이|가)(?:\s|$)|(?:상대(?:방)?|그\s*사람|그분)(?:의)?\s*마음(?:은|는|이|가)?\s*(?:독자|나|저|당신)\s*쪽으로)/u;
const workplaceEmbeddedExternalSubjectPattern = new RegExp(
  String.raw`(?:${workplaceExternalPeopleLexemeSource}${externalSubjectParticleSource}|${workplaceExternalCollectiveLexemeSource}(?:들)?(?:${externalSubjectParticleSource}|에서(?:는)?|에선))(?:\s|$)`,
  "u",
);
const workplacePerceptionClaimPattern =
  /(?:(?:신뢰|평가|기대|우려|걱정|인정)(?:합니다|해요)|(?:신뢰|평가|기대|우려|걱정|잠재력|부담)(?:이|가|은|는|도)?[^.!?！？\n]{0,16}(?:있습니다|없습니다|있어요|없어요|높습니다|낮습니다|높아요|낮아요)|(?:유능|무능|성과|기여|협업|인상|이미지|잠재력|부담|믿을\s*만|좋은\s*(?:직원|동료|후보)|부족한\s*(?:직원|동료|후보))[^.!?！？\n]{0,24}(?:느낍니다|원합니다|봅니다|보입니다|여깁니다|생각합니다|평가합니다|기대합니다|우려합니다|인정합니다|인정하고\s*있습니다|느껴요|원해요|봐요|보여요|여겨요|생각해요|평가해요|기대해요|우려해요|인정해요|것입니다|거예요))/gu;
const workplacePerceptionAnchorPattern =
  /(?:상사|관리자|팀장|리더|동료|팀원|면접관|직장\s*사람들|조직\s*구성원(?:들)?|회사|조직|그들|그\s*사람들|(?<![가-힣])(?:독자|나|저|당신)(?=(?:은|는|이|가|를|에게(?:는)?|의)?(?:\s|$))|(?<![가-힣])(?:내|제)가(?=\s|$)|평가|신뢰|기대|우려|걱정|성과|기여|협업|인상|이미지|잠재력|평판|직원|동료|후보|인재)/gu;
const workplacePerceptionPredicatePattern =
  /(?:느낍니다|느껴요|원합니다|원해요|(?<![가-힣])(?:봅니다|봐요)|보입니다|보여요|여깁니다|여겨요|생각합니다|생각해요|판단합니다|판단해요|평가합니다|평가해요|인식합니다|인식해요|기대합니다|기대해요|우려합니다|우려해요|인정합니다|인정해요|신뢰합니다|신뢰해요|못\s*미더워합니다|못\s*미더워해요|(?:평가|신뢰|기대|우려|걱정|성과|기여|협업|인상|이미지|잠재력|평판|직원|동료|후보|인재|사람|유형)[^.!?！？\n]{0,16}(?:입니다|이에요|예요|아닙니다|아니에요)|(?:친절|성실|꼼꼼|차분|솔직|독립적)(?:합니다|해요)|(?:신중|차갑|따뜻|친절|성실|꼼꼼|차분|솔직|독립적|매력적|부담스럽|편안|유능|무능|믿음직|밝|조심스럽)(?:하|이)?지\s*않(?:습니다|아요)|정해졌습니다|확정됐습니다|낮습니다|낮아요|높습니다|높아요|좋습니다|좋아요|나쁩니다|나빠요|박합니다|밝습니다|밝아요|조심스럽습니다|조심스러워요|빠릅니다|빨라요|느립니다|느려요|인정됩니다|인정받습니다|인정받고\s*있습니다|부족합니다|충분합니다|유능합니다|유능해요|무능합니다|무능해요|믿음직합니다|믿음직해요|못\s*미덥습니다|못\s*미더워요|협업하기\s*쉽습니다|협업하기\s*쉬워요|협업하기\s*어렵습니다|협업하기\s*어려워요|준비됐습니다|준비되었습니다|준비되어\s*있습니다)/gu;
const pastPerceptionPredicatePattern =
  /(?:봤|여겼|생각했|판단했|평가했|인식했|느꼈|믿었|신뢰했|기대했|우려했|인정했|간주했)(?:습니다|어요)/gu;
const progressivePerceptionPredicatePattern =
  /(?:보|여기|생각|판단|평가|인식|느끼|믿|신뢰|기대|우려|인정|간주)고\s*있(?:습니다|어요)/gu;
const possiblePerceptionPattern =
  /(?:가능성|수\s*있|읽힐|읽힙|읽혀|시사|기울|보일|보입|것\s*같|듯(?:하|합|해)|모양(?:이|입|이에|예))/u;
const epistemicPossibilityCalibrationPattern =
  /(?:가능성(?:이|은|도)?(?:\s*(?:(?:있|없|높|낮|작)(?:으)?|크)(?:습니다|어요|지만|으나|고|며|면서|으면서|으며|는데|어도|아도|여도|니|으니|는지)?|\s*(?:큰|작은)\s*편(?:입니다|이에요|예요)?|\s*열려\s*있(?:습니다|어요)?|\s*남아\s*있(?:습니다|어요)?)?|가능성에\s*무게가\s*실(?:립니다|려요))(?:(?:라는|다는)\s*것(?:입니다|이에요|예요))?$/u;
const claimCalibrationPattern =
  /(?:수\s*있(?:습니다|어요|지만|으나|고|으며|는지)?|읽힐|읽힙|읽혀|시사(?:합니다|해요|하는)?|기울(?:어|수)?|보일|보입|것\s*같(?:습니다|아요)?|듯(?:합니다|해요)|모양(?:입니다|이에요|예요))(?:(?:라는|다는)\s*것(?:입니다|이에요|예요))?$/u;
const intrinsicallyCalibratedPredicatePattern =
  /(?:(?<![가-힣])보입니다|(?:해|아|어)\s*보입니다|보여요)$/u;
const uncertainPerceptionPattern =
  /(?:수\s*없|알기?\s*어(?:렵|려)|확인.{0,8}어(?:렵|려)|확실.{0,8}(?:않|못|없)|확정.{0,8}(?:않|못|없)|단정.{0,8}(?:않|못|없)|모르)/u;
const finalUncertainPerceptionPattern =
  /(?:수\s*없(?:습니다|어요)?|알기?\s*어(?:렵|려)[가-힣]*|확인[^.!?！？\n]{0,8}어(?:렵|려)[가-힣]*|확실[^.!?！？\n]{0,8}(?:않|못|없)[가-힣]*|확정[^.!?！？\n]{0,8}(?:않|못|없)[가-힣]*|단정[^.!?！？\n]{0,8}(?:않|못|없)[가-힣]*|모르[가-힣]*)(?:\s*(?:것입니다|거예요)|(?:(?:라는|다는)\s*것(?:입니다|이에요|예요)))?$/u;
const assertiveDescriptionEndingPattern = /[가-힣]+(?:니다|(?<!세)요|죠)$/u;
const readerGroundingActionPattern =
  /^(?:(?:독자|나|저|당신)(?:은|는|이|가)|(?:내|제)가)\s+(?:(?:두|세|각|서로\s*다른|실제|확인된)\s+)*(?:카드(?:의\s*(?:의미|차이|해석))?|의미|해석|차이|현실의\s*(?:신호|행동|말)|신호|행동|말|피드백|기록|관찰|가능성)(?:을|를)[^.!?！？\n]{0,24}(?:확인|비교|살펴보|살피|구분|검토|점검|관찰|기록|정리|대조|참고|되짚|해석)(?:합니다|해요|합니다만|하지만)$/u;
const realityGroundingActionPattern =
  /^(?:실제|현실(?:의)?)\s+(?:인상|평가|판단|기대|감정|마음|행동|말|피드백|신호|근거|사실)(?:은|는|이|가|을|를)[^.!?！？\n]{0,56}(?:확인|비교|살펴보|살펴|살피|구분|검토|점검|관찰|기록|정리|대조|참고|되짚|묻)[^.!?！？\n]{0,16}(?:합니다|해요|해야\s*합니다|해야\s*해요|할\s*수\s*있습니다|할\s*수\s*있어요|(?:해\s*)?보세요)$/u;
const externalFeelingGroundingActionPattern =
  /^(?:상대(?:방)?|그\s*사람|그분)(?:의)?\s*(?:감정|마음)(?:은|는|이|가|을|를)[^.!?！？\n]{0,72}(?:확인|비교|살펴보|살피|구분|검토|점검|관찰|기록|정리|대조|참고|되짚|묻)[^.!?！？\n]{0,16}(?:합니다|해요|해야\s*합니다|해야\s*해요|할\s*수\s*있습니다|할\s*수\s*있어요)$/u;
const externalAttractionGroundingActionPattern =
  /^(?:상대(?:방)?|그\s*사람|그분)(?:의)?\s*(?:호감|연애\s*감정|끌림|설렘|두근거림|관심)(?:은|는|이|가|을|를)[^.!?！？\n]{0,72}(?:확인|비교|살펴보|살피|구분|검토|점검|관찰|기록|정리|대조|참고|되짚|묻)[^.!?！？\n]{0,16}(?:합니다|해요|해야\s*합니다|해야\s*해요|할\s*수\s*있습니다|할\s*수\s*있어요|(?:해\s*)?보세요)$/u;
const selfFeelingGroundingActionPattern =
  /^(?:이|그|이런)\s*(?:마음|감정)(?:은|는|이|가|을|를)[^.!?！？\n]{0,56}(?:확인|살펴봐야|살펴보아야|살펴보|살펴|살피|구분|검토|점검|관찰|기록|정리|되짚|돌아보)[^.!?！？\n]{0,16}(?:합니다|해요|해야\s*합니다|해야\s*해요|할\s*수\s*있습니다|할\s*수\s*있어요)$/u;
const cardSymbolSubjectPattern =
  /^(?:(?:(?:이|첫|두\s*번째|세\s*번째)\s*)?(?:카드(?:\s*의미)?|의미|상징)(?:은|는|이|가)|카드의\s*[가-힣\s]{1,20}?(?:은|는|이|가))\s/u;
const cardExternalPerceptionFactualizerPattern = new RegExp(
  String.raw`(?:${hardFactualizingClaimSource}|분류|증명|보장|옳(?:다고|은\s*것으로)|맞다고)`,
  "u",
);
const cardExternalPerceptionObjectPattern =
  /(?:(?:독자|나|저|당신)(?:을|를)[^.!?！？\n]{0,40}(?:으?로|(?:이)?라고)|(?:상대(?:방)?|그\s*사람|그분|상사|관리자|팀장|리더|동료|팀원|면접관)(?:의)?\s*(?:시선|인상|판단|평가|생각|기대)|(?:상대(?:방)?|그\s*사람|그분|상사|관리자|팀장|리더|동료|팀원|면접관)[^.!?！？\n]{0,40}(?:독자|나|저|당신)(?:을|를|에게|한테|께))/u;
const readerPerceptionObjectPattern = /(?:독자|나|저|당신)(?:을|를)(?:\s|$)/u;
const readerPerceptionDativePattern =
  /(?:(?:독자|나|저|당신)(?:에게|한테|께)|(?:내|제)게)(?:는)?(?:\s|$)/u;
const readerPerceptionAboutPattern =
  /(?:독자|나|저|당신)에\s*(?:(?:대|관)해(?:서)?(?:는)?|대한|관한)(?:\s|$)/u;
const readerPerceptionPossessivePattern =
  /(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s+(?=[가-힣])/u;
const embeddedExternalClaimMarkerPattern = /(?:다는|다고|라는|라고)/u;
const questionFragmentPattern = /(?:무엇|어떤|어떻게|왜|얼마나|어느)/u;
const indirectQuestionPattern =
  /(?:는지|은지|한지|인지)[^.!?！？\n]{0,48}(?:무엇|어떤|어떻게|왜|얼마나|어느)/u;
const relationshipPerspectiveOnReaderPattern = new RegExp(
  String.raw`(?:${relationshipExternalSubjectLexemeSource}(?:들)?(?:(?:의)?\s*눈(?:에(?:는)?|엔)|${externalAudienceDativeSource}(?:는)?|(?:은|는|이|가)\s*보는)[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|${relationshipExternalSubjectLexemeSource}(?:들)?(?:(?:은|는|이|가)|의)?\s*(?:(?:보기|관점|입장|기준)${perspectiveCaseSource}|보기엔|눈엔)[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|${relationshipExternalSubjectLexemeSource}(?:들)?${externalSubjectParticleSource}\s*(?:볼|판단할|생각할|평가할|느낄|여길)\s*때(?:는)?[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가))`,
  "u",
);
const workplacePerspectiveOwnerSource = String.raw`(?:${workplaceExternalPeopleLexemeSource}|${workplaceExternalCollectiveLexemeSource})`;
const workplacePerspectiveOnReaderPattern = new RegExp(
  String.raw`(?:${workplacePerspectiveOwnerSource}(?:(?:의)?\s*눈(?:에(?:는)?|엔)|${externalAudienceDativeSource}(?:는)?|(?:은|는|이|가)\s*보는)[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|${workplacePerspectiveOwnerSource}(?:(?:은|는|이|가)|의)?\s*(?:(?:보기|관점|입장|기준)${perspectiveCaseSource}|보기엔|눈엔)[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|${workplacePerspectiveOwnerSource}${externalSubjectParticleSource}\s*(?:볼|판단할|생각할|평가할|느낄|여길)\s*때(?:는)?[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가))`,
  "u",
);
const relationshipPerspectiveContextPattern = new RegExp(
  String.raw`${relationshipExternalSubjectLexemeSource}(?:들)?(?:(?:의)?\s*눈(?:에(?:는)?|엔)|${externalAudienceDativeSource}(?:는)?|(?:(?:은|는|이|가)|의)?\s*(?:(?:보기|관점|입장|기준)${perspectiveCaseSource}|보기엔|눈엔)|${externalSubjectParticleSource}\s*(?:볼|판단할|생각할|평가할|느낄|여길)\s*때(?:는)?)`,
  "u",
);
const workplacePerspectiveContextPattern = new RegExp(
  String.raw`${workplacePerspectiveOwnerSource}(?:(?:의)?\s*눈(?:에(?:는)?|엔)|${externalAudienceDativeSource}(?:는)?|(?:(?:은|는|이|가)|의)?\s*(?:(?:보기|관점|입장|기준)${perspectiveCaseSource}|보기엔|눈엔)|${externalSubjectParticleSource}\s*(?:볼|판단할|생각할|평가할|느낄|여길)\s*때(?:는)?)`,
  "u",
);
const perspectiveReflectionScopePattern =
  /(?:필요가\s*(?:있|없)|태도가\s*(?:필요|중요))[가-힣\s]*$/u;
const relationshipAudienceBearingReaderAnchorPattern = new RegExp(
  String.raw`(?:(?:독자|나|저|당신)(?:은|는|이|가)\s+${relationshipExternalSubjectLexemeSource}(?:들)?${externalAudienceDativeSource}(?:는)?|${relationshipPeopleAudienceLocativeSource}[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s*(?:(?:이성|연애|데이트|대인|타인)(?:적|에게서의)?\s*)?(?:평판|이미지|인상))`,
  "gu",
);
const workplaceAudienceBearingReaderAnchorPattern = new RegExp(
  String.raw`(?:(?:독자|나|저|당신)(?:은|는|이|가)\s+(?:${workplaceExternalPeopleLexemeSource})${externalAudienceDativeSource}(?:는)?|(?:독자|나|저|당신)(?:은|는|이|가)\s+${workplaceAudienceLocativeSource}(?:\s|$)|${workplacePeopleAudienceLocativeSource}[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|${workplaceAudienceLocativeSource}[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)|(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s*(?:(?:업무|직장|회사|조직|팀)(?:상|에서의)?\s*)?(?:평판|이미지|인상)|${workplaceAudienceLocativeSource}\s*(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s*(?:평판|이미지|인상))`,
  "gu",
);
const relationshipAudienceBearingDescriptionPattern = new RegExp(
  String.raw`(?:(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s*(?:(?:이성|연애|데이트|대인|타인)(?:적|에게서의)?\s*)?(?:평판|이미지|인상)|(?:독자|나|저|당신)(?:은|는|이|가)\s+${relationshipExternalSubjectLexemeSource}(?:들)?${externalAudienceDativeSource}(?:는)?[^.!?！？\n]{0,28}(?:사람|인물|유형|파트너|연인|이성|평판|이미지|인상|매력))`,
  "u",
);
const workplaceAudienceBearingDescriptionPattern = new RegExp(
  String.raw`(?:(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s*(?:(?:업무|직장|회사|조직|팀)(?:상|에서의)?\s*)?(?:평판|이미지|인상)|${workplaceAudienceLocativeSource}\s*(?:(?:독자|나|저|당신)의|(?<![가-힣])(?:내|제))\s*(?:평판|이미지|인상)|${workplaceAudienceLocativeSource}[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)[^.!?！？\n]{0,28}(?:사람|직원|인재|동료|후보|유형|평판|이미지|인상)|(?:독자|나|저|당신)(?:은|는|이|가)\s+(?:(?:${workplaceExternalPeopleLexemeSource})${externalAudienceDativeSource}(?:는)?|${workplaceAudienceLocativeSource})[^.!?！？\n]{0,28}(?:사람|직원|인재|동료|후보|유형|평판|이미지|인상))`,
  "u",
);
const workplaceLocativeReaderDescriptionPattern = new RegExp(
  String.raw`${workplaceAudienceLocativeSource}[^.!?！？\n]{0,24}(?:독자|나|저|당신)(?:은|는|이|가)[^.!?！？\n]{0,28}(?:사람|직원|인재|동료|후보|유형|평판|이미지|인상)`,
  "u",
);
const relationshipExternalPossessiveEvaluationPattern = new RegExp(
  String.raw`${relationshipExternalSubjectLexemeSource}(?:들)?(?:의)\s*(?:평가|판단|생각|인상|시선)(?:은|는|이|가|에서)(?:\s|$)`,
  "u",
);
const workplaceExternalPossessiveEvaluationPattern = new RegExp(
  String.raw`(?:${workplaceExternalPeopleLexemeSource}|${workplaceExternalCollectiveLexemeSource})(?:의)\s*(?:평가|판단|생각|인상|시선)(?:은|는|이|가|에서)(?:\s|$)`,
  "u",
);
const externalPerceptionVerificationActionPattern = new RegExp(
  String.raw`^(?:${relationshipExternalSubjectLexemeSource}(?:들)?|${workplaceExternalPeopleLexemeSource}|${workplaceExternalCollectiveLexemeSource})(?:은|는|이|가|께서(?:는)?|에서(?:는)?)\s+(?:독자|나|저|당신)(?:을|를)\s*(?:어떻게|어떤|무엇으로)[^.!?！？\n]{0,24}(?:는지|은지|인지)[^.!?！？\n]{0,32}(?:묻|물어보|질문|확인)[^.!?！？\n]{0,12}세요$`,
  "u",
);
const unsafePatterns = [
  /(?:반드시|틀림없이|확실히).{0,32}(?:연락|재회|성공|합격|결혼|일어납니다|됩니다)/u,
  /(?:반드시|틀림없이|확실히).{0,32}(?:승진|채용|퇴사|연봉|수익)/u,
  /(?:합격|승진|채용|퇴사|연봉|수익).{0,24}(?:보장|확정|할\s*것입니다|될\s*것입니다|하게\s*됩니다|오를\s*것입니다|이미\s*정해졌)/u,
  /(?:상대|그 사람).{0,24}(?:분명히|확실히).{0,24}(?:사랑|후회|그리워|마음|감정)/u,
  /(?:다시\s*만나|재회|연락|결혼|합격|성공|돌아오).{0,20}(?:게\s*됩니다|하게\s*됩니다|할\s*것입니다|될\s*것입니다|이\s*옵니다|이\s*올\s*것입니다|합니다|옵니다)/u,
  /우울증|불안\s*장애|공황\s*장애|양극성\s*장애|조울증|주의력\s*결핍|\bADHD\b|정신\s*질환|정신병|성격\s*장애|외상\s*후\s*스트레스|\bPTSD\b/iu,
  /(?:약물|항우울제|정신과|심리\s*치료|상담\s*치료|병원|전문의).{0,24}(?:가세요|받으세요|하세요|해야|필요합니다|권합니다)/u,
  /(?:주식|코인|가상화폐|부동산|투자).{0,24}(?:매수|매도|사세요|파세요|투자하세요)/u,
  /(?:주식|종목|코인|가상화폐|부동산|투자).{0,32}(?:사는|파는|매수|매도|투자).{0,20}(?:정답|해야|권합니다|좋습니다)/u,
  /(?:고소|소송|신고|합의|계약|변호사).{0,32}(?:하는\s*것이\s*(?:정답|좋습니다)|하세요|해야|권합니다|진행하세요|시작하세요)/u,
  /(?:진단|처방|복용|약|수술|치료|병원).{0,32}(?:하는\s*것이\s*(?:정답|좋습니다)|받으세요|하세요|해야|권합니다|필요합니다)/u,
  /(?:진단|처방|복용|변호사|고소|소송).{0,24}(?:받으세요|하세요|해야|권합니다|진행하세요)/u,
  /(?:당장|즉시|오늘 바로|지금 바로).{0,24}(?:연락|퇴사|투자|찾아가|헤어지|결혼)/u,
  /자해|자살|죽는 방법|몰래\s*(?:확인|감시)|미행|강제로/u,
  /역방향|역위치|리버스|뒤집힌\s*카드/u,
  /카드\s*(?:그림|이미지)|그림에서|이미지에서|보이는\s*인물/u,
  /(?:과거|현재|미래|원인|장애물|조언)\s*(?:의\s*)?(?:자리|위치)/u,
] as const;

export function parseInstantReadingRequest(
  value: unknown,
): InstantReadingRequest | undefined {
  if (
    !isRecord(value) ||
    (!hasExactKeys(value, requestKeys) &&
      !hasExactKeys(value, requestKeysWithQuestion))
  ) {
    return undefined;
  }

  if (
    !isAllowedId(value["topicId"], topicIds) ||
    !isAllowedId(value["spreadId"], spreadIds) ||
    !isAllowedId(value["styleId"], readingStyleIds) ||
    !Array.isArray(value["cards"])
  ) {
    return undefined;
  }

  const questionId =
    "questionId" in value &&
    typeof value["questionId"] === "string" &&
    isPublicQuestionId(value["questionId"])
      ? value["questionId"]
      : undefined;

  if (
    ("questionId" in value && !questionId) ||
    (questionId &&
      getPublicQuestionDefinition(questionId).topicId !== value["topicId"])
  ) {
    return undefined;
  }

  let taxonomy: ReadingTaxonomy;
  try {
    taxonomy = getReadingTaxonomy(value["topicId"], questionId);
  } catch {
    return undefined;
  }
  if (!isInstantReadingTaxonomyEligible(taxonomy)) return undefined;

  const expectedCount = value["spreadId"] === "quick" ? 3 : 6;
  if (value["cards"].length !== expectedCount) return undefined;

  const cards: InstantReadingCardInput[] = [];
  for (const input of value["cards"]) {
    if (
      !isRecord(input) ||
      !hasExactKeys(input, cardInputKeys) ||
      !isAllowedId(input["cardId"], tarotCardIds)
    ) {
      return undefined;
    }
    cards.push({ cardId: input["cardId"] });
  }

  if (new Set(cards.map(({ cardId }) => cardId)).size !== cards.length) {
    return undefined;
  }

  return {
    cards,
    spreadId: value["spreadId"],
    styleId: value["styleId"],
    topicId: value["topicId"],
    ...(questionId ? { questionId } : {}),
  };
}

export function parseInstantReadingResponse(
  value: unknown,
  request: InstantReadingRequest,
): InstantReading | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, responseKeys) ||
    typeof value["text"] !== "string"
  ) {
    return undefined;
  }

  return validateInstantReadingText(value["text"], request);
}

export function validateInstantReadingText(
  input: string,
  request: InstantReadingRequest,
): InstantReading | undefined {
  const text = input.replace(/\r\n?/gu, "\n").trim();
  const totalLength = [...text].length;
  const range =
    request.spreadId === "quick"
      ? { max: 2_000, min: 420 }
      : { max: 3_000, min: 650 };

  if (
    totalLength < range.min ||
    totalLength > range.max ||
    technicalPattern.test(text) ||
    unsafePatterns.some((pattern) => pattern.test(text)) ||
    !hasKoreanMajority(text)
  ) {
    return undefined;
  }

  const markerMatches = text.match(/\[[^\]\n]{1,40}\]/gu) ?? [];
  if (
    markerMatches.length !== instantReadingMarkers.length ||
    !instantReadingMarkers.every(
      (marker, index) => markerMatches[index] === marker,
    )
  ) {
    return undefined;
  }

  const sections = splitSections(text);
  if (!sections) return undefined;

  const overall = sections.get("[전체 흐름]");
  const cards = sections.get("[카드별 흐름]");
  const connection = sections.get("[가장 강한 연결]");
  const firstHypothesis = sections.get("[가능성 A]");
  const secondHypothesis = sections.get("[가능성 B]");
  const reality = sections.get("[현실 확인]");
  const action = sections.get("[다음 행동]");
  const reflection = sections.get("[성찰 질문]");

  const interpretationSections = [overall, firstHypothesis, secondHypothesis];
  const supportingSections = [cards, connection, reality, action, reflection];
  let taxonomy;
  try {
    taxonomy = getReadingTaxonomy(request.topicId, request.questionId);
  } catch {
    return undefined;
  }
  const isRelationshipReading = taxonomy.domainId === "relationship";
  const isCareerReading = taxonomy.domainId === "career";
  const requiresExternalPerception =
    taxonomy.defaultAnswerTargetId === "external-perception";
  const isCareerExternalPerception =
    taxonomy.domainId === "career" && requiresExternalPerception;
  const allowsOtherPersonAttraction =
    isRelationshipReading &&
    request.topicId === "feelings" &&
    (!request.questionId || request.questionId === "interest-or-kindness");
  const rejectsReaderRomanticClassification =
    isRelationshipReading &&
    !allowsOtherPersonAttraction &&
    request.questionId !== "romantic-partner-impression";
  if (
    (taxonomy.domainId === "career" &&
      [...interpretationSections, ...supportingSections].some(
        (section) =>
          section && hasCareerExternalRomanticAttractionClaim(section),
      )) ||
    (isCareerReading &&
      [...interpretationSections, ...supportingSections].some(
        (section) =>
          section && hasFactualExplicitWorkplaceExternalClaim(section),
      )) ||
    (isRelationshipReading &&
      [...interpretationSections, ...supportingSections].some(
        (section) =>
          section && hasFactualExplicitRelationshipExternalClaim(section),
      )) ||
    (isRelationshipReading &&
      interpretationSections.some(
        (section) =>
          !section ||
          (requiresExternalPerception &&
            !possiblePerceptionPattern.test(section)) ||
          hasUnsafeHiddenFeelingClaim(section, true) ||
          hasUncalibratedExternalStateDeclarativeClaim(
            section,
            relationshipExternalAttractionStateSubjectPattern,
          ) ||
          (!allowsOtherPersonAttraction &&
            hasUnaskedOtherPersonAttractionClaim(
              section,
              rejectsReaderRomanticClassification,
              request.questionId,
            )) ||
          (requiresExternalPerception &&
            hasFactualRelationshipPerceptionClaim(section)),
      )) ||
    (isCareerExternalPerception &&
      interpretationSections.some(
        (section) =>
          !section ||
          !possiblePerceptionPattern.test(section) ||
          hasUnsafeWorkplacePerceptionClaim(section, true) ||
          hasFactualWorkplaceJudgmentClaim(section),
      )) ||
    supportingSections.some(
      (section) =>
        section &&
        ((isRelationshipReading &&
          (hasUnsafeHiddenFeelingClaim(section, true) ||
            (section !== action &&
              hasUncalibratedExternalStateDeclarativeClaim(
                section,
                relationshipExternalAttractionStateSubjectPattern,
              )) ||
            (!allowsOtherPersonAttraction &&
              hasUnaskedOtherPersonAttractionClaim(
                section,
                rejectsReaderRomanticClassification,
                request.questionId,
              )) ||
            (section !== action &&
              requiresExternalPerception &&
              hasFactualRelationshipPerceptionClaim(section)))) ||
          (isCareerExternalPerception &&
            section !== action &&
            (hasUnsafeWorkplacePerceptionClaim(section, true) ||
              hasFactualWorkplaceJudgmentClaim(section)))),
    )
  ) {
    return undefined;
  }

  if (
    !hasBoundedLength(overall, 40, 420) ||
    !hasBoundedLength(connection, 30, 360) ||
    !hasBoundedLength(firstHypothesis, 25, 320) ||
    !hasBoundedLength(secondHypothesis, 25, 320) ||
    normalizeComparison(firstHypothesis) ===
      normalizeComparison(secondHypothesis) ||
    !hasBoundedLength(reflection, 15, 240) ||
    !/[?？]$/u.test(reflection)
  ) {
    return undefined;
  }

  if (!cards || !hasValidCardLines(cards, request.cards.length)) {
    return undefined;
  }

  if (
    !reality ||
    !hasExactLabelledLines(reality, realityLabels, 15, 280) ||
    !action ||
    !hasValidActionLines(action, request.questionId)
  ) {
    return undefined;
  }

  return { text };
}

function hasUnsafeHiddenFeelingClaim(
  value: string,
  allowExplicitUncertainty: boolean,
) {
  const sentences = value.split(/[.!?！？\n]+/u);

  return sentences.some((sentence) => {
    for (const match of sentence.matchAll(hiddenFeelingClaimPattern)) {
      const claimEnd = (match.index ?? 0) + match[0].length;
      const claimScope = getFinalClaimScope(sentence, claimEnd);
      const calibratedClaim = getFinalClaimScope(match[0], match[0].length);
      if (isGroundingClaimScope(claimScope)) continue;
      if (isExplicitReaderFeelingClaim(claimScope)) continue;

      if (
        !possiblePerceptionPattern.test(calibratedClaim) &&
        !(
          allowExplicitUncertainty &&
          finalUncertainPerceptionPattern.test(calibratedClaim)
        )
      ) {
        return true;
      }
    }

    return false;
  });
}

function hasUnaskedOtherPersonAttractionClaim(
  value: string,
  rejectReaderRomanticClassification: boolean,
  questionId?: string,
) {
  const sentences = value.split(/[.!?！？\n]+/u);

  return sentences.some((sentence) => {
    if (rejectReaderRomanticClassification) {
      for (const classification of sentence.matchAll(
        new RegExp(readerAsRomanticClassificationPattern.source, "gu"),
      )) {
        const classificationStart = classification.index ?? 0;
        const classificationScope = getSurroundingClaimScope(
          sentence,
          classificationStart,
          classificationStart + classification[0].length,
        );
        if (
          !explicitReaderDesirePattern.test(classificationScope) &&
          !explicitReaderRomanticReflectionPattern.test(classificationScope)
        ) {
          return true;
        }
      }
    }
    for (const match of sentence.matchAll(attractionReferencePattern)) {
      const matchStart = match.index ?? 0;
      const claimScope = getSurroundingClaimScope(
        sentence,
        matchStart,
        matchStart + match[0].length,
      );
      if (explicitReaderRomanticReflectionPattern.test(claimScope)) {
        continue;
      }
      if (
        isQuestionOwnedImplicitReaderAttractionClaim(claimScope, questionId)
      ) {
        continue;
      }
      if (
        !isExplicitReaderFeelingClaim(
          claimScope,
          rejectReaderRomanticClassification,
        )
      ) {
        return true;
      }
    }

    return false;
  });
}

function isQuestionOwnedImplicitReaderAttractionClaim(
  claimScope: string,
  questionId?: string,
) {
  if (
    relationshipEmbeddedExternalSubjectPattern.test(claimScope) ||
    readerAsAttractionObjectPattern.test(claimScope) ||
    readerAsLikedObjectPattern.test(claimScope) ||
    readerAsRomanticClassificationPattern.test(claimScope)
  ) {
    return false;
  }
  let ownedAttraction: RegExpExecArray | null = null;
  if (questionId === "drawn-to-ambiguity") {
    if (explicitOtherPersonSubjectPattern.test(claimScope)) return false;
    ownedAttraction =
      /애매(?:한|함)[^.!?！？\n]{0,48}끌/u.exec(claimScope) ??
      /끌[^.!?！？\n]{0,48}애매/u.exec(claimScope);
  } else if (questionId === "ignored-signals") {
    ownedAttraction = /사랑받고\s*싶/u.exec(claimScope);
  }
  if (!ownedAttraction) return false;
  const prefix = claimScope.slice(0, ownedAttraction.index ?? 0);
  if (/(?:상대(?:방)?|그\s*사람|그분)\s*(?:측|쪽)에서/u.test(prefix)) {
    return false;
  }
  const externalDative =
    /(?:상대(?:방)?|그\s*사람|그분)(?:에게|한테|께)(?:는)?/gu;
  const dativeMatches = [...prefix.matchAll(externalDative)];
  const lastDative = dativeMatches.at(-1);
  if (
    lastDative &&
    prefix.slice((lastDative.index ?? 0) + lastDative[0].length).trim().length >
      0
  ) {
    return false;
  }
  const suffix = claimScope.slice(
    (ownedAttraction.index ?? 0) + ownedAttraction[0].length,
  );
  return !/(?:상대(?:방)?|그\s*사람|그분)(?:\s*(?:측|쪽))?(?:은|는|이|가|에게|한테|께|에서|에게서)/u.test(
    suffix,
  );
}

function hasCareerExternalRomanticAttractionClaim(value: string) {
  return value.split(/[.!?！？\n]+/u).some((claimScope) => {
    if (!careerExternalRolePattern.test(claimScope)) return false;
    for (const match of claimScope.matchAll(
      new RegExp(careerRomanticAttractionPattern.source, "gu"),
    )) {
      const matchStart = match.index ?? 0;
      const matchEnd = matchStart + match[0].length;
      if (isCareerWorkAttachmentReference(claimScope, matchStart, matchEnd)) {
        continue;
      }
      const localClaim = claimScope.slice(
        Math.max(0, matchStart - 48),
        Math.min(claimScope.length, matchEnd + 48),
      );
      if (
        careerRomanticReaderTargetPattern.test(localClaim) ||
        careerExternalRolePattern.test(claimScope.slice(0, matchEnd))
      ) {
        return true;
      }
    }
    return false;
  });
}

function isCareerWorkAttachmentReference(
  claimScope: string,
  matchStart: number,
  matchEnd: number,
) {
  const prefix = claimScope.slice(Math.max(0, matchStart - 28), matchStart);
  const suffix = claimScope.slice(
    matchEnd,
    Math.min(claimScope.length, matchEnd + 28),
  );
  const clauseStart = getLastClaimBoundaryEnd(claimScope.slice(0, matchStart));
  const prefixWithinClause = claimScope.slice(clauseStart, matchStart);
  const readerSubject = getLastPatternMatch(
    prefixWithinClause,
    careerReaderSubjectPattern,
  );
  const currentClause = getSurroundingClaimScope(
    claimScope,
    matchStart,
    matchEnd,
  );
  const readerOwnedWorkAttachment =
    readerSubject?.index !== undefined &&
    careerWorkObjectPattern.test(
      currentClause.slice((readerSubject.index ?? 0) + readerSubject[0].length),
    );
  const workOutputAudienceReception =
    careerWorkOutputPattern.test(currentClause) &&
    careerAudienceReceptionPattern.test(currentClause);
  return (
    new RegExp(
      `${careerWorkObjectPattern.source}[^.!?！？\\n]{0,10}$`,
      "u",
    ).test(prefix) ||
    new RegExp(
      String.raw`^(?:하|하는|할|해|을|를|에|에는|에\s*대한|과|와|으로|에서|에서의|\s){0,12}${careerWorkObjectPattern.source}`,
      "u",
    ).test(suffix) ||
    (readerSubjectBeforeWorkAttachmentPattern.test(prefix) &&
      workActionAfterAttachmentPattern.test(suffix)) ||
    readerOwnedWorkAttachment ||
    workOutputAudienceReception
  );
}

function isExplicitReaderFeelingClaim(
  claimScope: string,
  rejectReaderRomanticClassification = false,
) {
  if (explicitOtherPersonAttractionOwnerPattern.test(claimScope)) return false;
  if (isExplicitSelfAttractionClaim(claimScope)) return true;
  if (explicitReaderDesirePattern.test(claimScope)) return true;
  const readerMatches = [
    explicitReaderSubjectPattern.exec(claimScope),
    explicitReaderFeelingOwnerPattern.exec(claimScope),
  ].filter((match): match is RegExpExecArray => Boolean(match));
  const readerIndex = Math.min(
    ...readerMatches.map((match) => match.index),
    Number.POSITIVE_INFINITY,
  );
  const otherPersonMatch = explicitOtherPersonSubjectPattern.exec(claimScope);
  const hasEarlierOtherPersonSubject =
    otherPersonMatch !== null && otherPersonMatch.index <= readerIndex;

  return (
    Number.isFinite(readerIndex) &&
    !hasEarlierOtherPersonSubject &&
    !readerAsAttractionObjectPattern.test(claimScope) &&
    !readerAsLikedObjectPattern.test(claimScope) &&
    (!rejectReaderRomanticClassification ||
      !readerAsRomanticClassificationPattern.test(claimScope))
  );
}

function hasUnsafeWorkplacePerceptionClaim(
  value: string,
  allowExplicitUncertainty: boolean,
) {
  return hasUnsafeHiddenClaim(
    value,
    workplacePerceptionSubjectPattern,
    workplacePerceptionClaimPattern,
    allowExplicitUncertainty,
  );
}

function hasFactualRelationshipPerceptionClaim(value: string) {
  return (
    hasUnsafeFactualPerceptionClaim(
      value,
      relationshipPerceptionAnchorPattern,
      relationshipPerceptionPredicatePattern,
    ) ||
    hasUnsafeFactualPerceptionClaim(
      value,
      relationshipPerceptionAnchorPattern,
      pastPerceptionPredicatePattern,
    ) ||
    hasUnsafeFactualPerceptionClaim(
      value,
      relationshipPerceptionAnchorPattern,
      progressivePerceptionPredicatePattern,
    ) ||
    hasUnsafeAnchoredDescriptionClaim(
      value,
      relationshipPerspectiveOnReaderPattern,
    ) ||
    hasUnsafeEmbeddedExternalClaim(
      value,
      relationshipEmbeddedExternalSubjectPattern,
    ) ||
    hasUncalibratedExternalDeclarativeClaim(
      value,
      relationshipEmbeddedExternalSubjectPattern,
    ) ||
    hasUncalibratedExternalStateDeclarativeClaim(
      value,
      relationshipExternalAttractionStateSubjectPattern,
    ) ||
    hasUncalibratedReaderTargetDescriptionClaim(value) ||
    hasUncalibratedReaderDescriptionClaim(value)
  );
}

function hasFactualExplicitRelationshipExternalClaim(value: string) {
  return getSentencesPreservingEndings(value).some((sentence) => {
    const claimScopes = explicitReaderDesirePattern.test(sentence)
      ? getClaimScopes(stripSentenceEnding(sentence)).filter(
          (scope) => !explicitReaderDesirePattern.test(scope),
        )
      : [sentence];
    return claimScopes.some(
      (claimScope) =>
        hasUnsafeFactualPerceptionClaim(
          claimScope,
          relationshipAudienceBearingReaderAnchorPattern,
          relationshipPerceptionPredicatePattern,
        ) ||
        (!relationshipEmbeddedExternalSubjectPattern.test(claimScope) &&
          hasUnsafeAnchoredDescriptionClaim(
            claimScope,
            relationshipAudienceBearingDescriptionPattern,
          )) ||
        hasUnsafeAnchoredDescriptionClaim(
          claimScope,
          relationshipPerspectiveOnReaderPattern,
        ) ||
        hasUnsafePerspectiveContextClaim(
          claimScope,
          relationshipPerspectiveContextPattern,
        ) ||
        hasUnsafeAnchoredDescriptionClaim(
          claimScope,
          relationshipExternalPossessiveEvaluationPattern,
        ) ||
        hasUnsafeEmbeddedExternalClaim(
          claimScope,
          relationshipEmbeddedExternalSubjectPattern,
        ) ||
        hasUncalibratedExternalDeclarativeClaim(
          claimScope,
          relationshipEmbeddedExternalSubjectPattern,
        ),
    );
  });
}

function hasFactualWorkplaceJudgmentClaim(value: string) {
  return (
    hasUnsafeFactualPerceptionClaim(
      value,
      workplacePerceptionAnchorPattern,
      workplacePerceptionPredicatePattern,
    ) ||
    hasUnsafeFactualPerceptionClaim(
      value,
      workplacePerceptionAnchorPattern,
      pastPerceptionPredicatePattern,
    ) ||
    hasUnsafeFactualPerceptionClaim(
      value,
      workplacePerceptionAnchorPattern,
      progressivePerceptionPredicatePattern,
    ) ||
    hasUnsafeAnchoredDescriptionClaim(
      value,
      workplacePerspectiveOnReaderPattern,
    ) ||
    hasUnsafeEmbeddedExternalClaim(
      value,
      workplaceEmbeddedExternalSubjectPattern,
    ) ||
    hasUncalibratedExternalDeclarativeClaim(
      value,
      workplaceEmbeddedExternalSubjectPattern,
    ) ||
    hasUncalibratedReaderTargetDescriptionClaim(value) ||
    hasUncalibratedReaderDescriptionClaim(value)
  );
}

function hasFactualExplicitWorkplaceExternalClaim(value: string) {
  return getSentencesPreservingEndings(value).some(
    (sentence) =>
      hasUnsafeWorkplacePerceptionClaim(sentence, true) ||
      hasUnsafeFactualPerceptionClaim(
        sentence,
        workplaceAudienceBearingReaderAnchorPattern,
        workplacePerceptionPredicatePattern,
      ) ||
      hasUnsafeAnchoredDescriptionClaim(
        sentence,
        workplaceLocativeReaderDescriptionPattern,
      ) ||
      (!workplaceEmbeddedExternalSubjectPattern.test(sentence) &&
        hasUnsafeAnchoredDescriptionClaim(
          sentence,
          workplaceAudienceBearingDescriptionPattern,
        )) ||
      hasUnsafeAnchoredDescriptionClaim(
        sentence,
        workplacePerspectiveOnReaderPattern,
      ) ||
      hasUnsafePerspectiveContextClaim(
        sentence,
        workplacePerspectiveContextPattern,
      ) ||
      hasUnsafeAnchoredDescriptionClaim(
        sentence,
        workplaceExternalPossessiveEvaluationPattern,
      ) ||
      hasUnsafeEmbeddedExternalClaim(
        sentence,
        workplaceEmbeddedExternalSubjectPattern,
      ) ||
      hasUncalibratedExternalDeclarativeClaim(
        sentence,
        workplaceEmbeddedExternalSubjectPattern,
      ),
  );
}

function hasUncalibratedExternalDeclarativeClaim(
  value: string,
  externalSubjectPattern: RegExp,
) {
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    if (!isQuestion && !/[가-힣]+(?:니다|요|죠)$/u.test(sentence)) {
      return false;
    }
    const claimScopes = getExternalDeclarativeClaimScopes(
      sentence,
      externalSubjectPattern,
    );
    const externalSubjectScopeIndex = claimScopes.findIndex((scope) =>
      externalSubjectPattern.test(scope),
    );
    const readerTargetScopeIndex = claimScopes.findIndex((scope) =>
      hasReaderPerceptionTarget(scope),
    );
    if (externalSubjectScopeIndex < 0 || readerTargetScopeIndex < 0) {
      return false;
    }
    const anchoredScopeIndex = Math.max(
      externalSubjectScopeIndex,
      readerTargetScopeIndex,
    );
    const scopesToCheck = isQuestion
      ? claimScopes.slice(anchoredScopeIndex, -1)
      : claimScopes.slice(anchoredScopeIndex);
    return scopesToCheck.some((scope) => {
      if (isGroundingClaimScope(scope)) return false;
      if (
        externalSubjectPattern.test(scope) &&
        hasReaderPerceptionTarget(scope)
      ) {
        return !isCalibratedAfterClaimAnchors(scope, [
          externalSubjectPattern,
          readerPerceptionObjectPattern,
          readerPerceptionDativePattern,
          readerPerceptionAboutPattern,
          readerPerceptionPossessivePattern,
        ]);
      }
      return !isCalibratedClaimScope(scope);
    });
  });
}

function getExternalDeclarativeClaimScopes(
  value: string,
  externalSubjectPattern: RegExp,
) {
  const scopes: string[] = [];
  let scopeStart = 0;
  for (const boundary of value.matchAll(
    /(하지만|그러나|반면|다만|그리고|또한)(?:\s*[,，]?\s*)|([가-힣]+?)(으면서도|면서도|으면서|면서|는데도|은데도|인데도|으니까|니까|으니|는데|은데|인데|으며|해도|어도|아도|여도|더라도|거나|으나|지만|(?<![다라자냐])고도|(?<![다라])고|며|니|되)(?=\s*[,，]?\s+)|([가-힣]+(?:한|은|는|인)\s*(?:채|대신))(?:\s*[,，]?\s+)|([가-힣]+(?:니다|요|죠))\s*(?:[,，;；:：]|[—–-])\s*/gu,
  )) {
    const boundaryIndex = boundary.index ?? 0;
    const stem = boundary[2];
    const completedPhrase = boundary[4];
    const punctuatedEnding = boundary[5];
    if (
      boundary[3] === "고" &&
      /^\s*있(?:을|는|었|어|습니다|어요)/u.test(
        value.slice(boundaryIndex + boundary[0].length),
      )
    ) {
      continue;
    }
    const candidateEnd = stem
      ? boundaryIndex + stem.length
      : completedPhrase
        ? boundaryIndex + completedPhrase.length
        : punctuatedEnding
          ? boundaryIndex + punctuatedEnding.length
          : boundaryIndex;
    const candidate = value.slice(scopeStart, candidateEnd).trim();
    const judgmentPredicateStem =
      /(?:보|봐|봤|여기|여겨|여겼|생각하|생각했|판단하|판단했|평가하|평가했|인식하|인식했|느끼|느껴|느꼈|믿|믿었|신뢰하|신뢰했|기대하|기대했|우려하|우려했|인정하|인정했|간주하|간주했|취급하|취급했|분류하|분류했|규정하|규정했|평하|평했|대하|대했|대접하|치|넣|놓|알|알았|말하|말했)$/u;
    const isCalibratedAttributiveContinuation =
      Boolean(stem) &&
      /^(?:고|며)$/u.test(boundary[3] ?? "") &&
      !judgmentPredicateStem.test(stem!) &&
      /^(?:[^.!?！？\n]{0,64}(?:으?로|(?:이)?라고|다고)\s*[가-힣\s]{1,32}|[^.!?！？\n]{0,64}(?:보일|느껴질|읽힐)\s*)(?:가능성|수\s*있)/u.test(
        value.slice(boundaryIndex + boundary[0].length).trim(),
      );
    const hasCompletedExternalClaim =
      !stem ||
      (!isCalibratedAttributiveContinuation &&
        externalSubjectPattern.test(candidate) &&
        hasReaderPerceptionTarget(candidate)) ||
      /(?:으?로|(?:이)?라고|다고|다는)\s*[가-힣\s]{1,48}$/u.test(candidate) ||
      judgmentPredicateStem.test(stem);
    if (!hasCompletedExternalClaim) continue;
    scopes.push(
      value.slice(scopeStart, boundaryIndex + boundary[0].length).trim(),
    );
    scopeStart = boundaryIndex + boundary[0].length;
  }
  scopes.push(value.slice(scopeStart).trim());
  return scopes.filter(Boolean);
}

function hasReaderPerceptionTarget(value: string) {
  return (
    readerPerceptionObjectPattern.test(value) ||
    readerPerceptionDativePattern.test(value) ||
    readerPerceptionAboutPattern.test(value) ||
    readerPerceptionPossessivePattern.test(value)
  );
}

function hasUncalibratedExternalStateDeclarativeClaim(
  value: string,
  externalStateSubjectPattern: RegExp,
) {
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    if (!isQuestion && !/[가-힣]+(?:니다|요|죠)$/u.test(sentence)) {
      return false;
    }
    const claimScopes = getExternalDeclarativeClaimScopes(
      sentence,
      externalStateSubjectPattern,
    );
    const subjectScopeIndex = claimScopes.findIndex((scope) =>
      externalStateSubjectPattern.test(scope),
    );
    if (subjectScopeIndex < 0) return false;
    const scopesToCheck = isQuestion
      ? claimScopes.slice(subjectScopeIndex, -1)
      : claimScopes.slice(subjectScopeIndex);
    return scopesToCheck.some(
      (scope) =>
        !isGroundingClaimScope(scope) &&
        !(externalStateSubjectPattern.test(scope)
          ? isCalibratedAfterClaimAnchors(scope, [externalStateSubjectPattern])
          : isCalibratedClaimScope(scope)),
    );
  });
}

function hasUncalibratedReaderTargetDescriptionClaim(value: string) {
  const noExternalSubjectPattern = /(?!)/u;
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    if (
      cardSymbolSubjectPattern.test(sentence) &&
      !hasCardFactualizedExternalPerceptionClaim(sentence)
    ) {
      return false;
    }
    if (!isQuestion && !assertiveDescriptionEndingPattern.test(sentence)) {
      return false;
    }
    const claimScopes = getExternalDeclarativeClaimScopes(
      sentence,
      noExternalSubjectPattern,
    );
    const readerTargetScopeIndex = claimScopes.findIndex((scope) =>
      hasReaderPerceptionTarget(scope),
    );
    if (readerTargetScopeIndex < 0) return false;
    const scopesToCheck = isQuestion
      ? claimScopes.slice(readerTargetScopeIndex, -1)
      : claimScopes.slice(readerTargetScopeIndex);
    return scopesToCheck.some(
      (scope) =>
        !isGroundingClaimScope(scope) &&
        !(hasReaderPerceptionTarget(scope)
          ? isCalibratedAfterClaimAnchors(scope, [
              readerPerceptionObjectPattern,
              readerPerceptionDativePattern,
              readerPerceptionAboutPattern,
              readerPerceptionPossessivePattern,
            ])
          : isCalibratedClaimScope(scope)),
    );
  });
}

function hasCardFactualizedExternalPerceptionClaim(sentence: string) {
  for (const match of sentence.matchAll(
    new RegExp(cardExternalPerceptionFactualizerPattern.source, "gu"),
  )) {
    const predicateEnd = (match.index ?? 0) + match[0].length;
    if (hasAttachedFactualActionNegation(sentence, match, predicateEnd)) {
      continue;
    }
    const localClaim = sentence.slice(
      Math.max(0, (match.index ?? 0) - 80),
      Math.min(sentence.length, predicateEnd + 48),
    );
    if (cardExternalPerceptionObjectPattern.test(localClaim)) return true;
  }
  return false;
}

function isCalibratedAfterClaimAnchors(
  claimScope: string,
  anchorPatterns: readonly RegExp[],
) {
  let finalAnchorEnd = 0;
  for (const anchorPattern of anchorPatterns) {
    const anchor = getLastPatternMatch(claimScope, anchorPattern);
    if (anchor?.index === undefined) continue;
    finalAnchorEnd = Math.max(finalAnchorEnd, anchor.index + anchor[0].length);
  }
  return (
    finalAnchorEnd > 0 &&
    isCalibratedClaimScope(claimScope.slice(finalAnchorEnd))
  );
}

function hasUnsafeEmbeddedExternalClaim(
  value: string,
  externalSubjectPattern: RegExp,
) {
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    const externalSubject = externalSubjectPattern.exec(sentence);
    if (!externalSubject) return false;
    const claimScope = sentence.slice(externalSubject.index);
    const hasReaderObject = readerPerceptionObjectPattern.test(claimScope);
    const hasReaderDative = readerPerceptionDativePattern.test(claimScope);
    const hasReaderAbout = readerPerceptionAboutPattern.test(claimScope);
    const hasReaderPossessive =
      readerPerceptionPossessivePattern.test(claimScope);
    const embeddedClaimScopes = getClaimScopes(claimScope);
    return embeddedClaimScopes.some((embeddedClaimScope, scopeIndex) => {
      const embeddedClaim =
        embeddedExternalClaimMarkerPattern.exec(embeddedClaimScope);
      if (!embeddedClaim) return false;
      const hasReaderPerceptionTarget =
        hasReaderObject ||
        hasReaderDative ||
        hasReaderAbout ||
        hasReaderPossessive;
      if (!hasReaderPerceptionTarget) return false;
      const questionFragment = questionFragmentPattern.exec(embeddedClaimScope);
      const asksAboutEmbeddedClaim =
        isQuestion &&
        (scopeIndex === embeddedClaimScopes.length - 1 ||
          (questionFragment !== null &&
            questionFragment.index < embeddedClaim.index) ||
          indirectQuestionPattern.test(embeddedClaimScope));
      return (
        !asksAboutEmbeddedClaim && !isCalibratedClaimScope(embeddedClaimScope)
      );
    });
  });
}

function hasUncalibratedReaderDescriptionClaim(value: string) {
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    const readerIndex = getLastPatternMatchIndex(
      sentence,
      explicitReaderSubjectPattern,
    );
    if (readerIndex === undefined) return false;
    const claimScope = sentence.slice(readerIndex).trim();
    const claimScopes = getClaimScopes(claimScope);
    const scopesToCheck = isQuestion ? claimScopes.slice(0, -1) : claimScopes;
    const allDescriptionClaimsCalibrated = scopesToCheck.every(
      (scope) =>
        isCalibratedClaimScope(scope) ||
        isGroundingClaimScope(scope) ||
        (isQuestion && questionFragmentPattern.test(scope)),
    );
    const isUncalibratedReaderClaim =
      assertiveDescriptionEndingPattern.test(claimScope) &&
      !allDescriptionClaimsCalibrated;
    return isUncalibratedReaderClaim;
  });
}

function hasUnsafeAnchoredDescriptionClaim(
  value: string,
  perspectivePattern: RegExp,
) {
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    const perspectiveIndex = getLastPatternMatchIndex(
      sentence,
      perspectivePattern,
    );
    if (perspectiveIndex === undefined) return false;
    const claimScope = sentence.slice(perspectiveIndex).trim();
    if (
      isQuestion &&
      hasUncalibratedQuestionPremise(claimScope, perspectivePattern)
    ) {
      return true;
    }
    const claimScopes = getClaimScopes(claimScope);
    const scopesToCheck = isQuestion ? claimScopes.slice(0, -1) : claimScopes;
    return (
      assertiveDescriptionEndingPattern.test(claimScope) &&
      !scopesToCheck.every(
        (scope) =>
          isCalibratedClaimScope(scope) ||
          isGroundingClaimScope(scope) ||
          (isQuestion && questionFragmentPattern.test(scope)),
      )
    );
  });
}

function hasUnsafePerspectiveContextClaim(
  value: string,
  perspectivePattern: RegExp,
) {
  return getSentencesPreservingEndings(value).some((sentenceWithEnding) => {
    const isQuestion = /[?？]$/u.test(sentenceWithEnding);
    const sentence = stripSentenceEnding(sentenceWithEnding);
    const perspectiveIndex = getLastPatternMatchIndex(
      sentence,
      perspectivePattern,
    );
    if (perspectiveIndex === undefined) return false;
    const claimScope = sentence.slice(perspectiveIndex).trim();
    if (
      isQuestion &&
      hasUncalibratedQuestionPremise(claimScope, perspectivePattern)
    ) {
      return true;
    }
    const claimScopes = getClaimScopes(claimScope);
    const scopesToCheck = isQuestion ? claimScopes.slice(0, -1) : claimScopes;
    return (
      assertiveDescriptionEndingPattern.test(claimScope) &&
      !scopesToCheck.every(
        (scope) =>
          isCalibratedClaimScope(scope) ||
          isGroundingClaimScope(scope) ||
          perspectiveReflectionScopePattern.test(scope) ||
          (isQuestion && questionFragmentPattern.test(scope)),
      )
    );
  });
}

function hasUncalibratedQuestionPremise(
  claimScope: string,
  anchorPattern: RegExp,
) {
  const questionFragment = questionFragmentPattern.exec(claimScope);
  if (!questionFragment) return false;
  const premise = claimScope.slice(0, questionFragment.index).trim();
  const questionPredicate = claimScope.slice(questionFragment.index);
  if (possiblePerceptionPattern.test(questionPredicate)) return false;
  const anchor = getLastPatternMatch(premise, anchorPattern);
  if (!anchor?.[0]) return false;
  const remainder = premise
    .slice((anchor.index ?? 0) + anchor[0].length)
    .trim();
  if (
    !remainder ||
    /^(?:지금|현재|카드상|카드\s*(?:의미|흐름)상|상징적으로|대체로)$/u.test(
      remainder,
    )
  ) {
    return false;
  }
  return !isCalibratedClaimScope(premise) && !isGroundingClaimScope(premise);
}

function getSentencesPreservingEndings(value: string) {
  return (value.match(/[^.!?！？\n]+(?:[.!?！？]+|$)/gu) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function stripSentenceEnding(value: string) {
  return value.replace(/[.!?！？]+$/u, "").trim();
}

function getClaimScopes(claimScope: string) {
  const scopes: string[] = [];
  let scopeStart = 0;
  for (const match of claimScope.matchAll(
    /(?:하지만|그러나|반면|다만|그리고|또한)(?:\s*[,，]?\s*)|([가-힣]+?)(으면서도|면서도|으면서|면서|는데도|은데도|인데도|으니까|니까|으니|는데|은데|인데|으며|해도|어도|아도|여도|더라도|거나|으나|지만|(?<![다라자냐])고도|(?<![다라])고|며|니|되)(?=\s*[,，]?\s+)|([가-힣]+(?:한|은|는|인)\s*(?:채|대신))(?:\s*[,，]?\s+)/gu,
  )) {
    const matchIndex = match.index ?? 0;
    const stem = match[1];
    const connector = match[2];
    const completedPhrase = match[3];
    if (
      connector === "고" &&
      /^\s*있(?:을|는|었|어|습니다|어요)/u.test(
        claimScope.slice(matchIndex + match[0].length),
      )
    ) {
      continue;
    }
    const scopeEnd = stem
      ? matchIndex + stem.length
      : completedPhrase
        ? matchIndex + completedPhrase.length
        : matchIndex;
    scopes.push(claimScope.slice(scopeStart, scopeEnd));
    scopeStart = matchIndex + match[0].length;
  }
  scopes.push(claimScope.slice(scopeStart));
  return scopes.map((scope) => scope.trim()).filter(Boolean);
}

function isGroundingClaimScope(claimScope: string) {
  const normalizedClaimScope = claimScope
    .replace(
      /^(?:아직\s*모르는\s*점|관찰할\s*점|다시\s*볼\s*조건|작은\s*행동|멈추거나\s*다시\s*볼\s*조건):\s*/u,
      "",
    )
    .trim();
  const usesCardsAsProof = /(?:타로|카드|상징|해석)/u.test(
    normalizedClaimScope,
  );
  const hasConcreteRealityEvidence =
    /(?:직접\s*확인|말|행동|대화|피드백|반복\s*신호|신호|근거|당사자|관찰|기록|맡겨진\s*역할|역할|묻)/u.test(
      normalizedClaimScope,
    );
  return (
    externalPerceptionVerificationActionPattern.test(normalizedClaimScope) ||
    readerGroundingActionPattern.test(normalizedClaimScope) ||
    (realityGroundingActionPattern.test(normalizedClaimScope) &&
      hasConcreteRealityEvidence &&
      !usesCardsAsProof) ||
    (externalAttractionGroundingActionPattern.test(normalizedClaimScope) &&
      hasConcreteRealityEvidence &&
      !usesCardsAsProof) ||
    selfFeelingGroundingActionPattern.test(normalizedClaimScope) ||
    (externalFeelingGroundingActionPattern.test(normalizedClaimScope) &&
      hasConcreteRealityEvidence &&
      !usesCardsAsProof &&
      !attractionIntentLexemePattern.test(normalizedClaimScope))
  );
}

function isCalibratedClaimScope(claimScope: string) {
  return (
    epistemicPossibilityCalibrationPattern.test(claimScope) ||
    claimCalibrationPattern.test(claimScope) ||
    finalUncertainPerceptionPattern.test(claimScope) ||
    intrinsicallyCalibratedPredicatePattern.test(claimScope) ||
    /(?:보이|보여|읽혀)$/u.test(claimScope)
  );
}

function hasUnsafeFactualPerceptionClaim(
  value: string,
  anchorPattern: RegExp,
  predicatePattern: RegExp,
) {
  const sentences = value.split(/[.!?！？\n]+/u);

  return sentences.some((sentence) => {
    for (const match of sentence.matchAll(predicatePattern)) {
      const predicateStart = match.index ?? 0;
      const anchors = [
        ...sentence.slice(0, predicateStart + 1).matchAll(anchorPattern),
      ];
      const anchor = anchors.at(-1);
      if (anchor?.index === undefined) continue;

      const claimEnd = predicateStart + match[0].length;
      const boundaryStart = getLastClaimBoundaryEnd(
        sentence.slice(0, predicateStart),
      );
      const claimStart = Math.max(anchor.index, boundaryStart);
      const claimScope = sentence.slice(claimStart, claimEnd);
      if (!isCalibratedClaimScope(claimScope)) {
        return true;
      }
    }

    return false;
  });
}

function hasUnsafeHiddenClaim(
  value: string,
  subjectPattern: RegExp,
  claimPattern: RegExp,
  allowExplicitUncertainty: boolean,
) {
  const sentences = value.split(/[.!?！？\n]+/u);

  return sentences.some((sentence) => {
    for (const match of sentence.matchAll(claimPattern)) {
      const claimEnd = (match.index ?? 0) + match[0].length;
      const claimScope = getFinalClaimScope(sentence, claimEnd);
      const calibratedClaim = getFinalClaimScope(match[0], match[0].length);
      const hasSubject = subjectPattern.test(claimScope);
      const isPossible = possiblePerceptionPattern.test(calibratedClaim);
      const isExplicitlyUncertain =
        finalUncertainPerceptionPattern.test(calibratedClaim);
      if (
        hasSubject &&
        !isPossible &&
        !(allowExplicitUncertainty && isExplicitlyUncertain)
      ) {
        return true;
      }
    }

    return false;
  });
}

function getFinalClaimScope(sentence: string, claimEnd: number) {
  const claimPrefix = sentence.slice(0, claimEnd);
  return sentence.slice(getLastClaimBoundaryEnd(claimPrefix), claimEnd);
}

function getSurroundingClaimScope(
  sentence: string,
  matchStart: number,
  matchEnd: number,
) {
  const claimStart = getLastClaimBoundaryEnd(sentence.slice(0, matchStart));
  let claimEnd = sentence.length;
  for (const boundary of sentence.matchAll(claimBoundaryPattern)) {
    if ((boundary.index ?? 0) >= matchEnd) {
      claimEnd = boundary.index ?? sentence.length;
      break;
    }
  }
  return sentence.slice(claimStart, claimEnd);
}

function getLastClaimBoundaryEnd(value: string) {
  let boundaryEnd = 0;
  for (const match of value.matchAll(claimBoundaryPattern)) {
    boundaryEnd = (match.index ?? 0) + match[0].length;
  }
  return boundaryEnd;
}

function getLastPatternMatchIndex(value: string, pattern: RegExp) {
  return getLastPatternMatch(value, pattern)?.index;
}

function getLastPatternMatch(value: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  let lastMatch: RegExpMatchArray | undefined;
  for (const match of value.matchAll(new RegExp(pattern.source, flags))) {
    lastMatch = match;
  }
  return lastMatch;
}

function splitSections(text: string) {
  const lines = text.split("\n");
  const sections = new Map<(typeof instantReadingMarkers)[number], string>();
  let activeMarker: (typeof instantReadingMarkers)[number] | undefined;
  let content: string[] = [];

  const flush = () => {
    if (!activeMarker) return;
    const value = content.join("\n").trim();
    if (!value || sections.has(activeMarker)) return false;
    sections.set(activeMarker, value);
    return true;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if ((instantReadingMarkers as readonly string[]).includes(line)) {
      if (activeMarker && !flush()) return undefined;
      activeMarker = line as (typeof instantReadingMarkers)[number];
      content = [];
      continue;
    }
    if (!activeMarker) return undefined;
    content.push(line);
  }

  if (!flush() || sections.size !== instantReadingMarkers.length) {
    return undefined;
  }
  return sections;
}

function hasValidCardLines(value: string, expectedCount: number) {
  const lines = value.split("\n").filter(Boolean);
  if (lines.length !== expectedCount) return false;

  return lines.every((line, index) => {
    const match = /^(\d+)\.\s+(.+)$/u.exec(line);
    return (
      match?.[1] === String(index + 1) && hasBoundedLength(match[2], 15, 300)
    );
  });
}

function hasExactLabelledLines(
  value: string,
  labels: readonly string[],
  minimum: number,
  maximum: number,
) {
  const lines = value.split("\n").filter(Boolean);
  if (lines.length !== labels.length) return false;

  return lines.every((line, index) => {
    const label = labels[index]!;
    return (
      line.startsWith(label) &&
      hasBoundedLength(line.slice(label.length).trim(), minimum, maximum)
    );
  });
}

function hasValidActionLines(value: string, questionId?: string) {
  if (!hasExactLabelledLines(value, actionLabels, 8, 280)) return false;
  const [smallActionLine, stopConditionLine] = value.split("\n");
  const smallAction = smallActionLine!.slice(actionLabels[0].length).trim();
  const stopCondition = stopConditionLine!.slice(actionLabels[1].length).trim();
  const hasOneSmallActionSentence =
    getSentencesPreservingEndings(smallAction).length === 1;
  const hasUnsafeAttractionActionClaim = hasUnsafeActionClaim(
    smallAction,
    questionId,
  );
  return (
    hasOneSmallActionSentence &&
    !hasUnsafeAttractionActionClaim &&
    /세요[.。]?$/u.test(smallAction) &&
    /면\s+이\s*행동을\s*멈추고\s*다시\s*판단하세요[.。]?$/u.test(stopCondition)
  );
}

function hasUnsafeActionClaim(value: string, questionId?: string) {
  const actionReferencesAttractionOrStatus =
    attractionIntentLexemePattern.test(value) ||
    relationshipStatusPattern.test(value);
  const actionReferencesExternalState =
    actionReferencesAttractionOrStatus || externalInnerStatePattern.test(value);
  if (!actionReferencesExternalState) return false;
  if (factualRelationshipStateFramePattern.test(value)) return true;
  for (const match of value.matchAll(possibilityFactualizationActionPattern)) {
    const predicate = match[1] ?? match[2];
    const predicateEnd = (match.index ?? 0) + match[0].length;
    const usesHaConjugation =
      predicate === "확신" ||
      predicate === "판단" ||
      predicate === "생각" ||
      predicate === "간주" ||
      predicate === "인정";
    if (!hasAttachedActionNegation(value, predicateEnd, usesHaConjugation)) {
      return true;
    }
  }
  const assumptiveActionSafety = getAssumptiveRelationshipActionSafety(value);
  if (assumptiveActionSafety.hasUnsafeMatch) {
    return true;
  }

  const qualifiedAttractionOrStatusClauseStarts = new Set<number>();
  const factualizingMatches = value.matchAll(
    new RegExp(factualizingActionClaimPattern.source, "gu"),
  );
  for (const match of factualizingMatches) {
    const predicateStart = match.index ?? 0;
    const predicateEnd = predicateStart + match[0].length;
    const claimStart = getActionPredicateClauseStart(value, predicateStart);
    const claimPrefix = value.slice(claimStart, predicateEnd);
    const factualizesPossibility =
      /가능성(?:을|를)[^.!?！？\n]{0,24}확신$/u.test(claimPrefix) ||
      /가능성(?:을|를)[^.!?！？\n]{0,16}(?:사실|진실|현실|확실|확정)[^.!?！？\n]{0,12}(?:받아들이|믿|여기|간주|인정|판단|생각|확신)$/u.test(
        claimPrefix,
      );
    if (
      factualizesPossibility &&
      !hasAttachedFactualActionNegation(value, match, predicateEnd)
    ) {
      return true;
    }
    if (
      contextualFactualizingActionClaimPattern.test(match[0]) &&
      (!factualizingActionComplementPattern.test(claimPrefix) ||
        indirectQuestionActionClaimPattern.test(claimPrefix))
    ) {
      if (
        (attractionIntentLexemePattern.test(claimPrefix) ||
          relationshipStatusPattern.test(claimPrefix)) &&
        (hasLocalActionCalibration(value, claimStart, predicateStart) ||
          hasLocalActionUncertainty(value, claimStart, predicateStart) ||
          indirectQuestionActionClaimPattern.test(claimPrefix))
      ) {
        qualifiedAttractionOrStatusClauseStarts.add(claimStart);
      }
      continue;
    }
    const hasLocalExternalState =
      attractionIntentLexemePattern.test(claimPrefix) ||
      relationshipStatusPattern.test(claimPrefix) ||
      externalInnerStatePattern.test(claimPrefix);
    const hasExplicitSafeObject =
      /(?:(?:독자|나|저|당신)(?:의)?|내|제|자신의)\s*(?:판단|생각|결정|선택|경계|기준)(?:을|를)/u.test(
        claimPrefix,
      );
    if (
      !hasLocalExternalState &&
      (!actionReferencesExternalState || hasExplicitSafeObject)
    ) {
      continue;
    }
    if (
      !hasLocalActionCalibration(value, claimStart, predicateStart) &&
      !hasLocalActionUncertainty(value, claimStart, predicateStart) &&
      !hasAttachedFactualActionNegation(value, match, predicateEnd)
    ) {
      return true;
    }
    if (
      attractionIntentLexemePattern.test(claimPrefix) ||
      relationshipStatusPattern.test(claimPrefix)
    ) {
      qualifiedAttractionOrStatusClauseStarts.add(claimStart);
    }
  }

  if (!actionReferencesAttractionOrStatus) return false;
  return getActionClauses(value).some(
    ({ start, text: clause }) =>
      (attractionIntentLexemePattern.test(clause) ||
        relationshipStatusPattern.test(clause)) &&
      !qualifiedAttractionOrStatusClauseStarts.has(start) &&
      !assumptiveActionSafety.safeClauseStarts.has(start) &&
      !safeAttractionOrStatusActionPattern.test(clause) &&
      !genericNegativeActionPattern.test(clause) &&
      !isExplicitSelfAttractionClaim(clause) &&
      !isQuestionOwnedImplicitReaderAttractionClaim(clause, questionId) &&
      !hasLocalActionQualifier(
        clause,
        0,
        clause.length,
        calibratedActionClaimPattern,
      ) &&
      !hasLocalActionQualifier(
        clause,
        0,
        clause.length,
        uncertainPerceptionPattern,
      ),
  );
}

function isExplicitSelfAttractionClaim(clause: string) {
  const selfTarget = selfAttractionActionPattern.exec(clause);
  if (!selfTarget) return false;
  const claimPrefix = clause.slice(0, selfTarget.index);
  return (
    !externalSelfAttractionActorPattern.test(clause) &&
    !/(?:도록|달라고)/u.test(clause) &&
    !externalActorBeforeSelfAttractionPattern.test(claimPrefix) &&
    !externalActorBeforeSelfAttractionPattern.test(clause) &&
    !explicitOtherPersonSubjectPattern.test(clause)
  );
}

function getAssumptiveRelationshipActionSafety(value: string) {
  const safeClauseStarts = new Set<number>();
  const matches = value.matchAll(
    new RegExp(assumptiveRelationshipActionPattern.source, "gu"),
  );
  for (const match of matches) {
    const matchStart = match.index ?? 0;
    const actionEnd = matchStart + match[0].length;
    if (!hasAttachedActionNegation(value, actionEnd, false)) {
      return { hasUnsafeMatch: true, safeClauseStarts };
    }
    safeClauseStarts.add(getActionPredicateClauseStart(value, matchStart));
  }
  return { hasUnsafeMatch: false, safeClauseStarts };
}

function hasAttachedFactualActionNegation(
  value: string,
  match: RegExpMatchArray,
  predicateEnd: number,
) {
  const usesHaConjugation =
    /^(?:확신|확실시|확정|단정|전제|가정|상상|판단|판정|결정|생각|간주|인정|규정|분류|증명|보장|기정사실화)$/u.test(
      match[0],
    );
  return hasAttachedActionNegation(value, predicateEnd, usesHaConjugation);
}

function hasAttachedActionNegation(
  value: string,
  predicateEnd: number,
  usesHaConjugation: boolean,
) {
  const suffix = value.slice(predicateEnd, predicateEnd + 16);
  return usesHaConjugation
    ? /^(?:하지(?:는)?\s*(?:말|마|않)|하기보다|하는\s*대신|할\s*수\s*없)/u.test(
        suffix,
      )
    : /^(?:지(?:는)?\s*(?:말|마|않)|기보다|는\s*대신|을\s*수\s*없)/u.test(
        suffix,
      );
}

function hasLocalActionCalibration(
  value: string,
  claimStart: number,
  predicateStart: number,
) {
  return hasLocalActionQualifier(
    value,
    claimStart,
    predicateStart,
    calibratedActionClaimPattern,
  );
}

function hasLocalActionUncertainty(
  value: string,
  claimStart: number,
  predicateStart: number,
) {
  return hasLocalActionQualifier(
    value,
    claimStart,
    predicateStart,
    uncertainPerceptionPattern,
  );
}

function hasLocalActionQualifier(
  value: string,
  claimStart: number,
  predicateStart: number,
  qualifierPattern: RegExp,
) {
  const claimPrefix = value.slice(claimStart, predicateStart);
  const qualifier = getLastPatternMatch(claimPrefix, qualifierPattern);
  if (qualifier?.index === undefined) return false;
  const afterQualifier = claimPrefix.slice(
    qualifier.index + qualifier[0].length,
  );
  return (
    !attractionIntentLexemePattern.test(afterQualifier) &&
    !relationshipStatusPattern.test(afterQualifier) &&
    !externalInnerStatePattern.test(afterQualifier) &&
    !interveningActionClaimPattern.test(afterQualifier)
  );
}

function getActionPredicateClauseStart(value: string, predicateStart: number) {
  let clauseStart = 0;
  for (const boundary of value.matchAll(
    new RegExp(actionClauseBoundarySource, "gu"),
  )) {
    const boundaryStart = boundary.index ?? 0;
    const boundaryEnd = boundaryStart + boundary[0].length;
    if (boundaryEnd <= predicateStart) {
      clauseStart = boundaryEnd;
    }
  }
  return clauseStart;
}

function getActionClauses(value: string) {
  const clauses: { start: number; text: string }[] = [];
  let clauseStart = 0;
  for (const boundary of value.matchAll(
    new RegExp(actionClauseBoundarySource, "gu"),
  )) {
    const clauseEnd = (boundary.index ?? 0) + boundary[0].length;
    clauses.push({
      start: clauseStart,
      text: value.slice(clauseStart, clauseEnd),
    });
    clauseStart = clauseEnd;
  }
  clauses.push({ start: clauseStart, text: value.slice(clauseStart) });
  return clauses.filter(({ text: clause }) => clause.trim().length > 0);
}

function hasKoreanMajority(value: string) {
  const letters = value.match(/[A-Za-z가-힣]/gu) ?? [];
  const korean = value.match(/[가-힣]/gu) ?? [];
  return (
    korean.length >= 80 && korean.length / Math.max(letters.length, 1) >= 0.55
  );
}

function hasBoundedLength(
  value: string | undefined,
  minimum: number,
  maximum: number,
): value is string {
  if (!value) return false;
  const length = [...value].length;
  return length >= minimum && length <= maximum;
}

function normalizeComparison(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/[\p{P}\p{S}\s]+/gu, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function isAllowedId<const Id extends string>(
  value: unknown,
  ids: readonly Id[],
): value is Id {
  return (
    typeof value === "string" && (ids as readonly string[]).includes(value)
  );
}
