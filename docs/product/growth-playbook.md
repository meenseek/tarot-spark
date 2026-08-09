# Growth Playbook

## Goal

Acquire the first 200 analyzable reading sessions without mass posting, private
messages, prediction claims, or personal-data collection. Treat a successful
`prompt_copy` as activation. Treat `share_click` as intent and `share_result` as
the terminal share outcome.

Keep the complete 78-card runtime deck available as one atomic release. Never
expose a partial illustrated deck or tie card coverage to the 200-session
acquisition gate.

Use the [revenue validation plan](revenue-validation-plan.md) for monetization.
Start its interest test only after its production-integrity and activation
gates pass.

## Audience

Prioritize people who already use a generative AI writing tool and want a
structured way to reflect on a relationship.

- Target AI users who find ordinary tarot prompts too short or generic.
- Target tarot and journaling users who prefer self-reflection over prediction.
- Target creators who can compare the current preview illustrations and explain
  which visual details feel coherent. Use the Fool, Lovers, and Star as the
  canonical feedback subset.
- Do not target minors, crisis communities, mental-health support groups, or
  people seeking medical, legal, financial, investment, or safety decisions.

## Channel Order

1. Relationship-flow landing: reach people actively reflecting on a
   relationship with the search guide and direct generator CTA.
2. Naver Blog: reach Korean search users interested in AI or tarot how-to
   content with a complete worked guide and screenshots. Link once after the
   useful content; do not pad the article to hit a character target.
3. Instagram: reach visual tarot and journaling discovery with an original
   five-to-eight-slide carousel or one current-preview card image. Use the
   profile or story link.
4. Threads: reach Korean and English public conversations with a short
   observation, example prompt, and one question. Link in a relevant follow-up.
5. Naver Cafe: reach existing Korean tarot, journaling, or AI communities with
   a value-first text post tailored to the board. Link only when the cafe
   permits it.
6. Reddit: reach English tarot, journaling, or prompt communities with a native
   text case study and maker disclosure. Follow each community's
   self-promotion rule.

Do not automate community posting. Review the destination's current rules before
each post. Do not reuse the same title and body across communities.

Reddit defines repeated or unsolicited mass activity as spam and advises
contributors to check each community's rules. Some communities use a
self-promotion ratio near 10 percent:
[Reddit spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam)
and
[Reddit community spam guidance](https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community).

Naver may restrict mechanically mass-produced promotional posts, repeated
outbound links, hidden keywords, and posts that include personal information:
[Naver Cafe search limits](https://help.naver.com/service/5626/contents/22945?lang=ko)
and
[Naver promotional-post guidance](https://help.naver.com/service/19212/contents/7997?lang=ko&osType=COMMONOS).

Instagram and Threads should receive original posts without repetitive comments,
artificial engagement, or unsolicited commercial contact:
[Instagram Community Guidelines](https://www.facebook.com/help/instagram/477434105621119/)
and
[Threads launch and policy scope](https://about.fb.com/news/2023/07/introducing-threads-new-app-text-sharing/).

## Content Pillars

Use one clear job per post.

1. Prompt education: compare a predictive one-line question with the published
   reflective-question method and explain what changed.
2. Pick a card: show two or three symbols and ask a reflective question without
   revealing a prediction.
3. Relationship guide: separate symbolic interpretation material from factual
   proof, keep two alternatives open, and show how reality could revise them.
4. Combination method: demonstrate reinforcement, tension, progression, or
   integration with supplied upright meanings and an observable check.
5. Deck progress: show the Fool, Lovers, or Star from the canonical feedback
   subset and ask about frame, character, symbol, and palette consistency.
6. Build notes: share a concrete privacy or content decision, such as excluding
   personal context from URLs.

Every post should disclose that tarot-spark is the author's project when a link
is present. Every tarot post should frame the content as entertainment and
self-reflection.

### Relationship Question Explorer Contract

Publish relationship discovery as one substantial localized explorer, not as
one thin page per question. The explorer groups 28 reviewed presets into seven
intent categories and connects every choice to the existing reading workflow.
The selected preset may appear in a reading or share URL by stable id; names,
free-form questions, and personal circumstances must not.

Do not create indexable pages for individual presets merely to increase page
count. Consider splitting out a question only after search impressions,
reading starts, and successful prompt copies show durable demand for that
specific intent and there is enough original worked material to make the page
independently useful.

## Four-Week Run

### Week 1: Establish Relevance

- Publish one Naver Blog relationship-prompt guide.
- Publish one Korean Threads prompt comparison without a link in the first post.
- Publish one original Instagram carousel using the Lovers reference card.
- Read and record the rules of three candidate communities before commenting or
  posting there.

### Week 2: Test The Relationship Wedge

- Link the relationship-flow landing from one Naver Blog article.
- Publish one Threads follow-up with a practical action-prompt example.
- Make one community post only where self-promotion and outbound links are
  explicitly allowed.
- Compare `result_view` and successful `prompt_copy` by `source`.

### Week 3: Test Visual Pull

- Publish separate Fool, Lovers, and Star posts rather than a reused collage.
- Ask one visual question per post: character, symbol, background, or palette.
- Use the best-performing reference card as the first frame of an Instagram
  carousel.
- Compare `share_click` with `share_result`; fix failed outcomes before
  increasing posting frequency.

### Week 4: Decide

- Repeat the best content pillar once with a new example.
- Stop channels that deliver visits without `result_view`.
- Keep channels that deliver successful `prompt_copy` without safety or privacy
  complaints.
- Review the 200-session gate without changing the complete 78-card art release
  or substituting name faces.

## Measurement Contract

Use only the source and campaign values implemented by the product.

- `source`: `instagram`, `naver`, `threads`, `kakao`, `native`, `copy`,
  `pinterest`, or `reddit`.
- `campaign`: `vertical-slice`, `pick-a-card`, `prompt-education`,
  `deck-progress`, or `topic-guide`.

The optional `question_id` is limited to one of the reviewed public preset ids.
Never add localized question text, free-form user questions, names, account
handles, community names, post titles, or personal context to analytics fields
or reading URLs.

Review this funnel by locale, source, campaign, topic, public question preset,
spread, and style:

`draw_start` -> `result_view` -> `prompt_copy`

`result_view` means the result content actually intersected the viewport while
analytics consent was active. Do not backfill a result that left the viewport
before analytics became ready. Use `topic_click` separately as topic-selector
diagnostics; the default topic can reach `draw_start` without a topic click.

Review sharing separately:

`share_click` -> one `share_result`

## 200-Session Gate

Proceed to the next illustration rollout only when all conditions are true.

- At least 200 analyzable reading sessions have been observed.
- Prompt copies occur across more than one topic and are not limited to internal
  tests.
- Share failures are understood and no privacy-bearing URL has been observed.
- No unresolved high-severity safety, accessibility, or localization defect
  remains.
- Feedback on the Fool, Lovers, and Star supports one common frame, character
  grammar, symbol density, and palette direction.

If a condition fails, improve the vertical slice and collect another cohort.

## Ready-To-Adapt Posts

### Korean Threads: Prompt Education

> 타로 카드 뜻을 길게 붙여도 AI 답변이 짧고 비슷해지는 이유는 "무엇을
> 비교하고 어떻게 답할지"가 빠져 있기 때문이었습니다.
>
> 그래서 카드 의미를 사실의 증거로 쓰지 않고, 가장 강한 연결 하나와
> 서로 다른 두 가능성, 현실에서 확인할 기준, 멈출 조건까지 이어지는
> 여섯 단계 질문으로 바꿨습니다.
>
> 관계 리딩에서 카드명 외에 꼭 필요하다고 느끼는 정보는 무엇인가요?

Link only in a relevant reply. Add: `제가 만든 무료 도구 tarot-spark의
관계 흐름 페이지입니다.`

### Korean Naver Blog: Topic Guide

Title: `관계 타로를 AI에 물을 때 답변이 뻔해지지 않는 프롬프트 구조`

Opening:

> "이 카드가 연애에서 무슨 뜻인가요?"만 입력하면 카드별 일반 의미가
> 반복되기 쉽습니다. 관계 흐름을 살펴볼 때는 뽑힌 카드명을 정확한 순서로
> 적고, 확인한 사실과 아직 모르는 부분을 구분해 달라고 요청하는 편이
> 낫습니다.

Body order:

1. Short prompt and detailed prompt comparison.
2. Why card numbers mean draw order only.
3. Symbolic meanings, two alternatives, and a reality-check example.
4. One prompt with exact card names, reviewed nonvisual meanings, the no-image
   rule, a revision condition, and a reversible action.
5. Maker disclosure, relationship-flow link, and disclaimer.

### Korean Naver Cafe: Value-First Discussion

Title: `카드 뜻 나열 대신 스프레드 전체를 연결하는 질문 방식`

> 카드별 뜻을 하나씩 묻는 것보다 "강화, 긴장, 전개, 통합 중 어떤 관계가
> 가장 강한지"를 먼저 고르게 하니 답변의 반복이 줄었습니다.
>
> 여기에 같은 카드 의미로 가능한 비배타적 작업 가설을 정확히 두 개
> 남기고, 무엇을 확인하면 둘의 비중을 바꾸거나 모두 버려야 하는지와
> 해석의 승패와 별개로 멈출 조건까지 정리하게 했습니다.
> 여러분은 여러 장 리딩에서 카드 사이의 연결을 어떤 질문으로
> 끌어내시나요?

Add a link and maker disclosure only when the cafe and board explicitly allow
self-promotion.

### Instagram Carousel: Lovers Pilot

1. `상대의 속마음을 단정하지 않는 관계 타로 질문`
2. `카드 의미는 해석 재료이지 사실의 증거가 아니다`
3. `양자택일이 아닌 두 작업 가설`
4. `무엇을 보면 둘의 비중을 바꾸거나 모두 버릴까?`
5. `관찰과 별개로 언제 시험을 멈출까?`
6. `작은 행동 하나와 멈출 조건 하나`
7. `The Lovers: 선택과 상호성은 말보다 행동에서 보이는가?`
8. `오락과 자기 성찰 전용 | tarot-spark`

Use the canonical Lovers art. Do not add synthetic testimonials or outcome
claims.

### English Reddit: Native Text Case Study

Title: `I rebuilt a tarot prompt around two alternatives and a reality check`

> I was getting the same pattern from AI tarot prompts: three isolated card
> definitions, a vague conclusion, and no distinction between evidence and
> projection.
>
> I changed the structure so the prompt uses exact card names in draw order,
> treats their meanings as symbolic material rather than proof, develops one
> strong connection, keeps exactly two non-exclusive working hypotheses open,
> and names what would reweight them or reject both, plus an independent reason
> to stop the test.
>
> I built the free prototype, tarot-spark. I am looking for feedback on whether
> the simpler output is easier to understand, not for predictive accuracy.

Include the link only if the community rule allows it. Otherwise offer the
prompt structure in the post and let interested users request the project name
publicly; do not send unsolicited private messages.
