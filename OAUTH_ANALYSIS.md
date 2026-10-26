# OAUTH Directory — Complete Analysis
**Interview Box | Prepared: 2026-10-21**

---

## What Is This Folder?

Despite being named "OAUTH", this folder has **nothing to do with OAuth authentication protocol**. It is a collection of **6 open-source AI infrastructure projects** focused on:

- Accessing free LLM (AI language model) APIs without paying
- Routing, pooling, and load-balancing multiple free AI providers
- Running AI models locally with Ollama (fully offline)
- Adding AI intelligence search/research tools to AI agents
- A browser-based Claude/AI coding workbench

Together they form a **complete stack for adding free, powerful AI intelligence to Interview Box** — the AI coach, answer generator, question explainer, and job description analyzer features.

---

## The 6 Projects

| # | Folder | Type | Core Value |
|---|--------|------|-----------|
| 1 | `free-ai-gateway` | TypeScript monorepo + HTTP proxy | Routes requests across 20 free AI providers with failover |
| 2 | `awesome-freellm-apis` | Directory/reference | 516+ free LLM APIs catalogued with config snippets |
| 3 | `freellmpool` | Python library + CLI proxy | 178 free chat routes pooled behind one OpenAI endpoint |
| 4 | `awesome-free-ai-coding` | Directory + HTML browser | 86 live free AI coding offers, probed twice weekly |
| 5 | `scout-intel-mcp` | Python MCP server | Business/market intelligence for AI agents via 6 tools |
| 6 | `Ollama-models` | Model repository | Pre-packaged Ollama models for offline machines |
| 7 | `claude-opus-dev-workbench` | Browser HTML app | In-browser AI coding workbench (single `index.html`) |

---

## Project 1 — free-ai-gateway
**Folder:** `OAUTH/free-ai-gateway/`
**Language:** TypeScript (Node.js 18+), Fastify, Docker
**Source:** github.com/zaber-dev/free-ai-gateway

### What It Does
An **enterprise-grade TypeScript monorepo** that acts as a smart proxy sitting between your app and 20 different free AI providers. You send one OpenAI-format request to it, and it automatically picks the best working free provider, handles failover, rate limits, and retries.

Think of it as: **one URL → access to 20 free AI models**.

### Architecture
```
Your App (Interview Box)
      ↓  POST /v1/chat/completions  (OpenAI format)
free-ai-gateway  (Fastify HTTP proxy, port configurable)
      ↓  CapabilityRouter decides which provider to use
      ↓  CircuitBreaker + QuotaTracker track health
      ├→ Google AI Studio (Gemini 3.8, free)
      ├→ Groq (Llama 3.3, free 30 RPM)
      ├→ Ollama (local, no internet)
      ├→ SambaNova (free)
      ├→ NVIDIA NIM (free)
      ├→ OpenRouter (free models)
      ├→ HuggingFace (free)
      ├→ Cloudflare Workers AI (free)
      └→ ... 12 more providers
```

### Monorepo Packages
| Package | What It Is |
|---------|-----------|
| `packages/core` | Protocol-neutral router engine — 20 provider adapters, circuit breaker, quota tracker, event bus |
| `packages/mcp` | MCP server — exposes AI tools directly to Claude Desktop / Cursor |
| `packages/skills` | SKILL.md installer — adds free AI skills to IDE agents |
| `packages/cli` | Terminal AI assistant + model catalog browser |
| `apps/gateway` | The main HTTP proxy — serves OpenAI-compatible `/v1/chat/completions` |
| `examples/nextjs-chat` | Full Next.js 14 streaming chat demo |
| `examples/collections` | Postman/Bruno API test suites |

### 20 Supported Providers
Google AI Studio, Groq, Ollama (local), SambaNova, NVIDIA NIM, Cohere, OpenRouter, OpenCode Zen, Bazaarlink.ai, aimlapi.com, OVHcloud AI, Voyage AI (embeddings), Jina AI (embeddings), HuggingFace, Cloudflare Workers AI, Google Cloud (translation/STT/TTS), MyMemory (translation), Unstructured.io (docs), Exa AI (web search), Tavily (web search).

### Key Features
- **Capability-Based Routing** — request `model: "auto:tool_calling+structured_output"` and it picks the best healthy provider automatically
- **Circuit Breaker** — failing providers enter cooldown, preventing cascade failures
- **Multi-Key Pool Rotation** — `GROQ_API_KEY=k1,k2,k3` rotates keys with per-key rate limit isolation
- **Sliding-Window Quota Tracking** — tracks RPM, TPM, RPD per provider
- **MCP Server** — works directly inside Claude Desktop, Cursor, as an agent tool
- **Docker Ready** — `docker-compose up` and it runs

### How to Start
```bash
cd OAUTH/free-ai-gateway
npm install
cp .env.example .env
# Add your free API keys (Groq is easiest — free, no credit card)
echo "GROQ_API_KEY=gsk_your_key_here" >> .env
npm run dev
# Gateway now at http://localhost:3000
```

### Integration Potential for Interview Box

| Feature | How It Helps |
|---------|-------------|
| **AI Coach feedback** | Route `explainQuestion()` calls through the gateway — if Google AI is rate limited, auto-falls back to Groq |
| **JD Analysis** | The existing Puter AI for JD analysis is cloud-dependent. Replace with gateway → works offline via Ollama |
| **Answer generation** | Generate Urdu/English explanations using free Gemini or Llama models without paying |
| **Translation** | MyMemory and GCP translation adapters already built in |
| **Zero AI cost** | All 20 providers have free tiers — Interview Box never needs to pay for AI |

**Effort to integrate: Medium (2–4 hours)** — just point `PUTER_API_URL` or add a new `fetch` target to `http://localhost:3000/v1/chat/completions`.

---

## Project 2 — awesome-freellm-apis
**Folder:** `OAUTH/awesome-freellm-apis/`
**Type:** Reference directory (Markdown + code examples)
**Source:** github.com/zukixa/cool-ai-stuff (freellm.net)

### What It Does
A **curated, daily-updated directory** of every free LLM API available — 516+ free APIs from 30+ providers. Each entry includes:
- Rate limits (RPM, RPD, TPM)
- Context window size
- Whether a credit card is required
- One-click config snippets for Claude Code, Cursor, Codex, Aider, etc.
- Direct API key signup links

This is a **reference/research tool**, not code you run.

### Key Contents
```
OAUTH/awesome-freellm-apis/
├── README.md          — 516+ providers catalogued with full details
├── README.zh-CN.md    — Chinese version
├── README.ja.md       — Japanese version
├── README.ko.md       — Korean version
├── code-examples/
│   └── cursor.md      — Copy-paste configs for Cursor
└── assets/
    └── provider-logos-marquee.svg
```

### Notable Free APIs Listed (Most Useful for Interview Box)

| Provider | Models | Free Limits | Card? |
|---------|--------|-------------|-------|
| **Groq** | Llama 3.3 70B, Qwen3.8 | 30 RPM, 14,400 RPD | ❌ No |
| **Google AI Studio** | Gemini 3.8 Flash, Gemini 3.7 | 1500 RPD | ❌ No |
| **Ollama (local)** | Any downloaded model | Unlimited | ❌ No |
| **OpenRouter** | 100+ free models | Varies | ❌ No |
| **HuggingFace** | Llama, Mistral, etc. | Shared pool | ❌ No |
| **Cloudflare Workers AI** | Many models | 10K/day | ❌ No |
| **Cerebras** | Llama 3.3 | Fast inference free | ❌ No |
| **SambaNova** | Llama 4 Scout | Free tier | ❌ No |
| **NVIDIA NIM** | DeepSeek, GLM, Llama | Free tier | ❌ No |
| **Puter (already used!)** | Claude, GPT | Free for browser | ❌ No |

### Integration Potential for Interview Box
This is a **strategy guide**, not code. Use it to:
- Pick which providers to configure in `free-ai-gateway`
- Find fallback providers when Puter AI is down
- Find providers that work with your current `fetch()` calls in `interview-box.html`
- Get ready-to-copy `base_url` + `api_key` + `model` combos

**Direct value:** The `code-examples/cursor.md` shows exactly how to configure any OpenAI-compatible client — the same pattern applies to Interview Box's AI calls.

---

## Project 3 — freellmpool
**Folder:** `OAUTH/freellmpool/`
**Language:** Python 3.11+
**Source:** github.com/0xzr/freellmpool

### What It Does
A **Python library and local proxy** that pools 23 LLM providers with 178 enabled chat routes behind a single OpenAI-compatible endpoint. More focused and lightweight than `free-ai-gateway`. Key differentiators:
- **Keyless start** — can work immediately with no API keys (uses Pollinations, OVHcloud, Kilo Gateway, LLM7 which need no key)
- **443 catalogued models**, 178 enabled routes
- **Local proxy** — runs as `freellmpool serve` and serves `http://localhost:8000/v1`
- **MCP server** — also exposes as an MCP server for AI agents
- **CLI** — `freellmpool ask "your question"` works immediately
- **Spread routing** — distributes load across providers

### How It Works
```
freellmpool serve  →  http://localhost:8000/v1/chat/completions
                           ↓
                  Polls 178 enabled routes across:
                  - Pollinations (keyless)
                  - OVHcloud (keyless)
                  - Kilo Gateway (keyless)
                  - LLM7 (keyless)
                  - Groq (free key)
                  - Google AI Studio (free key)
                  - OpenRouter (free key)
                  - ... 16 more providers
```

### Quick Start (No API Key Needed)
```bash
pip install freellmpool
# Works immediately with no keys via keyless providers:
freellmpool ask "Explain what Redis pub/sub is in simple terms"
# Or as a local proxy:
freellmpool serve
```

### Key Files
```
OAUTH/freellmpool/
├── src/freellmpool/       — Python library source
├── docs/                  — Full documentation
├── integrations/metaswarm — MetaSwarm integration
├── plugins/               — Plugin system
├── scripts/               — Utility scripts
├── .env.example           — All supported provider keys
└── server.json            — MCP server manifest
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **Zero-config AI** | `freellmpool serve` → Interview Box gets AI with no setup, no keys, no payment |
| **Instant AI coach** | Point Interview Box AI calls to `localhost:8000/v1` — works out of the box |
| **Resilient AI** | 178 routes means the app never fails because one provider is down |
| **Python integration** | `from freellmpool import Client` for `whisper_server.py` to call AI directly |
| **MCP for agents** | Can be wired into Claude Desktop to give it access to Interview Box's question bank |

**Effort to integrate: Very Low (30 minutes)** — `pip install freellmpool && freellmpool serve`, then change Interview Box's AI endpoint URL.

**This is the fastest path to free AI for Interview Box.**

---

## Project 4 — awesome-free-ai-coding
**Folder:** `OAUTH/awesome-free-ai-coding/`
**Type:** Reference directory + HTML browser + Python tracker
**Source:** github.com/mvalentsev/awesome-free-ai-coding

### What It Does
A **live-tracked directory of 86 free AI coding offers** — probed twice weekly against each vendor's actual API to verify they still work. Includes:
- Coding agents (opencode, Kilo Code, Google Antigravity, Freebuff)
- LLM APIs with free tier
- Trial offers (with/without credit card)
- Aggregators (one key → many providers)

Key difference from `awesome-freellm-apis`: this focuses **specifically on coding use cases** and includes the actual **browser-based search interface** (`index.html` and `browse.html`).

### Key Contents
```
OAUTH/awesome-free-ai-coding/
├── index.html             — Searchable HTML directory (open in browser)
├── browse.html            — Alternative browse interface  
├── README.md              — Full directory (86 offers)
├── registry.yaml          — Machine-readable registry (342KB)
├── sources.yaml           — All sources tracked
├── providers/             — Per-provider detailed markdown files (100+ providers)
│   ├── groq-free.md       — Groq details
│   ├── google-ai-studio.md — Google AI Studio details
│   ├── openrouter-free.md — OpenRouter details
│   └── ... 100 more
├── models/                — Per-model details
├── configs/               — Ready-to-use config files
│   ├── free-llm.env.example — All provider keys template
│   ├── litellm.yaml       — LiteLLM proxy config (85KB, all providers)
│   ├── claude-code.sh     — Claude Code setup script
│   └── opencode.json      — OpenCode config
└── tests/                 — Automated verification tests
```

### Most Relevant for Interview Box

**Best Free Coding Models (verified working 2026-10-19):**
- `gemini-3.8-flash` — Google AI Studio (free, no card, 1500/day)
- `llama-3.3-70b` — Groq (free, no card, 30 RPM)
- `glm-5.3-flash` — NVIDIA NIM + AIHubMix + Alibaba Cloud
- `deepseek-v4-flash` — Routeway + BazaarLink + FreeInference (Harvard SEAS)
- `mimo-v2.6-flash` — opencode + Freebuff + AIHubMix + Token Harbor

**The `configs/litellm.yaml`** is immediately usable — it configures LiteLLM (a universal AI proxy) with all 86 providers. Drop this file and run LiteLLM to have a production-grade AI gateway instantly.

### Integration Potential for Interview Box
Use the `configs/free-llm.env.example` as your `.env` template — it has every provider key variable with instructions. Use `configs/litellm.yaml` to run LiteLLM as your AI gateway (alternative to `free-ai-gateway`).

**Effort to use: Zero** — just open `index.html` in the browser to research which free AI to use.

---

## Project 5 — scout-intel-mcp
**Folder:** `OAUTH/scout-intel-mcp/`
**Language:** Python 3.11+, FastMCP 3.x
**Source:** github.com/omniologynow-rgb/scout-intel-mcp

### What It Does
A **Model Context Protocol (MCP) server** that gives AI agents 6 structured intelligence tools. Think of it as "Google for AI agents" — instead of returning web pages, it returns clean structured JSON that an AI can reason over.

Connects to: **DuckDuckGo, NewsAPI, Wikipedia, web scraping, social profiles**.

### The 6 Intelligence Tools
```python
1. company_intel(company_name)
   → Returns: name, domain, description, funding, employees, 
              founded, products, competitors, news, confidence_score

2. market_research(query, sector)
   → Returns: market_size, growth_rate, key_players, trends,
              opportunities, threats, data_quality_grade

3. competitive_analysis(company1, company2)
   → Returns: comparison table, strengths/weaknesses,
              market_position, recommendation

4. news_intelligence(query, date_range)
   → Returns: articles with source, date, sentiment, relevance_score

5. person_profile(name, context)
   → Returns: bio, professional_history, publications,
              social_presence, confidence_breakdown

6. web_research(query, depth)
   → Returns: structured summary, sources, data_quality_grade
```

### Architecture
```
Claude Desktop / Cursor / AI Agent
       ↓  MCP Tool Call
scout-intel-mcp server (Python, FastMCP)
       ↓  Aggregates from:
       ├→ DuckDuckGo (web search, no key needed)
       ├→ NewsAPI (headlines, optional key)
       ├→ Wikipedia (structured facts)
       ├→ Web scraper (live page content)
       └→ Social profiles (LinkedIn etc.)
       ↓  Returns Pydantic-validated JSON
       ↓  With per-source confidence breakdowns
       ↓  And data quality grades (A-F)
```

### How to Use
```bash
cd OAUTH/scout-intel-mcp
pip install scout-intel-mcp
# Or from source:
pip install -r requirements.txt

# Start MCP server:
python -m scout_mcp.mcp_server

# Configure in Claude Desktop (~/.config/claude/claude_desktop_config.json):
{
  "mcpServers": {
    "scout-mcp": {
      "command": "python",
      "args": ["-m", "scout_mcp.mcp_server"],
      "cwd": "OAUTH/scout-intel-mcp/src",
      "env": { "NEWS_API_KEY": "optional" }
    }
  }
}
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **Company research for JD analysis** | When user pastes a job description, auto-research the company for context |
| **Interview prep research** | "Research PITB Pakistan Railways" → structured intel about the organization |
| **News about tech topics** | Show recent news about Laravel, AI, DevOps when user opens related questions |
| **Competitive intelligence** | Compare companies users are interviewing at |
| **Question context enrichment** | When asking about a technology, auto-fetch latest news/updates about it |
| **Salary intelligence** | Research market rates for roles mentioned in job descriptions |

**Example direct integration:**
```javascript
// In interview-box.html, when JD is analyzed:
async function enrichJdWithResearch(company) {
  const res = await fetch('http://localhost:5053/mcp/company_intel', {
    method: 'POST',
    body: JSON.stringify({ company_name: company })
  });
  const intel = await res.json();
  // Show: founding year, products, competitors, recent news
  // alongside the JD analysis
}
```

**Effort to integrate: Medium (3–5 hours)** — needs a small HTTP wrapper around the MCP server.

---

## Project 6 — Ollama-models
**Folder:** `OAUTH/Ollama-models/`
**Type:** Pre-packaged model repository (offline)
**Source:** github.com/Pyenb/Ollama-models

### What It Does
A repository of **pre-packaged Ollama models** available for download and offline use. Solves the problem: "I want to run AI models locally but my machine doesn't have internet access."

### Available Models (downloadable)
| Model | Size | Best For |
|-------|------|---------|
| `llama3.1:8B` | 4.1 GB | General text, interviews |
| `llama3.2:3B` | 1.8 GB | Lightweight, fast |
| `llama3.2:1B` | 1.2 GB | Very fast, basic tasks |
| `deepseek-coder-v2:16B` | 5.2 GB | Code questions (Laravel, PHP) |
| `qwen2.5-coder:7B` | 4.3 GB | Code + Chinese text |
| `qwen2.5-coder:14B` | 8.2 GB | High-quality code help |
| `mistral:7B` | 3.6 GB | Good general reasoning |
| `gemma2:9B` | 4.8 GB | Google's model, balanced |
| `nomic-embed-text` | 241 MB | Text embeddings (tiny) |

### How It Works
```bash
# 1. Download model tar.gz from the repo's download links
# 2. Extract to your Ollama models folder:
mv extracted/models /usr/share/ollama/.ollama/models
# 3. Run without internet:
ollama run llama3.2
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **100% offline AI** | Interview Box works on airplane/train with no internet — local Llama handles AI coach |
| **Privacy** | Interview answers never leave the machine — fully private |
| **PHP/Laravel Q&A** | `deepseek-coder-v2` or `qwen2.5-coder` is specifically good at Laravel/PHP code questions |
| **Free forever** | No API quotas, no rate limits, no cost after one-time download |
| **Combine with freellmpool** | `freellmpool` already supports Ollama as a backend — add `OLLAMA_BASE_URL=http://localhost:11434` |

**How to wire in:**
1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Download model: `ollama pull llama3.2:3b` (or use offline packages from this repo)
3. Add to freellmpool: `freellmpool init` → select Ollama as a provider
4. Interview Box → `freellmpool serve` → Ollama → local AI response

---

## Project 7 — claude-opus-dev-workbench
**Folder:** `OAUTH/claude-opus-dev-workbench/`
**Type:** Browser HTML app (single `index.html`)
**Source:** github.com/ilhamnurrachman/claude-opus-dev-workbench

### What It Does
A **browser-based AI coding workbench** built as a single `index.html` file. Named "OptiMind Nexus" in the UI, it provides:
- Semantic context engine for codebase understanding
- Adaptive code synthesis in 40+ languages
- Multilingual interface (15 human languages including Hindi, Arabic)
- Terminal-style interface with AI pair programming
- Session memory and context persistence
- Privacy-focused (local-first design)

### Key Files
```
OAUTH/claude-opus-dev-workbench/
├── index.html    — Complete app (25KB, single file like Interview Box)
├── preview.svg   — Interface screenshot
└── README.md     — Full documentation
```

### Integration Potential for Interview Box
This is a **standalone tool** rather than something to integrate directly. Its value:
- **Reference implementation**: Shows how to build a clean AI chat interface in pure HTML/CSS/JS — same pattern as Interview Box
- **Companion tool**: Open alongside Interview Box for quick AI coding help during interview prep
- **UI patterns**: Its adaptive terminal rendering and multilingual support patterns can inspire Interview Box improvements

**Effort to integrate: Low (as companion)** — just open it in another browser tab.

---

## How All 7 Projects Work Together

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERVIEW BOX (interview-box.html)          │
│                                                                 │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────┐│
│  │AI Coach  │  │JD Analyzer  │  │Explainer │  │Translation   ││
│  │feedback  │  │+ Research   │  │          │  │              ││
│  └────┬─────┘  └──────┬──────┘  └────┬─────┘  └──────┬───────┘│
└───────┼───────────────┼──────────────┼────────────────┼────────┘
        │               │              │                │
        └───────────────┼──────────────┘                │
                        ↓                               ↓
              ┌─────────────────────┐    ┌──────────────────────┐
              │   AI GATEWAY LAYER  │    │  scout-intel-mcp     │
              │                     │    │  (research tool)     │
              │  Option A:          │    │                      │
              │  freellmpool serve  │    │  company_intel()     │
              │  port 8000          │    │  news_intelligence() │
              │                     │    │  web_research()      │
              │  Option B:          │    └──────────────────────┘
              │  free-ai-gateway    │
              │  port 3000          │
              └──────────┬──────────┘
                         ↓
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
   ┌──────────┐   ┌──────────┐   ┌──────────────┐
   │  Groq    │   │ Google   │   │  Ollama      │
   │  (cloud) │   │ AI Studio│   │  (LOCAL)     │
   │  Free    │   │  (cloud) │   │  Llama 3.2   │
   │  30 RPM  │   │  Free    │   │  DeepSeek    │
   └──────────┘   └──────────┘   └──────────────┘
```

**Reference projects** (awesome-freellm-apis, awesome-free-ai-coding) guide which providers to pick and how to configure them.

---

## Priority Integration Plan

### Phase 1 — Today (30 minutes, free AI immediately)

```bash
pip install freellmpool
freellmpool serve &
# Interview Box now has AI at localhost:8000
```

Then in `interview-box.html`, change the AI endpoint from Puter to:
```javascript
const AI_ENDPOINT = 'http://localhost:8000/v1/chat/completions';
const AI_MODEL    = 'auto';  // freellmpool picks best free model
```

This gives you: free AI, 178 routes, auto-failover, no credit card.

### Phase 2 — This Week (2 hours)

1. Add `free-ai-gateway` for enterprise routing with 20 providers + MCP support
2. Install Ollama + pull `llama3.2:3b` for offline fallback
3. Configure `freellmpool` to use Ollama when cloud providers are rate-limited

### Phase 3 — This Month (1 day)

1. Add `scout-intel-mcp` for company research in JD analysis
2. Use `awesome-freellm-apis` configs to add 5+ more free providers
3. Use `awesome-free-ai-coding`'s `litellm.yaml` for a production-grade router

---

## Comparison Summary

| Project | Run It? | Use Case | Effort |
|---------|---------|----------|--------|
| **freellmpool** | ✅ Run locally | Free AI endpoint, start today | ⭐ |
| **free-ai-gateway** | ✅ Run locally | Enterprise router, 20 providers, MCP | ⭐⭐ |
| **awesome-freellm-apis** | 📖 Reference | Which provider to use, config snippets | 0 |
| **awesome-free-ai-coding** | 📖 Reference + HTML | Live-checked coding offers, litellm config | 0 |
| **scout-intel-mcp** | ✅ Run locally | Company/market research for JD analysis | ⭐⭐ |
| **Ollama-models** | ✅ Offline models | 100% offline AI with no internet | ⭐⭐ |
| **claude-opus-dev-workbench** | ✅ Open in browser | Companion AI coding workbench | ⭐ |

## The Single Most Important Takeaway

**Interview Box currently depends on `puter.com` for all AI features** — when that fails (no internet, DNS issue, rate limit), the AI coach is dead. 

Running `freellmpool serve` (one command, one minute) gives Interview Box 178 redundant AI routes from 23 providers. With Ollama added as a local backend, the system works even without internet. This is the **most impactful change possible** for Interview Box's reliability and capability.
