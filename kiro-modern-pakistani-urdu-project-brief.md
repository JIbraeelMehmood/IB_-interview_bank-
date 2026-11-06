# Kiro Project Brief: Modern Pakistani Urdu Translation, Roman Urdu, Hindi & Natural Text-to-Speech

> **Purpose:** This document is the consolidated product, language, architecture, implementation, and testing brief for improving an existing React/Next.js application. It is written for Kiro (AI coding assistant) so it can inspect the repository, understand the full intent, plan changes, and implement them without breaking existing functionality.

---

## 1. Executive summary

The application already exists. The goal is **not to rebuild it**. Improve its existing translation and text-to-speech (TTS) functionality so users can enter text and receive high-quality output in:

1. English
2. Modern Pakistani Urdu (Urdu script)
3. Modern Pakistani Roman Urdu (Latin characters)
4. Natural Hindi (Devanagari script)

The most important language requirement is:

**Urdu and Roman Urdu must sound and read like contemporary, educated Pakistani Urdu.** Do not produce Hindi vocabulary/grammar disguised as Urdu, overly Sanskritized Hindi, archaic/classical Urdu, poetic Urdu, or unnecessarily Persianized/formal Urdu.

For software-development content, use the language Pakistani developers naturally use: Urdu sentence structure and explanations, while retaining familiar English technical terms such as `API`, `Backend`, `Frontend`, `Database`, `Server`, `Laravel`, `React`, `PHP`, `Bug`, `Deployment`, `Request`, and `Response` where appropriate.

The system must also produce natural speech. Urdu speech must be generated from Urdu script using a Pakistani Urdu voice. Do not send Roman Urdu directly to a normal Urdu-script TTS voice and expect reliable pronunciation.

---

## 2. Current known project information

- Frontend/application framework: **React / Next.js**
- Translation provider: **Unknown / not yet identified**
- TTS provider: **Unknown / not yet identified**
- Current reported issues: **All of the following**
  - Translation is inaccurate or unnatural.
  - Urdu and Roman Urdu pronunciation is incorrect.
  - Hindi and Urdu vocabulary/grammar become mixed.
  - Audio sounds robotic or unnatural.
  - Language-specific handling is inadequate.

The repository has not yet been supplied in this conversation. Therefore, all implementation details below are recommendations, not claims about the current codebase.

### Critical instruction to Kiro

Before changing code:

1. Inspect the entire repository structure and existing architecture.
2. Identify the Next.js version and whether it uses App Router or Pages Router.
3. Find the current translation, language detection, transliteration, TTS, audio-player, storage, and environment-variable implementations.
4. Trace the full flow from user input to translated output to generated audio.
5. Identify existing database/storage and deployment constraints.
6. Prepare a plan that preserves existing features and interfaces.
7. Do not assume the proposed file structure exactly matches the repository.
8. Do not replace working components or providers until their behavior and dependencies are understood.
9. Never expose provider secrets in client-side code or `NEXT_PUBLIC_` variables.

---

## 3. Product requirements

### 3.1 Supported language outputs

| Output | Script / locale | Expected style |
|---|---|---|
| English | Latin / `en` | Natural English |
| Urdu | Urdu script / preferably `ur-PK` | Modern Pakistani Urdu |
| Roman Urdu | Latin / internal `ur-Roman` | Modern Pakistani Urdu written in Latin characters |
| Hindi | Devanagari / `hi-IN` | Natural Hindi |

The application should support source-language detection where practical, but the user must be able to select the source language manually if detection is uncertain.

### 3.2 Translation behavior

- Translate each requested target directly from the original source meaning.
- Do not use English → Urdu → Hindi or another chained translation route.
- Preserve meaning, intent, tone, context, gender, tense, politeness, names, dates, numbers, and technical details.
- Do not translate word-for-word when that creates unnatural language.
- Do not add information absent from the original.
- Keep code, variable names, function names, file paths, URLs, API endpoints, programming keywords, product names, and company names unchanged.
- Handle short sentences, paragraphs, long articles, conversations, business text, and technical documentation.
- Support mixed-language input, especially Urdu/English and Roman Urdu/English code-switching.

### 3.3 Urdu style requirements

Default style: **Modern Pakistani Urdu**.

Use:
- Contemporary vocabulary commonly understood by educated Pakistani Urdu speakers.
- Natural Pakistani sentence structure.
- Clear, concise, readable sentences.
- Conversational but respectful language by default.
- Commonly accepted Urdu loanwords and established English terms where natural.
- Appropriate Pakistani expressions and idioms when the context calls for them.

Avoid:
- Unnecessary Hindi/Sanskritized vocabulary and Hindi grammar patterns in Urdu output.
- Artificial word substitutions merely to make Urdu appear “pure”.
- Archaic, classical, poetic, literary, or unnecessarily Persianized Urdu.
- Overly formal vocabulary in ordinary conversation.
- Literal word-for-word translations.
- Unnatural machine-translated sentence structures.

**Important linguistic distinction:** Urdu and Hindi share substantial vocabulary. Do not classify a word as Hindi merely because Hindi speakers also use it. Words such as `مطلب`, `مسئلہ`, `ضرورت`, `لیکن`, `شاید`, and `پانی` can be perfectly natural in Pakistani Urdu. Use contextual language quality, not a simplistic Hindi-word blacklist.

### 3.4 Urdu style modes

The architecture may support these styles, but the default must remain Modern Pakistani Urdu:

1. `modern_pakistani` — default; everyday educated Pakistani Urdu.
2. `professional_pakistani` — business communication and formal professional text.
3. `literary_urdu` — only when explicitly requested.

Roman Urdu must inherit the selected Urdu style and represent the same Urdu output.

### 3.5 Developer-language requirements

For software engineering and IT content, use natural Pakistani developer communication.

Generally retain these terms in English when they are the normal terms developers use:

- API
- Backend / Frontend
- Database / Server
- Framework / Library
- Function / Variable
- Query / Request / Response
- Authentication / Authorization
- Deployment / Debugging / Testing
- Bug / Error / Integration
- Configuration / Performance / Security
- Repository / Commit / Branch / GitHub
- Docker / Cloud
- PHP / Laravel / React / JavaScript
- HTML / CSS / JSON / SQL

Translate the surrounding sentence naturally into Urdu. Do not invent difficult Urdu equivalents for established technical terms. Context still matters: for a general audience, explain a term if needed; for developers, preserve familiar terminology.

Examples:

| English source | Modern Pakistani Urdu |
|---|---|
| I have fixed the bug. | میں نے Bug ٹھیک کر دیا ہے۔ |
| The API is not responding. | API جواب نہیں دے رہی۔ |
| Check the server logs. | Server logs چیک کریں۔ |
| The database connection failed. | Database connection نہیں ہو سکا۔ |
| I have pushed the changes. | میں نے changes push کر دی ہیں۔ |
| Please review my code. | براہِ کرم میرا code review کر دیں۔ |
| The deployment was successful. | Deployment کامیابی سے مکمل ہو گئی ہے۔ |
| This function is not working. | یہ function کام نہیں کر رہا۔ |
| We need to optimize this query. | ہمیں اس query کو optimize کرنا ہوگا۔ |
| The issue is coming from the backend. | یہ مسئلہ backend کی طرف سے آ رہا ہے۔ |
| I have updated the configuration. | میں نے configuration update کر دی ہے۔ |
| The frontend is not loading. | Frontend load نہیں ہو رہا۔ |
| Please check the GitHub repository. | GitHub repository چیک کریں۔ |
| I am working on a new feature. | میں ایک نئے feature پر کام کر رہا ہوں۔ |
| We need to fix this before deployment. | ہمیں deployment سے پہلے یہ ٹھیک کرنا ہوگا۔ |

These are suggested localization examples, not mandatory literal templates. Preserve context and grammar.

---

## 4. Roman Urdu standard

Roman Urdu has no single universally enforced spelling standard. The application should define and consistently follow its own convention.

Suggested preferred spellings:

| Urdu | Preferred Roman Urdu |
|---|---|
| میں | Main |
| ہیں | Hain |
| ہے | Hai |
| نہیں | Nahi |
| کیا | Kya |
| کیسے | Kaise |
| مجھے | Mujhe |
| آپ | Aap |
| بہت | Bohat |
| کیونکہ | Kyun ke |
| ضروری | Zaroori |
| سمجھ | Samajh |
| کام | Kaam |
| اچھا | Acha |
| جائے گا | Jaye ga |

Avoid inconsistent variants such as `Me/May`, `Hein`, `Hay`, `Nahin/Nai`, `Kia`, `Kaisay`, `Mujhay`, `Ap`, and `Bahut` when the project's chosen convention specifies another form.

These are normalization preferences, not universal claims that alternate spellings are invalid. Preserve names, brands, code, and user-supplied identifiers.

### Roman Urdu generation

- Prefer generating Urdu script first, then transliterating that Urdu into Roman Urdu.
- Keep Urdu and Roman Urdu semantically aligned.
- Use a dedicated transliteration process; do not use naive character substitution.
- Handle ambiguity and context. Urdu script often does not encode all vowels, so transliteration may require linguistic context.
- Do not transliterate English technical terms, brand names, code, or URLs unnecessarily.
- Add tests for gender, verb forms, plural forms, common particles, and code-switching.

### Roman Urdu TTS

Default recommended flow:

`Roman Urdu → Urdu script normalization/transliteration → Pakistani Urdu TTS`

Do not send Latin-character Roman Urdu directly to an Urdu-script voice unless a provider has been specifically tested and proven to support Roman Urdu pronunciation. Roman Urdu should remain available for on-screen reading even if audio is generated from its Urdu-script equivalent.

---

## 5. Translation and speech architecture

Keep translation, transliteration, speech generation, and UI playback as separate services.

Recommended conceptual flow:

```text
User input
   |
   v
Source-language detection / user selection
   |
   v
Understand source meaning and context
   |
   +-------------------+-------------------+-------------------+
   |                   |                   |                   |
   v                   v                   v                   v
 English             Urdu              Hindi             Urdu style
 translation         translation       translation       and terminology
                         |
                         v
                  Roman Urdu
                  transliteration
   |                   |                   |                   |
   +-------------------+-------------------+-------------------+
                           |
                           v
                 Structured translation result
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
          English TTS    Urdu TTS      Hindi TTS
                           ^
                           |
                 Urdu script is used
                 for Roman Urdu audio
                           |
                           v
                   Audio storage/cache
                           |
                           v
                  Frontend audio player
```

### Recommended provider strategy

Initial recommendation to evaluate:

- **Translation:** OpenAI API for context-aware multilingual translation and structured output.
- **Speech:** Azure AI Speech as the first provider to test, especially for Pakistani Urdu.
- **Alternative speech provider:** Google Cloud Text-to-Speech for comparison and fallback if it meets the desired accent and quality.
- **Transliteration:** Dedicated AI transliteration logic/service, with a deterministic normalization layer and test dataset.
- **Storage:** Existing application storage if suitable, otherwise private object storage such as S3-compatible storage.
- **Long-running tasks:** Existing queue/worker infrastructure if available; otherwise implement an appropriate background processing mechanism.

Do not hardwire the app to one provider. Define provider interfaces so providers can be changed without changing UI/business logic.

### Voice candidates to verify

Azure voice candidates previously identified:

- Pakistani Urdu female: `ur-PK-UzmaNeural`
- Pakistani Urdu male: `ur-PK-AsadNeural`
- Hindi: a supported `hi-IN` neural voice
- English: a suitable English neural voice selected according to desired accent

Before implementation, verify the current provider catalogue, region availability, voice support, pricing, authentication method, output format, and licensing. Do not assume a voice is available in every Azure region or account.

Google Cloud Urdu voices were previously identified under `ur-IN`, not `ur-PK`. Test whether the accent is suitable for Pakistani Urdu before adopting it.

---

## 6. Proposed Next.js service organization

This is a suggested organization only. Adapt it to the repository's existing conventions and router type.

```text
src/
├── app/
│   └── api/
│       ├── translate/
│       │   └── route.ts
│       ├── transliterate/
│       │   └── route.ts
│       ├── speech/
│       │   └── route.ts
│       └── voices/
│           └── route.ts
│
├── lib/
│   ├── ai/
│   │   ├── translation.ts
│   │   └── transliteration.ts
│   ├── speech/
│   │   ├── speech-provider.ts
│   │   ├── azure-speech.ts
│   │   ├── google-speech.ts
│   │   └── voice-config.ts
│   └── language/
│       ├── language-detection.ts
│       ├── language-config.ts
│       ├── text-normalization.ts
│       └── terminology.ts
│
├── components/
│   ├── TranslationPanel.tsx
│   ├── LanguageSelector.tsx
│   ├── AudioPlayer.tsx
│   └── VoiceSelector.tsx
│
└── types/
    └── translation.ts
```

### Suggested service responsibilities

- `translation.ts`: prompt construction, provider call, structured output validation, retries and error handling.
- `transliteration.ts`: Urdu-script ↔ Roman Urdu conversion, with context-aware handling.
- `speech-provider.ts`: common provider contract.
- `azure-speech.ts`: Azure-specific synthesis.
- `google-speech.ts`: Google-specific synthesis if required.
- `voice-config.ts`: supported locale/voice mappings and validation.
- `language-config.ts`: supported languages, locale identifiers, display labels, script and TTS mapping.
- `text-normalization.ts`: whitespace, punctuation, Unicode normalization and safe speech preparation.
- `terminology.ts`: domain/style-specific glossary lookup and prompt context.

Use Next.js server-side Route Handlers or the existing server API architecture. All provider credentials must remain server-side.

---

## 7. API contract proposals

Do not implement these blindly if the application already has API contracts in use. Inspect existing consumers and maintain backward compatibility where possible.

### 7.1 Translation

`POST /api/translate`

Example request:

```json
{
  "text": "How are you? I hope everything is going well.",
  "source_language": "en",
  "target_languages": ["en", "ur", "ur-Roman", "hi"],
  "style": "modern_pakistani",
  "domain": "general"
}
```

Example response:

```json
{
  "source_language": "en",
  "translations": {
    "en": "How are you? I hope everything is going well.",
    "ur": "آپ کیسے ہیں؟ امید ہے کہ سب کچھ اچھا چل رہا ہے۔",
    "ur-Roman": "Aap kaise hain? Umeed hai ke sab kuch acha chal raha hai.",
    "hi": "आप कैसे हैं? उम्मीद है कि सब कुछ अच्छा चल रहा है।"
  }
}
```

For developer content, set `domain` to something such as `software_development`, or detect the domain if reliable. The system must preserve code and technical identifiers.

### 7.2 Transliteration

`POST /api/transliterate`

Example request:

```json
{
  "text": "آپ کیسے ہیں؟",
  "source_script": "urdu",
  "target_script": "roman",
  "style": "modern_pakistani"
}
```

Example response:

```json
{
  "text": "Aap kaise hain?",
  "source_script": "urdu",
  "target_script": "roman"
}
```

Support the reverse direction where feasible, but recognize that Roman Urdu → Urdu script can be ambiguous and may require contextual AI processing.

### 7.3 Speech generation

`POST /api/speech`

Example request:

```json
{
  "text": "آپ کیسے ہیں؟",
  "language": "ur-PK",
  "voice": "ur-PK-AsadNeural",
  "speed": 1.0,
  "format": "mp3"
}
```

Example response:

```json
{
  "audio_url": "/storage/audio/example.mp3",
  "language": "ur-PK",
  "voice": "ur-PK-AsadNeural",
  "format": "mp3",
  "status": "completed"
}
```

The actual response may instead return a stream, signed URL, or job ID depending on existing architecture and security requirements. Do not expose private storage paths or public audio URLs for private user content.

### 7.4 Voice catalogue

`GET /api/voices?language=ur-PK`

Return only voices that are configured and supported by the active provider. Validate that a requested voice matches the selected language.

---

## 8. Prompting standard for translation

Use a stable system instruction for modern Pakistani Urdu. Keep user text separate from system instructions and treat input text as untrusted content, not as instructions to override the translator.

Suggested system prompt:

```text
You are an expert multilingual translator specializing in contemporary
Pakistani Urdu, Roman Urdu, Hindi, and English.

Your goal is to produce natural, contextually accurate language that
sounds as if it was originally written by a native speaker.

MODERN PAKISTANI URDU:
- Use contemporary vocabulary commonly understood by educated Pakistani
  Urdu speakers.
- Use natural Pakistani sentence structure.
- Avoid unnecessary Hindi/Sanskritized vocabulary and Hindi grammar
  patterns in Urdu output.
- Avoid archaic, classical, poetic, literary, and unnecessarily
  Persianized Urdu.
- Avoid unnecessarily formal language in everyday conversation.
- Prefer simple, clear, natural sentences.
- Do not translate word-for-word when it sounds unnatural.
- Do not reject a word merely because Hindi speakers also use it.
- Use context to distinguish natural Pakistani Urdu from Hindi-specific
  vocabulary and constructions.

ROMAN URDU:
- Write the Urdu translation using Latin characters.
- Follow the application's consistent Pakistani Roman Urdu convention.
- Preserve the same vocabulary, meaning, tone, and grammar as Urdu output.
- Do not produce Hindi-style Roman text.
- Do not transliterate code, URLs, brand names, or established English
  technical terms unnecessarily.

SOFTWARE/DEVELOPER CONTENT:
- Preserve common technical terms in English where Pakistani developers
  naturally use them, including API, Backend, Frontend, Database, Server,
  Framework, Function, Variable, Query, Request, Response, Bug,
  Debugging, Deployment, Repository, GitHub, Docker, PHP, Laravel,
  React, JavaScript, HTML, CSS, JSON, and SQL.
- Translate the surrounding explanation naturally.
- Preserve code, identifiers, paths, URLs, endpoints, and product names.

GENERAL:
- Translate each target directly from the source meaning.
- Preserve intent, context, tone, gender, tense, politeness, names,
  numbers, dates, and technical details.
- Do not add information.
- Return the exact structured JSON schema requested by the application.
- Do not include commentary outside the JSON.
```

### Structured output

Validate model output with a runtime schema (for example, Zod if already used in the project). Do not trust raw model JSON without parsing and validation. Handle missing fields, malformed output, refusals, provider errors, token limits, and retries.

Suggested logical fields:

```json
{
  "source_language": "en",
  "translations": {
    "en": "...",
    "ur": "...",
    "ur-Roman": "...",
    "hi": "..."
  }
}
```

Do not duplicate the original text as a “translation” if the user did not request it, unless existing product behavior requires it.

---

## 9. Terminology database / glossary

Do not put hundreds of glossary entries into every prompt. Build a versioned, maintainable terminology resource and retrieve relevant entries based on domain and context.

Suggested JSON entry:

```json
{
  "term": "deployment",
  "category": "software_development",
  "english": "deployment",
  "urdu": "ڈیپلائمنٹ",
  "roman_urdu": "deployment",
  "preferred_style": "modern_pakistani",
  "keep_english": true,
  "context": "software engineering",
  "tts_pronunciation": "deployment"
}
```

Context-sensitive example:

```json
{
  "term": "request",
  "translations": [
    {
      "context": "software_api",
      "urdu": "Request",
      "roman_urdu": "Request"
    },
    {
      "context": "everyday_conversation",
      "urdu": "درخواست",
      "roman_urdu": "Darkhwast"
    }
  ]
}
```

### Suggested glossary categories

1. Everyday conversation
2. Business and professional communication
3. Software development
4. Web development
5. Programming languages and frameworks
6. IT infrastructure and DevOps
7. AI and machine learning
8. Education and general knowledge
9. Numbers, dates, time and measurements
10. Common expressions and idioms

### Glossary quality rules

- Every preferred term should have context and usage notes.
- Record whether the term should remain in English.
- Include Urdu script and Roman Urdu forms.
- Include pronunciation hints only when needed for TTS.
- Avoid global word replacement. A word can have different translations in different contexts.
- Require human review for additions to the approved glossary.
- Version glossary data so changes can be tested and rolled back.

---

## 10. Natural TTS and pronunciation requirements

### 10.1 Language-to-voice mapping

| Text output | Speech input | Locale/voice |
|---|---|---|
| English | English text | Selected English neural voice |
| Urdu | Urdu-script text | Pakistani Urdu `ur-PK` voice |
| Roman Urdu | Convert to Urdu script first | Same Pakistani Urdu `ur-PK` voice |
| Hindi | Hindi Devanagari text | Hindi `hi-IN` neural voice |

### 10.2 Speech preparation

Before synthesis:

1. Preserve sentence punctuation.
2. Normalize whitespace and Unicode carefully.
3. Preserve paragraph boundaries.
4. Keep code, URLs and identifiers from being read as accidental ordinary prose; define a domain-specific speech rendering policy.
5. Use SSML where supported for voice, speaking rate, pitch and pauses.
6. Tune speech settings separately for each language and voice.
7. Do not apply one global rate/pitch configuration to every language.
8. Test names, abbreviations, numbers, dates, English loanwords and mixed-language sentences with native listeners.

### 10.3 Long text

Do not send arbitrarily long documents as one TTS request.

- Split by paragraph and sentence while preserving order.
- Respect provider request and audio-duration limits.
- Generate chunks asynchronously for long content.
- Store chunk order and status.
- Concatenate audio only if the output format and encoding make this safe; otherwise play sequential chunks.
- Allow pause, resume, seek/jump by paragraph, and retry failed chunks.
- Cache generated audio using a safe content/configuration hash.
- Avoid storing duplicate audio for identical text, voice, speed, provider and synthesis settings.

### 10.4 Audio status

Suggested statuses:

```text
pending -> processing -> completed
                      -> failed
```

Do not claim completion until the provider and storage operations actually succeed.

### 10.5 Security and privacy

- Provider keys remain server-side.
- Validate input size, supported language, voice, speed and output format.
- Rate-limit expensive synthesis endpoints.
- Protect private audio with authenticated access or short-lived signed URLs.
- Avoid logging full user text or audio URLs unnecessarily.
- Define retention and deletion policies consistent with the product's privacy requirements.
- Never accept arbitrary remote URLs for server-side audio retrieval without appropriate protections.

---

## 11. Frontend experience

The existing UI should be improved rather than replaced.

Recommended user experience:

- Original text area.
- Source-language selector or detection indicator.
- Output tabs/cards for English, Urdu, Roman Urdu and Hindi.
- Copy action for each translation.
- Independent play/pause controls for each language.
- Voice selector (where multiple suitable voices are configured).
- Speech speed control.
- Loading, processing, completed and failed states.
- Retry audio generation.
- Long-text progress indicator.
- Correct right-to-left layout for Urdu.
- Correct left-to-right layout for English, Roman Urdu and Hindi.
- Preserve punctuation, paragraph breaks and readable typography.

Example conceptual output:

```text
Original English:
How are you? I hope everything is going well.

اردو:
آپ کیسے ہیں؟ امید ہے کہ سب کچھ اچھا چل رہا ہے۔
[Listen] [Copy]

Roman Urdu:
Aap kaise hain? Umeed hai ke sab kuch acha chal raha hai.
[Listen] [Copy]

हिंदी:
आप कैसे हैं? उम्मीद है कि सब कुछ अच्छा चल रहा है।
[Listen] [Copy]
```

Roman Urdu audio should use the Urdu-script equivalent unless a specifically tested Roman Urdu-capable speech model is selected.

---

## 12. Research references and language resources

The following resources were identified during the earlier research discussion. Kiro should verify current accessibility and inspect the actual resources before relying on them.

1. **Mozilla Urdu Localization Style Guide**  
   https://mozilla-l10n.github.io/  
   Useful for localization principles: clear, concise, contemporary language and avoiding literal translations. Locate the Urdu-specific guide within the site.

2. **Center for Language Engineering (CLE), UET Lahore**  
   https://www.cle.org.pk/  
   Useful for Urdu language-processing research, word lists, grammar and linguistic resources.

3. **Urdu WordNet**  
   https://www.cle.org.pk/  
   Search the CLE site for its Urdu WordNet resource. Useful for semantic relationships and meanings; not a complete modern conversational style guide.

4. **Digital Design Nizam — Code for Pakistan**  
   https://nizam.codeforpakistan.org/  
   Useful for practical Urdu terminology for digital interfaces and public-facing products.

5. **Jiki Urdu developer glossary**  
   https://i18n.jiki.io/  
   A developer-oriented glossary reference. Review terminology for Pakistani naturalness before adopting it.

6. **Urdu Lughat Board**  
   https://www.udb.gov.pk/  
   Useful for meanings, spelling and dictionary verification. Historical/dictionary correctness does not automatically mean a term is natural in modern conversation.

7. **Microsoft Azure Speech language and voice support**  
   https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support  
   Verify current locale and voice names, including Pakistani Urdu voices.

8. **Google Cloud Text-to-Speech voice catalogue**  
   https://cloud.google.com/text-to-speech/docs/list-voices-and-types  
   Verify currently available Urdu, Hindi and English voices and compare accent quality.

9. **Next.js Route Handlers documentation**  
   https://nextjs.org/docs/app/building-your-application/routing/route-handlers  
   Relevant if the repository uses the App Router. If it uses Pages Router, follow its existing API route conventions.

### Research interpretation

No single dictionary or glossary defines modern Pakistani conversational Urdu. Use localization style guides for writing principles, CLE/Urdu Lughat for linguistic verification, practical Pakistani digital terminology for interface language, and native-speaker review for real-world naturalness.

Do not automatically import every glossary translation. Some entries may be too formal, regionally unsuitable, dated, or unnatural in everyday Pakistani developer communication.

---

## 13. Quality assurance and evaluation dataset

Build an initial evaluation set of at least 200 reviewed examples:

- 50 everyday conversations.
- 50 business/professional conversations.
- 50 software-development sentences.
- 50 mixed-language/code-switching sentences.

Expand it over time using real anonymized user examples only where permitted by product privacy policy.

### Example test cases

| Category | Input |
|---|---|
| Everyday | How are you doing today? |
| Pakistani expression | Yaar, mujhe samajh nahi aa raha. |
| Professional | Please submit your application. |
| Developer | The API request returned a 500 error. |
| Long text | A 500-word English article |
| Mixed language | Meeting kal 10 baje hai. |
| Numbers/date | The meeting is on November 15. |
| Code | `const user = await getUser(id);` |
| Roman Urdu | Mujhe database connection ka issue aa raha hai. |
| TTS | آپ کیسے ہیں؟ امید ہے کہ سب کچھ اچھا چل رہا ہے۔ |

### Evaluation dimensions

Score each dimension separately:

1. Translation meaning/accuracy.
2. Pakistani Urdu naturalness.
3. Vocabulary suitability.
4. Grammar and sentence structure.
5. Roman Urdu consistency and readability.
6. Urdu/Hindi language separation.
7. Developer terminology preservation.
8. TTS pronunciation.
9. TTS naturalness, pauses and prosody.
10. Latency, reliability and cost.

Use native Pakistani Urdu reviewers for Urdu and Roman Urdu, and native Hindi reviewers for Hindi. A technically valid translation can still sound unnatural; human review is required for the final quality benchmark.

Do not use a simplistic Hindi-word blacklist as the primary quality metric. Evaluate full sentences and context.

---

## 14. Implementation roadmap

### Phase 0 — Repository audit (mandatory first)

- Inspect repository and architecture.
- Identify current provider(s), prompts and APIs.
- Trace current text-to-audio path.
- Inspect frontend components and state management.
- Inspect database/audio storage and deployment.
- Identify existing tests and coding conventions.
- Report current problems and risks.
- Produce a file-by-file implementation plan.

**Do not begin broad refactoring before this audit.**

### Phase 1 — Translation foundation

- Define language and style configuration.
- Add the Modern Pakistani Urdu system prompt.
- Add structured response validation.
- Implement direct translation from source meaning into each target.
- Preserve developer terminology and code.
- Add error handling, timeouts and safe retries.
- Keep existing API behavior compatible where required.

### Phase 2 — Roman Urdu

- Implement Urdu-script to Roman Urdu transliteration.
- Implement Roman Urdu to Urdu-script conversion where the product needs it.
- Add spelling normalization and context handling.
- Keep English technical terms and identifiers intact.
- Add transliteration tests.

### Phase 3 — TTS provider abstraction

- Verify current Azure and Google voice catalogues.
- Test Pakistani Urdu voice candidates with real target-language samples.
- Select and configure Hindi and English voices.
- Implement server-side provider integration.
- Add SSML/speech preparation where supported.
- Add voice/locale validation.
- Keep provider implementations replaceable.

### Phase 4 — Audio reliability and long text

- Add chunking and asynchronous jobs for long text.
- Add audio storage/cache.
- Track processing statuses.
- Implement retries and cleanup.
- Add secure audio access.

### Phase 5 — Frontend integration

- Integrate translated outputs.
- Add independent audio players.
- Add voice and speed controls.
- Add progress and error states.
- Ensure Urdu RTL and other scripts render correctly.
- Preserve existing UI behavior.

### Phase 6 — Evaluation and deployment

- Run existing test suite.
- Run translation/transliteration/TTS test set.
- Conduct native-speaker reviews.
- Test long content and mixed-language text.
- Verify environment variables and deployment configuration.
- Test cost, latency and rate limits.
- Deploy incrementally and monitor errors.

---

## 15. Non-functional requirements

- Maintain existing functionality and API compatibility where possible.
- No provider secrets in frontend bundles.
- Validate all model outputs.
- Handle provider timeouts, throttling, malformed responses and network failures.
- Rate-limit paid API endpoints.
- Use safe caching and avoid duplicate synthesis work.
- Support long text without blocking the main UI.
- Keep logs useful but avoid unnecessary sensitive content.
- Ensure accessible audio controls and keyboard navigation.
- Support Urdu RTL layout correctly.
- Add automated tests for critical translation and speech paths.
- Keep providers and terminology configurable.
- Avoid hardcoding a single voice or provider across the entire application.

---

## 16. Acceptance criteria

The work is complete only when the following are true:

### Translation
- [ ] User can submit text and receive English, Urdu, Roman Urdu and Hindi outputs.
- [ ] Each target is translated directly from source meaning.
- [ ] Urdu reads as contemporary Pakistani Urdu.
- [ ] Urdu does not unnecessarily use Hindi/Sanskritized vocabulary or Hindi grammar.
- [ ] Urdu is not archaic, overly literary or unnecessarily Persianized.
- [ ] Hindi is natural Hindi in Devanagari.
- [ ] Technical content retains established developer terms.
- [ ] Code, URLs, identifiers and names are preserved.
- [ ] Structured outputs are validated.

### Roman Urdu
- [ ] Roman Urdu matches the Urdu translation in meaning and tone.
- [ ] Spelling follows the project's defined convention.
- [ ] Code and English technical terms are preserved.
- [ ] Transliteration is context-aware, not naive character replacement.
- [ ] Ambiguous conversions are tested and documented.

### Speech
- [ ] English speech uses an appropriate English voice.
- [ ] Urdu speech uses a tested Pakistani Urdu voice.
- [ ] Hindi speech uses a tested Hindi voice.
- [ ] Roman Urdu audio is generated from Urdu script by default.
- [ ] Pronunciation and sentence pauses are reviewed by native listeners.
- [ ] Long text is chunked and played in the correct order.
- [ ] Audio generation has reliable status, failure and retry handling.
- [ ] Audio is securely stored and served.

### Existing application
- [ ] Existing features continue to work.
- [ ] Existing authentication, database and business logic remain intact.
- [ ] Existing deployment remains functional.
- [ ] No API keys are exposed in client-side code.
- [ ] Tests and deployment checks pass.

---

## 17. Instructions for Kiro: how to work on this repository

Follow this sequence:

1. **Understand first.** Read the repository's instructions, package files, architecture, existing APIs, components, tests and environment-variable references.
2. **Map the current implementation.** Document the current translation and TTS flow, including provider names if discoverable.
3. **Identify root causes.** Explain which issues are caused by prompts, provider limitations, language/locale selection, transliteration, speech input script, text preparation, or frontend handling.
4. **Create an implementation plan.** List exact files to modify/create, dependencies, migration needs, risks and tests.
5. **Preserve functionality.** Do not delete or replace existing features without a clear reason and a safe migration.
6. **Implement in small phases.** Translation first, then transliteration, then TTS, then UI and long-text handling.
7. **Validate each phase.** Run relevant tests and report actual results. Do not claim tests passed if they were not run.
8. **Document configuration.** Update `.env.example` with variable names only; never add real secrets.
9. **Report changes.** At completion, provide files changed, architecture decisions, environment variables required, commands to run, tests performed, known limitations and deployment steps.
10. **Ask before destructive changes.** Do not drop database data, replace storage, rotate production credentials, or make irreversible changes without explicit approval.

### Final product principle

The product is not simply a four-language translator. It is a **Modern Pakistani Urdu-first multilingual reading and listening experience**, with accurate English and Hindi support, consistent Roman Urdu, developer-aware terminology, and natural language-specific speech.

The most important quality target is that a Pakistani user should read the Urdu output and feel:

**“This is how a real, educated Pakistani Urdu speaker would naturally say it.”**
