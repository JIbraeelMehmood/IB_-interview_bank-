# Audio Integrations — Complete Analysis
**Interview Box | Prepared: 2026-10-21**

---

## Overview

There are **5 audio/voice projects** in the `audio-integrations/` folder. Each targets a different layer of the voice pipeline. Together they cover:

- **Speech-to-text** (STT / transcription) — already wired in via `whisper_server.py`
- **Text-to-speech** (TTS) — 3 separate engines at different quality/complexity tiers
- **Voice cloning** — cloning any voice from a short reference clip
- **Voice conversion** (RVC) — changing the timbre/identity of existing audio
- **Audio demixing** — separating vocals from background music/noise
- **Live translation + dubbing** — full multilingual pipeline

---

## Project 1 — Awaaz (اواز)
**Folder:** `audio-integrations/awaaz/`  
**Type:** Urdu TTS (Text-to-Speech)  
**Source:** https://github.com/noorcs39/awaaz  
**Complexity:** ⭐ (lowest — easiest to integrate)

### What It Does
Converts any Urdu text into natural-sounding Urdu speech using **Microsoft Edge's free neural TTS API**. Provides a desktop GUI (Tkinter) with:
- 2 voices: Asad (male, `ur-PK-AsadNeural`) and Uzma (female, `ur-PK-UzmaNeural`)
- Speed control (Slow / Normal / Fast / Very Fast)
- Pitch control (Low / Normal / High)
- Export to MP3

### How It Works
```
Urdu text in app
      ↓
edge-tts Python library
      ↓
Microsoft Edge Neural TTS cloud API (free, no key needed)
      ↓
MP3 audio file
      ↓
pygame plays it locally
```

### Requirements
```
edge-tts    (pip install edge-tts)
pygame      (pip install pygame)
tkinter     (built into Python)
Internet connection (calls Microsoft's free API)
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **Read questions aloud in Urdu** | When a question card is opened and language is set to Urdu, auto-read the question using `ur-PK-AsadNeural` |
| **Read answers aloud in Urdu** | Read the Urdu answer text to the user while they follow along |
| **Text narration in speaking coach** | When the Speaking Coach tab is active and user selects Urdu, narrate the model answer in Urdu voice |
| **Pronunciation guide** | Play individual Urdu words/phrases to help users practice correct pronunciation |
| **Export Q&A as audio** | Let user export a set of questions + answers as an Urdu MP3 file for offline listening while commuting |

**How to wire in:**  
Add a tiny Flask endpoint in `whisper_server.py` (or a separate `tts_server.py` on port 5052) that accepts `{"text": "...", "voice": "ur-PK-AsadNeural"}` and returns audio bytes. The Interview Box frontend already has the player infrastructure.

**Effort to integrate: Low (1–2 hours)**

---

## Project 2 — Piper
**Folder:** `audio-integrations/piper/`  
**Type:** Offline TTS (Text-to-Speech)  
**Source:** https://github.com/rhasspy/piper (rhasspy/piper)  
**Complexity:** ⭐⭐ (medium — requires model download)

### What It Does
A **fast, offline, local** neural TTS system that generates high-quality speech with no internet required. It uses ONNX models and can run on CPU without a GPU. Supports 30+ languages and 100+ voices. Version included here: `2.0` (master branch).

### How It Works
```
Text input
      ↓
Phonemizer (converts text to phonemes using language-specific rules)
      ↓
VITS neural acoustic model (ONNX format, runs on CPU)
      ↓
HiFi-GAN vocoder
      ↓
WAV audio output (fast, real-time capable on CPU)
```

Key files:
- `src/python_run/piper/` — Python inference library
- `src/python_run/piper/voices.json` — list of all 100+ available voices with download URLs
- `etc/test_voice.onnx` — a bundled test English voice (~27MB)
- `notebooks/` — training guides and ONNX inference examples

### Available Relevant Voices
From `voices.json`, languages relevant to your system:
- **Urdu** — `ur_PK-usman-medium` (male), `ur_PK-riaz-medium` (male)
- **Hindi** — `hi_IN-dhruva-medium` (male)
- **English** — dozens of voices (Amy, Lessac, Ryan, etc.)

### Requirements
```bash
pip install piper-tts    # or build from src/
# First run downloads the voice model (~50–150MB per voice)
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **100% offline TTS** | Unlike Awaaz, works with no internet — critical for exam/interview prep offline use |
| **Urdu + Hindi + English voice** | Read questions and answers in all three languages Interview Box supports |
| **Speed reading** | Piper is fast enough for real-time: ~0.3x RTF on CPU, meaning 1 minute of speech generated in ~18 seconds |
| **Self-contained listening mode** | No external API dependency — fully works on train, plane, offline |
| **Custom voice training** | Training notebooks included — could train a custom Urdu voice on interview-specific vocabulary |

**How to wire in:**  
Add Piper as a second TTS backend in `whisper_server.py`. When the user is offline (detected by health check to Edge API failing), fall back to Piper automatically. Expose a `/tts` endpoint that returns WAV bytes.

**Effort to integrate: Medium (3–5 hours + model download)**

---

## Project 3 — VoxCPM
**Folder:** `audio-integrations/VoxCPM/`  
**Type:** Advanced multilingual TTS + Voice Cloning  
**Source:** https://github.com/OpenBMB/VoxCPM (OpenBMB)  
**Complexity:** ⭐⭐⭐⭐ (high — needs 2B model, GPU recommended)

### What It Does
VoxCPM2 is a **2-billion parameter tokenizer-free TTS model** from OpenBMB (creators of MiniCPM). It is arguably the most advanced open-source TTS system available:
- **30 languages** — Arabic, Hindi, Urdu, English, Chinese, and 26 more
- **Voice cloning** from a short clip (10–30 seconds)
- **Voice design** — describe a voice in text ("calm elderly woman with slight accent") and it creates it
- **Emotion control** — happy, sad, urgent, calm
- **48kHz studio-quality output**
- **LoRA fine-tuning** — can fine-tune on your own voice or specific vocabulary
- **Streaming support** (real-time generation)

Architecture:
```
Text input (any of 30 languages)
      ↓
MiniCPM-4 LLM backbone (language understanding)
      ↓
Diffusion autoregressive decoder (continuous audio generation — no discrete tokens)
      ↓
AudioVAE V2 (encodes/decodes audio at 48kHz with built-in super-resolution)
      ↓
48kHz studio-quality WAV output
```

Key files:
- `src/voxcpm/core.py` — main inference engine
- `src/voxcpm/model/voxcpm2.py` — 2B model definition
- `app.py` — Gradio web interface
- `lora_ft_webui.py` — LoRA fine-tuning web UI
- `conf/voxcpm_v2/` — training configs
- `scripts/train_voxcpm_finetune.py` — fine-tuning script

### Requirements
```bash
pip install voxcpm    # or uv install from pyproject.toml
# Needs ~4GB VRAM GPU for fast inference
# Can run on CPU but very slow (~10x slower than real-time)
# Model download: ~4–8 GB (from HuggingFace)
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **Clone your interviewer's voice** | Record 30 seconds of a real interviewer/teacher and clone it — give the AI coach a real human voice |
| **Urdu/Hindi/English TTS at studio quality** | Best possible quality for all 3 languages Interview Box uses |
| **Emotion-aware answer reading** | Read model answers with appropriate professional tone/emotion |
| **Fine-tune on interview vocabulary** | Train a LoRA on technical interview terms (Laravel, Redis, Docker) for accurate pronunciation |
| **Multi-language conversation** | Generate a mock bilingual interview (English questions, Urdu answers) at human quality |
| **Custom interview persona voice** | Create a consistent AI interviewer voice with a specific personality description |

**How to wire in:**  
Expose a `/vox/synthesize` endpoint. Due to high resource needs, best run on a separate machine or trigger lazily (generate audio in background, notify when ready). The Gradio web UI (`app.py`) is already a usable standalone interface.

**Effort to integrate: High (requires GPU, model download, API wrapper)**

---

## Project 4 — Voice-Pro
**Folder:** `audio-integrations/voice-pro/`  
**Type:** All-in-one AI audio platform (STT + Translation + TTS + Voice Conversion + Demixing)  
**Source:** https://github.com/abus-aikorea/voice-pro  
**Complexity:** ⭐⭐⭐⭐⭐ (highest — full production system)

### What It Does
Voice-Pro is the most comprehensive of all five projects. It is a **Gradio web application** that wraps multiple AI audio models into a unified interface. It is an **ElevenLabs alternative** for video/audio content production.

**Core capabilities:**

| Module | Technology | What It Does |
|--------|-----------|--------------|
| **ASR** (Speech Recognition) | Whisper, Faster-Whisper, Whisper-Timestamped | Transcribe speech to text in 100+ languages |
| **Translation** | Deep-Translator (Azure optional) | Translate transcriptions to 100+ target languages |
| **TTS** | Edge-TTS, F5-TTS, E2-TTS, CosyVoice, Kokoro, Azure | Generate speech from translated text |
| **Voice Cloning** | F5-TTS, CosyVoice, RVC | Clone a voice from a reference clip |
| **Voice Conversion (RVC)** | RVC (Retrieval-based Voice Conversion) | Transform audio to sound like a different person's voice |
| **Vocal Separation** | Demucs, MDX-Net | Separate vocals from music/background |
| **Live Translation** | Whisper + Deep-Translator streaming | Real-time speech translation |
| **Subtitle Generation** | Whisper-Timestamped | Auto-generate SRT/VTT subtitle files |
| **AI Cover** | RVC + Demucs + MDX-Net | Create AI song covers in any voice |
| **YouTube Processing** | yt-dlp | Download and process any YouTube video |

Key source files:
- `app/abus_asr_whisper.py` — Whisper STT integration
- `app/abus_tts_edge.py` — Edge-TTS integration  
- `app/abus_tts_f5.py` — F5-TTS voice cloning
- `app/abus_tts_cosyvoice.py` — CosyVoice integration
- `app/abus_rvc.py` — RVC voice conversion
- `app/abus_demucs.py` — vocal/music separation
- `app/abus_translate_deep.py` — translation pipeline
- `src/demucs/` — full Demucs source
- `cosyvoice/` — full CosyVoice source (with LLM and HiFi-GAN)
- `rvc/infer/` — RVC inference pipeline
- `model/vad/silero_vad.onnx` — Voice Activity Detection model

### How the Full Pipeline Works
```
Input: YouTube URL / audio file / microphone
           ↓
  [VAD] Voice Activity Detection (Silero)
  removes silence, segments speech
           ↓
  [ASR] Whisper transcription → text
           ↓
  [Translation] Deep-Translator → translated text
           ↓
  [TTS] F5-TTS / CosyVoice / Edge-TTS → dubbed audio
           ↓
  [Demix] Demucs → separate original background music
           ↓
  [Mix] Combine dubbed voice + original background
           ↓
  Output: dubbed MP4 video / MP3 audio + SRT subtitles
```

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **Auto-dub interview questions** | Take an English question recording and auto-dub it to Urdu/Hindi with voice cloning |
| **Generate interview audio from text** | Convert any Q&A in the question bank to high-quality spoken audio using CosyVoice |
| **Interview recording analysis** | Record yourself answering, send to Whisper for transcription, compare against model answer |
| **Speaking coach upgrade** | The existing Speaking Coach uses browser STT — replace with Faster-Whisper for much better accuracy |
| **Vocal separation for noisy recordings** | Strip background noise from user microphone recordings before Whisper analysis |
| **Live translation** | Real-time translate a question spoken in English to Urdu on screen while practicing |
| **Generate Urdu subtitle files** | Export Q&A sessions as SRT subtitle files for accessibility |
| **Mock interview video creation** | Create a full practice interview video: AI voice asks question, user records answer, AI dubs feedback |

**How to wire in:**  
Voice-Pro already exposes a Gradio API. The most useful components to extract and expose as HTTP endpoints are:
1. `abus_asr_whisper.py` → better `/transcribe` endpoint (already have basic one)
2. `abus_tts_f5.py` + `abus_tts_cosyvoice.py` → `/tts` with voice cloning
3. `abus_demucs.py` → `/denoise` to clean microphone audio before sending to Whisper

**Effort to integrate: High (modular extraction needed, GPU for full quality)**

---

## Project 5 — Vocal Craft Studio (EchoForge Studio)
**Folder:** `audio-integrations/vocal-craft-studio/`  
**Type:** Browser-based Neural TTS + Voice Cloning  
**Source:** https://github.com/eliudmakd782/vocal-craft-studio  
**Complexity:** ⭐⭐ (low for end-user, high for backend dev)

### What It Does
A **browser-based** (HTML/WebAssembly) TTS and voice cloning platform focused on **Hindi and English**. Key differentiator: runs entirely in the browser with **no server needed** after initial model download.

Features:
- **Zero-shot voice cloning** from 10 seconds of reference audio
- **Hindi (Devanagari) + English support** with Indian English phonetics
- **Code-switching** — handles mixed Hindi/English sentences
- **Emotion transfer** — happy, sad, urgent, calm
- **WebSocket API** for integration
- **Offline operation** after first model load
- **Privacy-first** — no data leaves the browser
- Exports: WAV, OGG, FLAC, PCM

Architecture: React frontend + Rust/WASM neural inference + Web Audio API + IndexedDB caching.

### Integration Potential for Interview Box

| Feature | Enhancement |
|---------|-------------|
| **Hindi TTS directly in browser** | No server needed — embed the WASM module directly in Interview Box for Hindi narration |
| **Voice clone the interview question** | User records 10s sample, system clones to personalize the AI voice to match their style |
| **Offline Hindi/English TTS** | Works without internet or local server — pure browser feature |
| **Privacy-safe voice practice** | Voice data never leaves device — ideal for sensitive interview prep |

**How to wire in:**  
The `index.html` is the complete app. For Interview Box, the most practical approach is to embed it in an `<iframe>` as a standalone "Voice Studio" tab, or extract the WASM module and call its synthesize API from Interview Box's JavaScript.

**Effort to integrate: Medium for iframe embed, High for direct WASM integration**

---

## Combined Architecture — How All 5 Work Together

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERVIEW BOX (interview-box.html)          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Question Bank│    │ Speaking Coach│    │   AI Coach /     │  │
│  │  (Q&A cards) │    │  (mic + STT) │    │   Translation    │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
└─────────┼───────────────────┼─────────────────────┼────────────┘
          │ TTS request       │ STT request          │ TTS + translate
          │                   │                      │
          ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   LOCAL SERVICE LAYER (port 5051/5052)          │
│                                                                 │
│  ┌─────────────────┐     ┌──────────────────────────────────┐  │
│  │  whisper_server │     │       tts_server (proposed)      │  │
│  │   (existing)    │     │                                  │  │
│  │  POST /transcribe│    │  POST /tts                       │  │
│  │  GET  /health   │     │    → Awaaz (edge-tts, online)    │  │
│  │  GET  /progress │     │    → Piper  (offline ONNX)       │  │
│  └─────────────────┘     │    → VoxCPM (GPU, high quality)  │  │
│                           │    → Voice-Pro F5/CosyVoice      │  │
│                           │  POST /clone (voice cloning)     │  │
│                           │  POST /denoise (Demucs)          │  │
│                           └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BROWSER-SIDE (no server needed)                │
│                                                                 │
│  Vocal Craft Studio WASM — Hindi + English TTS in-browser      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Priority Integration Roadmap

### Phase 1 — Quick Wins (1–3 days, no GPU needed)

| Priority | Project | Feature | Effort |
|----------|---------|---------|--------|
| 🔴 High | **Awaaz** | Add Urdu TTS to question cards — "Read aloud" button | 2 hours |
| 🔴 High | **Awaaz** | Auto-read questions/answers when Urdu language selected | 2 hours |
| 🟡 Medium | **Piper** | Offline TTS fallback when no internet | 4 hours + model download |
| 🟡 Medium | **Piper** | Add Hindi TTS (hi_IN-dhruva-medium voice) | 1 hour after Piper setup |

### Phase 2 — Enhanced Experience (1–2 weeks, optional GPU)

| Priority | Project | Feature | Effort |
|----------|---------|---------|--------|
| 🔴 High | **Voice-Pro** | Upgrade Whisper transcription quality using Faster-Whisper | 3 hours |
| 🔴 High | **Voice-Pro** | Denoise microphone audio before Speaking Coach analysis | 2 hours |
| 🟡 Medium | **Vocal Craft Studio** | Embed as "Voice Studio" tab for Hindi TTS in-browser | 3 hours |
| 🟡 Medium | **Voice-Pro** | Export Q&A session as dubbed audio file | 4 hours |

### Phase 3 — Advanced Features (requires GPU, 2–4 weeks)

| Priority | Project | Feature | Effort |
|----------|---------|---------|--------|
| 🟢 Low | **VoxCPM** | Studio-quality Urdu/Hindi TTS at 48kHz | GPU + setup |
| 🟢 Low | **VoxCPM** | Clone interviewer voice for personalized AI coach | GPU + setup |
| 🟢 Low | **Voice-Pro** | Full mock interview video: AI questions + dubbing | GPU + setup |
| 🟢 Low | **Voice-Pro** | Voice cloning for custom AI coach persona | GPU + setup |

---

## Key Technical Notes

### What Already Works (No Changes Needed)
- `whisper_server.py` already handles STT — now auto-starts via `start-interview-box-linux.sh`
- Interview Box already has a browser-based player (`<audio>` and the custom player bar)
- The Speaking Coach already records mic, sends to Whisper, and analyzes speech

### What to Build Next
A `tts_server.py` on port 5052 that:
1. Tries Awaaz (edge-tts) if online
2. Falls back to Piper if offline
3. Returns audio as base64 or streams it

Minimal endpoint:
```python
# tts_server.py
from flask import Flask, request, send_file
import edge_tts, asyncio, io

app = Flask(__name__)

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json
    text  = data.get('text', '')
    voice = data.get('voice', 'ur-PK-UzmaNeural')  # default Urdu female
    rate  = data.get('rate', '+0%')
    
    async def gen():
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                buf.write(chunk['data'])
        buf.seek(0)
        return buf
    
    buf = asyncio.run(gen())
    return send_file(buf, mimetype='audio/mpeg')

if __name__ == '__main__':
    app.run(port=5052)
```

### Hardware Requirements by Project

| Project | CPU Only | GPU Needed | VRAM | Model Size |
|---------|----------|------------|------|------------|
| Awaaz | ✅ Yes (cloud API) | ❌ No | — | 0 (cloud) |
| Piper | ✅ Yes (fast) | ❌ No | — | 50–150 MB/voice |
| VoxCPM | ⚠️ Very slow | ✅ Recommended | 4–8 GB | 4–8 GB |
| Voice-Pro (Whisper) | ✅ Yes | ⚠️ Faster with GPU | 2–4 GB | 300 MB–5 GB |
| Voice-Pro (F5/Cosy) | ⚠️ Slow | ✅ Recommended | 4–6 GB | 2–4 GB |
| Vocal Craft Studio | ✅ Browser WASM | ❌ No | — | 1.8 GB (download once) |

---

## Summary Table

| Project | Best For | Language | Offline? | Quality | Effort |
|---------|----------|----------|---------|---------|--------|
| **Awaaz** | Quick Urdu TTS | Urdu | ❌ (cloud) | Good | ⭐ |
| **Piper** | Offline TTS any language | 30+ incl. Urdu/Hindi | ✅ | Good | ⭐⭐ |
| **VoxCPM** | Studio TTS + voice design | 30 languages | ✅ (with GPU) | Excellent | ⭐⭐⭐⭐ |
| **Voice-Pro** | Full pipeline: STT+translate+dub | 100+ | ✅ (local) | Excellent | ⭐⭐⭐⭐⭐ |
| **Vocal Craft** | Browser Hindi+English TTS | Hindi + English | ✅ (WASM) | Very Good | ⭐⭐ |

The **fastest win** for Interview Box is **Awaaz** — add a "🔊 Read in Urdu" button to question cards in under 2 hours.  
The **highest impact** long-term is **Voice-Pro** — it can handle the full pipeline: record the user, clean audio, transcribe, analyze, and generate high-quality feedback audio in any language.
