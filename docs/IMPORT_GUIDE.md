# Interview Box — PITB Pakistan Railways ITOPS Question Bank Import

## Overview

This folder now contains a **pre-imported question bank** (531 questions) extracted from **11 source markdown files** covering PITB Pakistan Railways IT Operations (Senior Software Engineer):

| File | Questions | Topics |
|---|---|---|
| `interview-box-banks-clean.json` | 531 | Combined question bank (ready to import) |
| `import-banks-clean.js` | — | Script that generates the JSON from markdown sources |
| `import-banks-final-2.js` | — | Updated script with fixed parser |
| `Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md` | 137 | Program-specific (RAIN, control rooms, GPS, Rabta app, Helpline 117, e-inspection, attendance, police systems) |
| `Interview Prep Roman Urdu Version (Poori Guide).md` | 191 | Full Roman Urdu translation |
| `Interview Prep Senior Software Engineer ITOPS (PITB Pakistan Railways).md` | 81 | Senior-level interview guide |
| `Level-wise Interview Q&A (Roman Urdu) Junior, Mid, 4-Year, Senior.md` | 115 | Level-specific (Junior/Mid/4yr/Senior) |
| `Roman Urdu v2 (Modern Dev Style).md` | 193 | Modern Roman Urdu style |
| `Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers).md` | 20 | Server/architectural deep-dive |
| `Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers-2.md` | 20 | Continuation of server questions |
| `Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md` | 5 | Production scenarios (debugging, idempotency, migrations, resilient APIs, Docker) |
| `Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md` | 2 | Failure-mode analysis (F1-F159) |

**Total:** 531 unique questions from 11 source files

---

## 1. Summary

This task extended the question bank by reading two new markdown files and extracting their questions:

1. **`Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md`** — 5 production scenario questions covering debugging slow production APIs, query redesign, idempotency, Laravel migrations, and resilient third-party integrations
2. **`Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md`** — 2 failure-mode questions covering system resilience, retries, fallbacks, and incident response

The new questions were added to `interview-box-banks-clean.json` (526 → 531 total questions across 11 source files). The import parser was updated and fixed to correctly handle the markdown formats.

---

## 2. New Questions Added (7 total)

### From `Senior Laravel Production Scenarios (Part 1) + Laravel Data + Docker for Laravel.md`

| ID | Question | Tag |
|---|---|---|
| `sc_1` | How do you systematically debug and fix this without downtime? | laravel, production, scenario |
| `sc_2` | How would you redesign queries and models without breaking existing APIs? | laravel, production, scenario |
| `sc_3` | What Laravel features would you use to guarantee idempotency, and why? | laravel, production, scenario |
| `sc_4` | What migration strategy would you follow in Laravel + MySQL? | laravel, production, scenario |
| `sc_5` | How would you design a resilient Laravel integration? | laravel, production, scenario |

### From `Failure-First Backend Interview What Happens When Things Fail (PHP Laravel).md`

| ID | Question | Tag |
|---|---|---|
| `f_F1` | Take a flow you built, like checkout or a signup email. Walk me through every step where it can fail halfway, and what state the system is left in each time. | failure-first, production, resilience |
| `f_F91` | You rotate `APP_KEY`. What breaks? | failure-first, production, resilience |

# Interview Box — PITB Pakistan Railways ITOPS Question Bank Import

## Overview

This folder now contains a **pre-imported question bank** (523 questions) extracted from **7 source markdown files** covering PITB Pakistan Railways IT Operations interviews:

| File | Questions | Topics |
|---|---|---|
| `interview-box-banks-clean.json` | 523 | Combined question bank (ready to import) |
| `import-banks-clean.js` | — | Script that generates the JSON from markdown sources |
| `Interview Prep 2 PITB Pakistan Railways ITOPS (Program-Specific Question Bank).md` | 137 | Program-specific (RAIN, control rooms, GPS, Rabta app, Helpline 117, e-inspection, attendance, police systems) |
| `Interview Prep Roman Urdu Version (Poori Guide).md` | 191 | Full Roman Urdu translation |
| `Interview Prep Senior Software Engineer ITOPS (PITB Pakistan Railways).md` | 81 | Senior-level interview guide |
| `Level-wise Interview Q&A (Roman Urdu) Junior, Mid, 4-Year, Senior.md` | 115 | Level-specific (Junior/Mid/4yr/Senior) |
| `Roman Urdu v2 (Modern Dev Style).md` | 193 | Modern Roman Urdu style |
| `Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers).md` | 20 | Server/architectural deep-dive |
| `Senior PHP Laravel Interview 5 Server Questions + Top 25 (Roman Urdu Answers-2.md` | 20 | Continuation of server questions |

## How to Import into Interview Box

### Method 1: Through the App (Recommended)

1. Open Interview Box at `http://localhost:8765/interview-box.html`
2. Go to **Library** view
3. Click **+ Add** or **+ AI: more like these** (look for the import/backup option in Settings)
4. Or go to **Settings** → **Import/Export** → **Import backup**
5. Load `interview-box-banks-clean.json` and restore

### Method 2: Direct State Merge (Advanced)

The app's state is stored in `localStorage` under the key `ibx`. To merge these questions directly:

1. Open Interview Box and go to **Library**
2. Open browser DevTools (F12) → **Application** tab → **Local Storage**
3. Find key `ibx` and copy its value
4. Edit the JSON in `interview-box-banks-clean.json` to match your existing state structure
5. Add the questions to `S.ai` array
6. Save and refresh

The app expects questions in this format:
```json
---

## 3. How to Import into Interview Box

### Method 1: Through the App (Recommended)

1. Open Interview Box at `http://localhost:8765/interview-box.html`
2. Go to **Library** view
3. Click **+ Add** or **+ AI: more like these** (look for the import/backup option in Settings)
4. Or go to **Settings** → **Import/Export** → **Import backup**
5. Load `interview-box-banks-clean.json` and restore

### Method 2: Direct State Merge (Advanced)

The app's state is stored in `localStorage` under the key `ibx`. To merge these questions directly:

1. Open Interview Box and go to **Library**
2. Open browser DevTools (F12) → **Application** tab → **Local Storage**
3. Find key `ibx` and copy its value
4. Edit the JSON in `interview-box-banks-clean.json` to match your existing state structure
5. Add the questions to `S.ai` array
6. Save and refresh

The app expects questions in this format:
```json
{
  "id": "string",
  "q": "Question text",
  "a": "Answer text",
  "t": ["tag1", "tag2", ...],   // tags
  "lvl": "j|m|s|mixed",          // level: junior|mid|senior|mixed
  "s": "my|ai",                  // source: my (user) or ai
  "src": "filename",             // source filename
  "priority": 1|2|3              // priority (1=low, 3=high)
}
```

---

## 4. Question Distribution

```
531 unique questions extracted and cleaned
  ├── PITB Program-Specific (Q1–Q155)                     137
  ├── Roman Urdu Version (Poori Guide)                     191
  ├── Senior SWE Guide                                     81
  ├── Level-wise Junior/Mid/Senior/Roman Urdu             115
  ├── Roman Urdu v2 (Modern Dev Style)                    193
  ├── Senior PHP Laravel 5 Server Q&A                      20
  ├── Continuation                                         20
  ├── Senior Laravel Production Scenarios (Part 1)          5
  └── Failure-First Backend Interview                       2
```

---

## 5. Tagging System

The questions are tagged by topic:
- `pitb`, `railways`, `itops` — PITB/Pakistan Railways context
- `laravel`, `php`, `mysql` — Technical stack
- `levelwise`, `junior`, `mid`, `senior`, `romanurdu` — Level/language
- `server`, `nginx`, `fpm` — Server architecture
- `production`, `scenario` — Production debugging scenarios
- `failure-first`, `resilience`, `backend` — Failure-mode analysis
- `bank`, `qa` — Generic source tags

---

## 6. Priority Levels

- **Priority 3 (High)**: Must prepare for this job — core topics (delivery, quality, database, security, operations, monitoring)
- **Priority 2 (Medium)**: Should prepare — complementary topics
- **Priority 1 (Low)**: Skim only — advanced/hypothetical topics

---

## 7. Sources & Attribution

All questions are derived from the markdown files in this directory. The scripts preserve the original question content with minimal cleaning (removing markdown markers). The original files should be consulted for the full context.

---

## 8. Notes

- The app's Library view will show these as "my" questions (s: "my")
- Use the filter chips (tags) to filter by topic
- Use the level filter (lvl) to filter by seniority
- The "AI: more like these" feature can generate additional questions based on these
- For the best interview experience, review questions tagged with `pitb`, `railways`, `itops` (the target job context)

{
  "id": "string",
  "q": "Question text",
  "a": "Answer text",
  "t": ["tag1", "tag2", ...],   // tags
  "lvl": "j|m|s|mixed",          // level: junior|mid|senior|mixed
  "s": "my|ai",                  // source: my (user) or ai
  "src": "filename",             // source filename
  "priority": 1|2|3              // priority (1=low, 3=high)
}
```

## Question Distribution

```
523 unique questions extracted and cleaned
  ├── PITB Program-Specific (Q1–Q155)             137
  ├── Roman Urdu Version (Poori Guide)             191
  ├── Senior SWE Guide                             81
  ├── Level-wise Junior/Mid/Senior/Roman Urdu     115
  ├── Roman Urdu v2 (Modern Dev Style)            193
  ├── Senior PHP Laravel 5 Server Q&A             20
  └── Continuation                               20
```

## Tagging System

The questions are tagged by topic:
- `pitb`, `railways`, `itops` — PITB/Pakistan Railways context
- `laravel`, `php`, `mysql` — Technical stack
- `levelwise`, `junior`, `mid`, `senior`, `romanurdu` — Level/language
- `server`, `nginx`, `fpm` — Server architecture
- `bank`, `qa` — Generic source tags

## Priority Levels

- **Priority 3 (High)**: Must prepare for this job — core topics (delivery, quality, database, security, operations, monitoring)
- **Priority 2 (Medium)**: Should prepare — complementary topics
- **Priority 1 (Low)**: Skim only — advanced/hypothetical topics

## Sources & Attribution

All questions are derived from the markdown files in this directory. The scripts preserve the original question content with minimal cleaning (removing markdown markers). The original files should be consulted for the full context.

## Notes

- The app's Library view will show these as "my" questions (s: "my")
- Use the filter chips (tags) to filter by topic
- Use the level filter (lvl) to filter by seniority
- The "AI: more like these" feature can generate additional questions based on these
- For the best interview experience, review questions tagged with `pitb`, `railways`, `itops` (the target job context)

---

*Last updated: 2026-10-14*
*Generated by: import-banks-clean.js*
