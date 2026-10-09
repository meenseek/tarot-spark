# Launch Readiness

## Scope

Use these technical gates before acquisition, advertising enablement, or a
commerce launch. Business targets and paid-demand decisions remain in the
applicable owner-approved operating record. Passing a gate does not grant
deployment, publication, spending, or checkout authorization.

## Production Integrity

Complete the base production-integrity gate before acquisition or paid tests.
Keep advertising off except for controlled verification until the advertising
sub-gate passes.

- Run the complete
  [required verification gates](../engineering/verification-gates.md) and review
  the intended diff.
- Confirm that the intended commit SHA is the commit running in production.
- Disable the advertising environment configuration when the current
  production build violates consent or route isolation. Keep it disabled until
  the intended build is available for controlled verification.
- Confirm the expected response, metadata, canonical URL, language alternates,
  sitemap, and robots policy for every public route.
- Configure Consent Mode v2 before Google tags: grant by default outside the
  EEA, UK, and Switzerland, and deny all four relevant consent signals by
  default inside those regions. Verify core events in GA DebugView and exclude
  developer and internal traffic.
- Keep the AdSense script gate disabled until a Google-certified regional CMP,
  its TCF behavior, and its Consent Mode updates are verified on the exact
  registered HTTPS hostname in a controlled check.
- In AdSense **Privacy & messaging > Settings > Consent mode settings**, enable
  Consent Mode for both advertising purposes and analytics purposes. Verify the
  two account options explicitly; creating a privacy message does not enable
  them automatically.

### Controlled Advertising Verification

Use the intended commit and advertising configuration in a preview or a
controlled production verification:

- Confirm the authorized-seller record when the advertising configuration is
  active.
- Confirm that `/`, `/ko`, `/share`, and `/ko/share` never load the AdSense
  script or make advertising network requests under default settings, stored
  opt-out, regional CMP changes, or client navigation from an advertising
  route.
- Use a default-deny advertising route policy. Allow only individually reviewed,
  substantial content routes through an explicit allowlist. Exclude home, share,
  daily, and legal pages.
- Keep ads away from interactive controls and paid calls to action.
- Confirm that an allowed advertising page loads by default outside the
  restricted regions, honors a stored site-level opt-out everywhere, keeps the
  four regional consent signals denied before the certified CMP updates them,
  and stops after opt-out and document reload.
- Perform the regional check only when the exact hostname is registered to a
  published European regulations message, the expected publisher id and both
  Consent Mode account options are confirmed, AdSense reports the site as
  `Ready`, and the browser uses actual EEA, UK, or Switzerland network egress.
  Browser locale is not regional proof.
- For that controlled check only, temporarily enable the advertising script
  gate on the registered hostname. This does not authorize production
  enablement.
- Verify a natural restricted-region visit, explicit grant, a hard reload on a
  core route, consent withdrawal, absence of AdSense on excluded routes, and the
  separate site-level opt-out. Confirm the four consent signals and tag behavior
  after each transition.
- Treat any missing prerequisite or failed transition as blocked. Record the
  build, hostname, date, network region, account checks, and result without
  recording TC strings, cookies, or other user identifiers.
- Enable advertising in production only after these checks pass and AdSense
  reports the site as `Ready`.
- Repeat the consent, route-isolation, and applicable regional CMP and TCF
  smoke checks immediately after production enablement. If any check fails,
  disable advertising globally or apply only a previously verified regional
  block.

Passing this gate restores measurement and compliance readiness. It does not
prove advertising revenue. Keep technical enablement separate from
any earnings-based business decision.

## Commerce Readiness

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

## Provider Attribution

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

## External References

- [AdSense site approval](https://support.google.com/adsense/answer/12131223)
- [Google certified CMP setup](https://support.google.com/adsense/answer/7670013)
- [Google consent revocation](https://support.google.com/adsense/answer/10959060)
- [Korean distance-selling registration](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=11300000006&HighCtgCD=A09006&tp_seq=01)
- [Korean e-commerce consumer protection](https://www.ftc.go.kr/www/contents.do?key=703)
