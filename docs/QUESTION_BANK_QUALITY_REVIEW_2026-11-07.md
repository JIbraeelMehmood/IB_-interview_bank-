# Question Bank Quality Review — 7 November 2026

## Scope

Reviewed the current `main` question bank and taxonomy before this change. The bank contained **2,140 records** across **49 technology/topic categories**. This change preserves all existing IDs and answers, clarifies selected ambiguous titles, adds a focused authentication/security set, and adds missing framework taxonomy entries.

## Baseline audit (before this branch)

- 2,140 records; no empty question or answer fields found.
- 1,951 unique stable identifiers when legacy `id` and imported `code` are considered together.
- 32 groups shared an exactly normalized question title. These are duplicate candidates, not automatically safe deletions: several have materially different answers, source context, or levels.
- 36 titles matched a simple heading-like pattern. A manual sample confirmed imported section headings whose answers bundle multiple questions. These require atomic splitting and human review; deleting them would discard content.
- Existing source types: 1,457 base, 493 new, 190 imported.
- The taxonomy mixed framework technologies with cross-cutting subjects (for example behavioral, architecture, performance and security). It also lacked dedicated CodeIgniter, Laminas/Zend and Angular framework categories.

These are structural quality indicators, **not a measured semantic accuracy percentage**. A trustworthy accuracy score requires a labelled human-reviewed sample and separate precision/recall measurement for each taxonomy dimension.

## Changes in this branch

1. Added 24 new scenario-oriented questions under **Authentication & Authorization**:
   - Session cookies vs bearer tokens, CSRF and browser token storage
   - Refresh-token rotation, JWT validation, OAuth 2.0 + PKCE
   - Laravel Sanctum vs Passport
   - Password hashing, credential stuffing, session fixation and logout
   - Password reset, API-key lifecycle and tenant/resource authorization
   - React stale-request races and effect cleanup
   - Payment idempotency, transactional outbox, safe migrations and resilient API retries
2. Clarified 29 short/ambiguous existing question titles without changing their stable IDs or answers.
3. Added CodeIgniter, Laminas/Zend Framework and Angular taxonomy entries.
4. Preserved original bank records and imported section bundles rather than destructively deleting or silently splitting them.

## Current counts after this branch

- **2,164 records** (24 added).
- Existing IDs are retained; new questions use `NQ-001` through `NQ-024`.
- **52 taxonomy entries** (3 added).

## Accuracy and review policy

Do not report 100% or any unsupported percentage. The next reliable step is to label a stratified sample across technologies, levels, question types and source types. For each record, reviewers should assess:
- Atomicity: one interview prompt rather than a heading or bundled list.
- Technical correctness and version sensitivity.
- Answer completeness and whether claims need qualification.
- Primary technology vs genuine integration technologies.
- Experience band and question type.
- Duplicate/near-duplicate status.

Track tag precision = correct assigned tags / all assigned tags reviewed, and recall = relevant tags found / all relevant tags identified by reviewers. Report confidence intervals and per-category results; do not mix structural checks with semantic accuracy.

## Research references used for the security and React topics

- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- React `useEffect` reference: https://react.dev/reference/react/useEffect

LinkedIn interview posts can suggest what candidates report being asked, but are anecdotal evidence rather than authoritative specifications. Questions were written in original wording; no post text was copied.

## Known remaining work

- Split imported section-heading records into atomic questions while preserving source provenance.
- Review all 32 duplicate-title groups and near-duplicates; merge only when answer, level and intended competency are equivalent.
- Separate technology tags from question-type/topic facets (behavioral, architecture, performance, debugging, fundamentals).
- Replace chapter-only automatic tagging with explicit primary/secondary technology labels and confidence/review state.
- Add human-reviewed benchmark labels and run taxonomy precision/recall reports before claiming a percentage.
