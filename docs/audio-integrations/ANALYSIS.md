# Audio Integrations — Full Analysis (All 11 Projects)
**Interview Box | Updated: 2026-11-05**

This document analyses all 11 audio integration projects found in `docs/audio-integrations/`.
The first 5 (Awaaz, Piper, VoxCPM, Voice-Pro, Vocal Craft Studio) were covered in
`AUDIO_INTEGRATIONS_ANALYSIS.md`. This file covers the 6 new ones.

---

## ⚠️ WARNING — NeuralVoice Studio is NOT a TTS Tool

`NeuralVoice-Studio-AI-Text-to-Speech-with-85-Dialects-Offline-Lightweight` has a misleading
README. The actual `main.py` code is a **Telegram spammer** written in Russian
(`TelegramSpamer` class, Telethon API, hardcoded API keys `api_id = 31972424`).

**Do not use this project. It has nothing to do with TTS.**

---

## The 5 Valid New Projects

---

## Project 6 — gTTS (Google Text-to-Speech)
**Folder:** `audio-integrations/gTTS/`
**Language:** Python
**Source:** https://gtts.readthedocs.io
**Complexity:** ⭐ (lowest — the simplest TTS possible)

### What It Does
Wraps Google Translate's free (undocumented) TTS API. Send text, get an MP3 back.
No API key, no account, no cost. Supports 60+ languages.

```
text → gTTS Python library → Google Translate TTS (free, online) → MP3
```

### Key Facts
- `pip install gTTS` — one command install
- Works immediately: `gTTS("سلام", lang='ur').save('out.mp3')`
- **Urdu**: `lang='ur'` — works perfectly
- **Hindi**: `lang='hi'` — works perfectly
- **English**: `lang='en'` — works perfectly
- Roman Urdu: no native support; use `lang='ur'` with Urdu script
- Online only — calls `translate.google.com`
- Not affiliated with Google Cloud TTS (no billing)
- Rate limits exist but are loose for moderate use
- Voice quality: natural but not as expressive as neural voices

### How to Use
```python
from gtts import gTTS
import io

def gtts_speak(text: str, lang: str = 'ur') -> bytes:
    buf = io.BytesIO()
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.write_to_fp(buf)
    buf.seek(0)
    return buf.read()  # returns MP3 bytes
```

### Integration Value for Interview Box
| Feature | Enhancement |
|---|---|
| Instant Urdu TTS | `gTTS(text, lang='ur')` → Urdu MP3 in 1-2 seconds |
| Instant Hindi TTS | Same with `lang='hi'` |
| Long text | Built-in sentence tokenizer handles unlimited text length |
| Zero setup | One pip install, no model downloads |
| Fallback chain | Use as fallback when edge-tts is rate-limited |

**Add to tts_server.py priority chain:**
Online chain: `edge-tts` → `gTTS` → browser speechSynthesis
Offline chain: `Piper` → browser speechSynthesis

**Effort: 30 minutes** — just add to tts_server.py

---

## Project 7 — Bark (Suno AI)
**Folder:** `audio-integrations/bark/`
**Language:** Python, PyTorch
**Source:** https://github.com/suno-ai/bark
**Complexity:** ⭐⭐⭐ (medium-high — needs GPU or CPU with patience)

### What It Does
Bark is a **transformer-based text-to-audio** model by Suno. Unlike conventional TTS,
it is a **generative audio model** — it can produce:
- Realistic multilingual speech (100+ voice presets)
- Non-verbal sounds: `[laughs]`, `[sighs]`, `[gasps]`, `[clears throat]`
- Music, background noise, sound effects
- Emotional speech (happy, sad, urgent)
- Mixed audio (speech + background)

```
text prompt → Bark (transformer) → audio array (24 kHz WAV)
```

### Key Facts
- **Models**: `suno/bark` (~5 GB total: semantic + coarse + fine + codec models)
- **Languages**: 13 (English, Chinese, German, Spanish, Hindi, etc.)
  - Hindi: yes (`v2/hi_speaker_0` through `_9`)
  - Urdu: not officially — but handles Urdu script with Hindi voice
  - English: 10 male + 10 female presets per language
- **Voice presets**: 100+ built-in presets (`v2/en_speaker_0` ... `v2/en_speaker_9`)
- **GPU**: recommended (4+ GB VRAM). CPU is very slow (~10-15x real-time)
- **Small model**: `use_small=True` — 2-3× faster, slightly lower quality
- **MIT License** — free for commercial use
- No voice cloning (uses presets only, unlike F5-TTS)
- Best for: expressive AI interviewer persona, mock interview coach voice

### Unique Feature: Nonverbal + Emotion
```python
# The AI interviewer voice can sound natural with pauses, laughs, tone
text = """
Thank you for your answer. [clears throat]
Now let me ask you about your experience with Redis cache invalidation.
[sighs] This is actually one of the most common failure points we see.
"""
audio = generate_audio(text, history_prompt="v2/en_speaker_6")
```

### Integration Value for Interview Box
| Feature | Enhancement |
|---|---|
| AI Interviewer voice | Generate realistic interviewer audio with natural tone/emotion |
| Speaking coach model answers | Read out model answers with correct English pronunciation and emphasis |
| Mock interview questions | Pre-generate question audio with interviewer persona voice |
| Non-verbal cues | Add `[clears throat]`, `[laughs]` to make the AI interviewer feel human |
| Hindi voice | Use `v2/hi_speaker_0` for Hindi practice sessions |

### Hardware Reality Check
| Mode | Speed | Quality |
|---|---|---|
| NVIDIA GPU (4+ GB VRAM) | ~1-3 seconds for 10 seconds of audio | Excellent |
| CPU (8-core) | ~2-5 minutes for 10 seconds | Excellent |
| CPU with `use_small=True` | ~30-90 seconds for 10 seconds | Good |

**Verdict**: Best for **pre-generating** question audio files, not real-time. On GPU it's real-time capable.

**Effort: Medium (2-4 hours)** — add `/bark/synthesize` endpoint to tts_server.py

---

## Project 8 — F5-TTS
**Folder:** `audio-integrations/F5-TTS/`
**Language:** Python, PyTorch
**Source:** https://github.com/SWivid/F5-TTS
**Complexity:** ⭐⭐⭐ (medium — needs model download, GPU recommended)

### What It Does
F5-TTS is a **state-of-the-art zero-shot voice cloning** TTS system using **Flow Matching**
(diffusion-based generation). It can clone any voice from a 5-15 second reference clip
with very high fidelity.

```
reference audio (5-15s) + text → F5-TTS (Flow Matching diffusion) → cloned voice audio
```

### Key Facts
- **Model size**: ~1-2 GB (F5-TTS base)
- **Zero-shot cloning**: give it any audio clip, it clones the voice
- **Speed**: with GPU, near-real-time. CPU is slow but works
- **Languages**: English and Chinese primarily. Other languages work with reference audio
- **OpenAI-compatible API**: the SGLang-Omni backend exposes `/v1/audio/speech`
- **Docker support**: `docker build -t f5tts:v1 .`
- **pip install**: `pip install f5-tts`
- **Quality**: among the best open-source voice cloning models available

### Unique Feature: Zero-Shot Cloning
```python
# Clone any voice from a reference clip
import subprocess

# Using the CLI:
# f5-tts_infer-cli \
#   --model F5TTS_v1_Base \
#   --ref_audio "reference_voice.wav" \
#   --ref_text "This is what the reference says" \
#   --gen_text "Text you want to speak in that voice"
```

### OpenAI-Compatible Endpoint (via SGLang-Omni)
```bash
# Start the server (after installing SGLang-Omni):
python -m sglang_omni.launch_server --model-path OpenMOSS-Team/MOSS-TTS-Local-Transformer-v1.5
# Then call:
curl http://localhost:30000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model": "tts", "input": "Hello world", "voice": "alloy"}'
```

### Integration Value for Interview Box
| Feature | Enhancement |
|---|---|
| Clone interviewer voice | Record 15 seconds of any interviewer, clone for the AI coach |
| Custom AI coach persona | Create a consistent voice for the Interview Box AI coach |
| High-quality English TTS | Best quality for generated question audio |
| Pre-generate audio bank | Batch-generate audio for all 2,474 questions with a consistent voice |

**Hardware**: GPU (4+ GB VRAM) recommended. CPU works but slow.

**Effort: Medium (3-5 hours)** — add `/f5/synthesize` endpoint with reference management

---

## Project 9 — MOSS-TTS Family
**Folder:** `audio-integrations/MOSS-TTS/`
**Language:** Python, PyTorch
**Source:** https://github.com/OpenMOSS/MOSS-TTS
**Complexity:** ⭐⭐⭐⭐ (high — large model family, but Nano is easy)

### What It Does
OpenMOSS's TTS family — a complete production-grade speech generation system with 5 models:

| Model | Size | Best For | CPU? |
|---|---|---|---|
| **MOSS-TTS-Nano** | ~100M | Browser/CPU deployment | ✅ Fast on 4 cores |
| **MOSS-TTS-v1.5** | 8B | Long-form narration, voice cloning | GPU needed |
| **MOSS-TTS-Local-Transformer-v1.5** | 4B | Streaming, voice cloning | GPU recommended |
| **MOSS-TTSD** | 8B | Multi-speaker dialogue, podcasts | GPU needed |
| **MOSS-TTS-Realtime** | 1.7B | Real-time voice agents (TTFB: 180ms) | GPU needed |
| **MOSS-SoundEffect-v2** | 1.3B | Sound effects generation | GPU needed |
| **MOSS-VoiceGenerator** | 1.7B | Voice design from text description | GPU needed |

### Key Unique Features
- **Voice design from text**: Describe a voice → get it (`MOSS-VoiceGenerator`)
  ```
  "A calm, mature Pakistani male voice, slightly formal"
  ```
- **Sound effects**: Generate custom sound effects for the interview app
- **OpenAI-compatible API**: `/v1/audio/speech` endpoint via SGLang-Omni or vLLM-Omni
- **48 kHz stereo** output (MOSS-TTS-Local-Transformer-v1.5)
- **TTFB 180ms** real-time (MOSS-TTS-Realtime) — comparable to cloud services
- **llama.cpp support** — quantized GGUF weights, no PyTorch needed
- **Explicit pause control**: `[pause 0.5s]` in text
- **Language tags**: force language in code-switched text

### MOSS-TTS-Nano — The Key for Interview Box
```python
# MOSS-TTS-Nano: ~100M params, runs on 4 CPU cores, streaming output
# This is the only model in the family that works well without GPU
# pip install moss-tts-nano (or use the GitHub repo)
```

### OpenAI-Compatible Serving
```bash
# Via SGLang-Omni:
python -m sglang_omni.launch_server \
  --model-path OpenMOSS-Team/MOSS-TTS-Local-Transformer-v1.5 \
  --port 30000
# Then: POST http://localhost:30000/v1/audio/speech
# Compatible with OpenAI audio SDK
```

### Integration Value for Interview Box
| Feature | Enhancement |
|---|---|
| MOSS-TTS-Nano on CPU | Fast offline TTS, no GPU needed — replaces Piper for quality |
| Sound effects | Add ambient interview sounds (office background, typing, etc.) |
| Voice design | `"Professional Pakistani software engineer interviewer voice"` |
| Real-time dialogue | MOSS-TTS-Realtime enables true real-time AI interviewer |
| Multi-speaker dialogue | MOSS-TTSD for podcast-style Q&A sessions between interviewer + candidate |

**Effort: Medium for Nano (2 hours), High for full pipeline**

---

## Project 10 — LocalVoice Chrome Extension
**Folder:** `audio-integrations/local-voice-chrome-extension/`
**Language:** Python (FastAPI backend) + JavaScript (Chrome extension MV3)
**Source:** Found in audio-integrations folder
**Complexity:** ⭐⭐ (medium — clean API, easy backend setup)

### What It Does
A **Chrome extension + FastAPI backend** for fully local, private TTS.

**Two engines:**
1. **XTTS v2** (default): Zero-shot voice cloning from `.wav`/`.mp3` samples
2. **Kokoro-82M**: Ultra-low latency, built-in premium voices (near real-time on CPU)

**Architecture:**
```
Chrome Extension (right-click → Read Aloud)
       ↓  POST /tts  (base64 WAV back)
FastAPI Backend (http://127.0.0.1:8000)
       ↓
XTTS v2 (voice cloning) or Kokoro-82M (fast)
```

### Key Facts
- **API**: `POST /tts` — `{text, speaker_wav, language, speed}` → base64 WAV
- **GET /voices** — list all voice samples in `backend/voices/`
- **Zero-shot cloning**: drop any `.wav`/`.mp3` in `backend/voices/` → voice available immediately
- **Kokoro mode**: `export LOCALVOICE_ENGINE=kokoro` — ultra-fast, no reference needed
- **Port**: 8000 (same as freellmpool — pick one!)
- **Languages (XTTS)**: English, Spanish, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Czech, Arabic, Chinese (zh-cn)
- **CORS**: only allows `chrome-extension://` origins by default — needs update for web app

### Most Relevant: Kokoro-82M Engine
Kokoro is **by far the easiest engine for Interview Box** in this folder:
- Runs near real-time on CPU (no GPU needed)
- 82M parameters — tiny model, fast download
- Premium quality voices built-in
- No reference audio needed
- `pip install kokoro soundfile`

```python
# Kokoro-82M usage:
from kokoro import KPipeline
pipeline = KPipeline(lang_code='en-us')
audio, sr = pipeline("Hello, this is your AI interviewer speaking.")
# Returns numpy array at 24 kHz
```

### Integration Value for Interview Box
| Feature | Enhancement |
|---|---|
| Kokoro ultra-fast TTS | Real-time English TTS on CPU — add to tts_server.py |
| XTTS voice cloning | Clone interviewer voice from a sample |
| Web API reuse | The existing FastAPI backend can serve Interview Box directly |
| Chrome extension | Users can right-click any interview question on any website and hear it |

**Port conflict**: LocalVoice uses port 8000 (same as freellmpool). Run on 8001 instead.

**Effort: Low for Kokoro (1 hour), Medium for XTTS (2-3 hours)**

---

## How All 11 Projects Work Together — Complete TTS Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  INTERVIEW BOX PWA (browser)                                 │
│                                                                               │
│  Question card "🔊 Read aloud"  →  ttsClient.ts                              │
│  Speaking coach mic             →  Whisper STT (port 5051)                   │
│  Mock interview questions       →  Pre-generated audio bank (Bark / F5-TTS)  │
└──────────────────────┬───────────────────────────────────────────────────────┘
                       │ POST /tts
                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  TTS SERVER — server/tts_server.py (port 5052)               │
│                                                                               │
│  Priority chain (auto-selects best available):                                │
│                                                                               │
│  ONLINE:                                                                      │
│   1. edge-tts (Awaaz)     — Microsoft Neural, free, best Urdu/Hindi quality  │
│   2. gTTS                 — Google Translate TTS, free, 60+ languages        │
│                                                                               │
│  OFFLINE (CPU):                                                               │
│   3. Kokoro-82M           — Ultra-fast, no GPU, English (via LocalVoice)     │
│   4. MOSS-TTS-Nano        — 100M params, multilingual, CPU-friendly          │
│   5. Piper (ONNX)         — 30+ languages, Urdu/Hindi voices, fast on CPU   │
│                                                                               │
│  HIGH QUALITY (GPU):                                                          │
│   6. F5-TTS               — Zero-shot voice cloning, Flow Matching           │
│   7. XTTS v2              — Zero-shot cloning (via LocalVoice backend)       │
│   8. Bark                 — Expressive: laughs, emotions, music              │
│   9. MOSS-TTS-v1.5 (8B)  — Best quality, long-form, voice cloning          │
│   10. Voice-Pro F5/Cosy   — Full pipeline: denoise + TTS + clone            │
│                                                                               │
│  ULTIMATE FALLBACK:                                                           │
│   11. Browser speechSynthesis — Always works, uses installed OS voices       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Priority Integration Matrix

### Start Today (No GPU, Online)
| Engine | Install | Languages | Quality | Use For |
|---|---|---|---|---|
| **gTTS** | `pip install gTTS` | 60+ incl. ur, hi | Good | Urdu/Hindi TTS online |
| **edge-tts** | `pip install edge-tts` | 40+ neural voices | Excellent | Best Urdu/Hindi online |

### This Week (No GPU, Offline)
| Engine | Install | Languages | Quality | Use For |
|---|---|---|---|---|
| **Kokoro-82M** | `pip install kokoro soundfile` | English | Very Good | Fast English TTS offline |
| **Piper** | `pip install piper-tts` | 30+ incl. ur, hi | Good | All languages offline |
| **MOSS-TTS-Nano** | GitHub repo | Multilingual | Good | CPU multilingual offline |

### Advanced (GPU Required)
| Engine | Size | Languages | Unique Feature |
|---|---|---|---|
| **F5-TTS** | ~2 GB | Any (zero-shot) | Clone any voice from 10s clip |
| **XTTS v2** | ~2 GB | 13 languages | Zero-shot cloning |
| **Bark** | ~5 GB | 13+ | Emotions, laughs, music |
| **MOSS-TTS-v1.5** | 8B | Multilingual | Best quality, long-form |
| **MOSS-TTS-Realtime** | 1.7B | Multilingual | 180ms TTFB, real-time agent |

---

## What to Actually Build

### Step 1 — Upgrade tts_server.py (1 day)
Add gTTS + Kokoro as new engines to the existing tts_server.py.
New priority chain: edge-tts → gTTS → Kokoro → Piper → browser

### Step 2 — Bark for Pre-Generated Question Audio (optional, GPU)
Use Bark to pre-generate audio files for the most-used 200 questions.
Store as `/public/audio/bark/{code}.mp3`. The existing player infrastructure picks them up.

### Step 3 — F5-TTS for Custom Coach Voice (optional, GPU)
Record 15 seconds of a chosen interviewer voice.
Use F5-TTS to generate all question audio in that cloned voice.
Result: consistent AI interviewer persona with a real human voice.

### Step 4 — MOSS-TTS-Nano for Cross-Platform (medium effort)
Replace Piper with MOSS-TTS-Nano for better multilingual quality on CPU.
Both serve the `/tts` endpoint identically.

---

## Quick Start Commands

```bash
# Add gTTS to existing tts_server:
pip install gTTS

# Add Kokoro to existing tts_server:
pip install kokoro soundfile

# Install Bark (for pre-generation, needs GPU):
pip install git+https://github.com/suno-ai/bark.git

# Install F5-TTS (for voice cloning):
pip install f5-tts

# Install LocalVoice backend (Kokoro or XTTS):
cd docs/audio-integrations/local-voice-chrome-extension/backend
pip install -r requirements.txt
python server.py
# → API at http://127.0.0.1:8000
```
