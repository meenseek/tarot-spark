# Revenue Validation Plan

## Goal

Validate repeatable paid demand within 90 days, then use the evidence to pursue
a monthly operating profit run rate of KRW 100,000 over the following three to
six months. These periods are targets, not revenue guarantees.

Keep the free tarot drawing and prompt generator as the core product. Test one
Korean-language, one-time purchase before adding subscriptions, accounts, or
other paid product infrastructure.

Follow the [product guardrails](guardrails.md) and use the
[growth playbook](growth-playbook.md) for the first acquisition cohort. Each
phase that changes the product must complete the
[phase-gated delivery workflow](../workflow/delivery-phases.md).

## Profit Contract

Use finalized and settled values rather than estimated dashboard values:

```text
monthly operating profit =
  finalized advertising earnings
  + (actual contribution per settled order * settled orders)
  - direct monthly fixed costs
```

Calculate order contribution with variable sale costs included:

```text
actual contribution per settled order =
  (
    settled order revenue
    - refunds and chargebacks
    - variable checkout, platform, and payment fees
    - taxes applied directly to the sale
  )
  / settled orders
```

Exclude owner labor from the accounting formula, but record it separately and
limit routine revenue work to four hours per week. Limit the first paid product
build to 12 hours across no more than two working days.

Use this formula to update the required monthly order count:

```text
required orders =
  max(
    0,
    ceil(
      (
        KRW 100,000
        + direct monthly fixed costs
        - finalized advertising earnings
      )
      / actual contribution per settled order
    )
  )
```

Use the required-orders formula only when actual contribution per settled order
is greater than zero. Stop scaling and review the price and variable-cost
structure when contribution is zero or negative.

Before actual settlement data exists, use KRW 5,300 to KRW 5,865 as the
planning range for contribution from a KRW 6,900 product. That range requires
approximately 18 to 19 settled orders before direct monthly fixed costs. Replace
the range with actual variable fee, refund, chargeback, and sale-tax data as
soon as settlement data exists.

At a two percent purchase conversion rate, 18 to 19 orders require 900 to 950
unique product-page visitors per month. At three percent, they require about
600 to 635. Do not describe the target as achieved until the profit contract
reaches KRW 100,000 with actual finalized and settled values.

Treat advertising as optional upside until AdSense approval, actual page RPM,
and finalized earnings are known. The advertising-only sensitivity is:

| Page RPM  | Eligible monthly page views for KRW 100,000 |
| --------- | ------------------------------------------: |
| KRW 1,000 |                                     100,000 |
| KRW 3,000 |                                      33,334 |
| KRW 5,000 |                                      20,000 |

Use Google's
[page RPM formula](https://support.google.com/adsense/answer/190515) for this
calculation. Keep accrued earnings separate from cash received because AdSense
uses account-currency payment thresholds.

## Phase 0: Production Integrity

Complete the base production-integrity gate before acquisition or paid tests.
Keep advertising off except for controlled verification until the advertising
sub-gate passes.

- Run the complete required verification gates and review the intended diff.
- Confirm that the intended commit SHA is the commit running in production.
- Disable the advertising environment configuration when the current
  production build violates consent or route isolation. Keep it disabled until
  the intended build is available for controlled verification.
- Confirm the expected response, metadata, canonical URL, language alternates,
  sitemap, and robots policy for every public route.
- Configure analytics to load only after analytics consent. Verify the core
  events in GA DebugView and exclude developer and internal traffic.
- Keep advertising disabled for EEA, UK, and Swiss users until a Google
  certified CMP and the required TCF behavior are verified in a preview or
  other controlled environment.

### Controlled Advertising Verification

Use the intended commit and advertising configuration in a preview or a
controlled production verification:

- Confirm the authorized-seller record when the advertising configuration is
  active.
- Confirm that `/`, `/ko`, `/share`, and `/ko/share` never load the AdSense
  script or make advertising network requests before consent, after consent,
  after rejection, or after client navigation from an advertising route.
- Use a default-deny advertising route policy. Allow only substantial
  relationship-flow and guide pages after separate content review. Exclude
  home, share, daily, and legal pages.
- Confirm that an allowed advertising page loads advertising only after valid
  advertising consent and stops after consent withdrawal and document reload.
- Enable advertising in production only after these checks pass and AdSense
  reports the site as `Ready`.
- Repeat the consent, route-isolation, and applicable regional CMP and TCF
  smoke checks immediately after production enablement. If any check fails,
  disable advertising globally or apply only a previously verified regional
  block.

Passing this gate restores measurement and compliance readiness. It does not
prove advertising revenue. Finalized earnings are required before advertising
contributes to the profit contract, not before controlled enablement.

## Phase 1: Activation And Acquisition

Acquire at least 200 analyzable reading sessions before treating the free
product as ready for a paid-demand test.

Define an analyzable reading session as a GA session in which:

- analytics consent was active before the measured interaction;
- one or more valid `result_view` events occurred; and
- internal, developer, and identified bot traffic was excluded.

Record consent rate only when a privacy-approved, aggregate all-visit
denominator exists without loading optional analytics or identifying users.
Otherwise, do not calculate or claim consent rate. Do not add interactions that
occurred before analytics consent to the analyzable-session denominator.

Review these funnels:

```text
topic_click -> draw_start -> result_view -> successful prompt_copy
share_click -> exactly one share_result
```

Publish up to four original Korean guides during the first cohort:

1. How to structure a relationship tarot question.
2. How to ask about reunion without claiming certainty.
3. When to choose a three-card or six-card spread.
4. How to turn a tarot result into a grounded action plan.

Each guide should include an original example, a before-and-after comparison,
clear authorship or creation context, a relevant generator call to action, and
the required disclaimer. Do not mass-produce keyword variants or English
translations. Add another locale only after demand is observed.

Register the site in Search Console, submit the sitemap, and review queries,
pages, impressions, and clicks. Keep daily content out of the index until the
page contains substantial static value. Do not create date-specific thin URLs.

Use only the implemented source and campaign values. Stop an acquisition
channel after 50 referred visits with no `result_view`. If a guide receives no
search impressions or clicks after four weeks, revise its title and internal
links once before creating more content for the same intent.

The 200-session gate validates activation and the current deck experiment. It
does not validate willingness to pay.

## Phase 2: Interest Test

After a successful `prompt_copy` for the relationship-flow topic, show one
non-blocking offer per session:

```text
30-day relationship reflection workbook
Planned price: KRW 6,900
View the contents and a free sample
```

State that the product is not yet for sale. Do not collect email, payment, or
other personal information during this phase.

Define one qualified offer exposure as:

- an analyzable session;
- a successful relationship-flow `prompt_copy`;
- at least 50 percent of the offer visible for at least one second; and
- no earlier qualified offer exposure in the same session.

Use 200 unique qualified exposures for the interest gate:

- pass interest when offer click-through rate is at least five percent and
  sample-download rate is at least three percent;
- revise the value proposition once when either threshold is missed; and
- stop product development when the repeated test still misses either
  threshold.

Passing this gate shows interest, not purchase intent. If it passes, build only
a text-first Korean workbook within the 12-hour limit. Do not expand the deck
or create new card art for the product.

An implementation may add `offer_view`, `offer_click`, `sample_download`, and
`checkout_click` only because the core reading events cannot represent these
actions. Allow only stable `product_id`, `placement`, `locale`, and existing
`source` and `campaign` values. Reject free text, names, email addresses, order
ids, and tarot context. Send events only after analytics is ready and dedupe
session-scoped events. Cover the validator, consent states, dedupe behavior,
and both locales with tests.

## Phase 3: Commerce Readiness And Paid Validation

Do not publish a checkout until the applicable jurisdiction and provider
requirements have been verified for:

- seller identity and business or distance-selling registration;
- tax-inclusive price and any sale-tax treatment;
- delivery timing and digital fulfillment;
- withdrawal, refund, and digital-delivery consent;
- customer support, receipts, and tax records; and
- checkout and fulfillment processors, retention, deletion, and international
  data transfers.

Update Privacy, Contact, Terms, and refund disclosures to match the actual
commerce flow. Use current platform requirements and qualified local advice
when a legal or tax obligation is unclear.

Launch one Korean, one-time KRW 6,900 workbook through an external checkout.
Do not add login, subscription billing, or payment processing to tarot-spark.

Use the checkout provider as the source of truth for unique product visitors,
settled orders, refunds, and chargebacks. Select a provider only when it can
export those aggregate values under one attribution contract:

- pass only the existing allowlisted `source` and `campaign` through fixed
  parameters or provider campaign identifiers;
- use stable product and placement identifiers;
- do not pass personal information, free text, tarot context, or order ids; and
- export visitors and settled, refunded, and charged-back orders using the same
  attribution basis.

If the provider cannot provide matching aggregate visitor and order
attribution, do not claim source-level paid conversion or apply source-level
revenue stop rules. Use source-level GA `checkout_click` only for diagnostics
and use the provider's total settled-order results for the paid gate. If the
provider cannot provide bot-filtered unique visitors, do not claim a conversion
rate; use the absolute settled-order gate.

Where provider visitor data is available, validate with 300 unique
product-page visitors:

- stop below three settled orders or below one percent conversion;
- revise the value proposition or price once for three to five settled orders,
  or one to less than two percent conversion; and
- maintain the offer at six or more settled orders and at least two percent
  conversion.

When provider visitor data is unavailable, require at least six settled orders
before maintaining the offer. A consented GA `page_view` on the fixed product
route, with internal, developer, and bot traffic excluded, is a diagnostic
fallback and not a complete paid-conversion denominator.

Review refunds, chargebacks, delivery failures, and support issues before
scaling.

## Phase 4: Scale

Scale only after the paid-validation and commerce-readiness gates pass.

- Target 600 to 950 unique product visitors per month.
- Target 18 to 19 settled orders, then recalculate the requirement with actual
  contribution, direct monthly fixed costs, and finalized advertising earnings.
- Use 150 to 238 product visitors per week as the initial traffic requirement.
- Start with a provisional allocation of 60 percent owned search and Naver, 25
  percent social and approved communities, and 15 percent activated in-product
  traffic.
- Reallocate weekly using actual attributed paid conversion only when the
  provider supports the shared attribution contract.
- Stop an attributed channel after 100 unique product visitors and no settled
  orders. Revise its value proposition or price once at one percent conversion,
  and maintain it at two percent or higher.

When source-level paid attribution is unavailable, do not apply the provisional
allocation or source-level stop rule as if revenue attribution were known.
Separate GA click diagnostics from the provider-wide settled-order gate.

Enable advertising only after the controlled advertising verification,
AdSense `Ready` status, and content review pass. Repeat the production smoke
checks, including applicable regional CMP and TCF behavior, after enablement.
On failure, disable advertising globally or apply only a previously verified
regional block. Keep ads away from interactive controls and paid calls to
action. Use advertising earnings to reduce the required settled-order count
only after those earnings are finalized.

## Non-Goals

- Do not add login, saved readings, or subscriptions.
- Do not add server-generated AI readings or advisor matching.
- Do not sell custom or predictive readings.
- Do not mass-produce SEO pages, translations, or community posts.
- Do not expand to all 22 illustrated cards before the existing deck gate.
- Do not place ads on interactive reading, share, daily, or legal routes.
- Do not send personal data or free-form tarot context to analytics,
  advertising, sharing, or checkout providers.

## External References

- [AdSense site approval](https://support.google.com/adsense/answer/12131223)
- [Google certified CMP setup](https://support.google.com/adsense/answer/7670013)
- [People-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Korean distance-selling registration](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=11300000006&HighCtgCD=A09006&tp_seq=01)
- [Korean e-commerce consumer protection](https://www.ftc.go.kr/www/contents.do?key=703)
