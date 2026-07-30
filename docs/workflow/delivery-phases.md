# Phase-Gated Delivery

## Scope

Use this workflow for user-requested code, product, content-system, analytics,
SEO, or visual behavior changes. It does not require a GitHub Issue or pull
request.

Read-only answers and genuinely trivial non-behavioral edits may use the light
path in `docs/workflow/task-routing.md` unless the user explicitly requests
phase gates.

## Plan Gate

1. Complete the routed preflight before the first file edit.
2. State the intended outcome, changed contracts, files or systems in scope,
   acceptance criteria, tests, and explicit non-goals.
3. Give the plan to an independent reviewer that did not author it.
4. Resolve every blocking finding and repeat review until the reviewer reports
   no findings.
5. Do not begin implementation while a blocking plan finding remains.

Keep the review local to the current task unless the user requests durable
GitHub collaboration.

## Implementation Gate

1. Implement only the reviewed scope.
2. Cover each changed contract at the test layer that can prove it.
3. Keep user-visible output, localization, analytics, accessibility, privacy,
   and reduced-motion behavior aligned.
4. Record any necessary deviation from the reviewed plan and review that
   deviation before expanding the implementation.
5. Run the verification gates in
   `docs/engineering/verification-gates.md`.

## Review Gate

1. Give the exact diff, acceptance criteria, and verification evidence to an
   independent reviewer that did not implement the change.
2. Ask for concrete findings about user flows, regressions, type safety,
   accessibility, mobile layout, privacy, analytics, localization, unnecessary
   complexity, and missing tests.
3. Resolve every blocking finding.
4. Rerun affected checks after each fix and rerun the complete required gate
   set before completion.
5. Repeat independent review when a fix materially changes the reviewed
   contract.

Do not report completion until the final independent review has no blocking
findings and every required verification gate passes.

## Independence Boundary

- Use a separate reviewer process or agent with only the context required to
  review the plan or diff.
- Keep reviewers read-only unless a separate implementation task explicitly
  authorizes edits.
- Do not send secrets, private user context, or unrelated repository material
  to a reviewer.
- Do not describe a self-review as independent.
- If independent reviewer capability is unavailable, perform a structured
  self-review, disclose the limitation, and do not claim independent approval.
