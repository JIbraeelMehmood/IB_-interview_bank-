#!/usr/bin/env python3
"""
Interview Box — Unified TTS Server  (port 5052)
================================================
Integrates ALL audio-integration engines into one Flask server.
The PWA calls POST /tts and gets back audio — it never needs to know
which engine was used.

ENGINE PRIORITY CHAIN (auto-selected, first success wins):
──────────────────────────────────────────────────────────
ONLINE (needs internet):
  1. edge-tts  — Microsoft Neural voices. Best Urdu/Hindi quality. Free.
  2. gTTS      — Google Translate TTS. 60+ languages. Free. No key.

OFFLINE — CPU (no internet needed):
  3. Kokoro-82M — Ultra-fast 82M model. English only. Near real-time on CPU.
  4. MOSS-TTS-Nano — 100M multilingual model. Best free offline multilingual.
  5. Piper      — ONNX models. 30+ languages incl. Urdu & Hindi.

OFFLINE — GPU (needs NVIDIA GPU / 4GB VRAM):
  6. F5-TTS    — Zero-shot voice cloning from a reference clip. Best quality.
  7. XTTS v2   — Zero-shot cloning (LocalVoice backend). 13 languages.
  8. Bark      — Expressive: emotions, laughs, music. 13 languages.

ALWAYS AVAILABLE:
  9. Browser speechSynthesis — handled entirely in the frontend (ttsClient.ts)

──────────────────────────────────────────────────────────
INSTALL (pick what you want):

  Minimal (online only):
    pip install flask flask-cors edge-tts gTTS

  Add offline English:
    pip install kokoro soundfile

  Add offline multilingual:
    pip install piper-tts

  Add voice cloning (needs GPU):
    pip install f5-tts
    pip install git+https://github.com/suno-ai/bark.git

  XTTS (via LocalVoice — separate server on port 8001):
    cd docs/audio-integrations/local-voice-chrome-extension/backend
    pip install -r requirements.txt
    LOCALVOICE_ENGINE=xtts uvicorn server:app --port 8001

──────────────────────────────────────────────────────────
API:
  POST /tts
    Body: { "text": "...", "voice": "ur-PK-UzmaNeural",
            "engine": "auto"|"edge"|"gtts"|"kokoro"|"piper"|"f5"|"bark",
            "rate": "+0%", "pitch": "+0Hz",
            "ref_audio": "path/to/reference.wav"  (F5-TTS only) }
    Returns: audio/mpeg or audio/wav

  GET /health
    Returns: { "ok": true, "engines": {...} }

  GET /voices
    Returns: { "edge": [...], "gtts": [...], "piper": [...], ... }

  GET /engines
    Returns: list of available engines with install instructions
"""

import asyncio
import io
import logging
import os
import sys
from typing import Optional

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# ─── App setup ────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "https://*.vercel.app",
])

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("tts")

# ─── Engine detection ─────────────────────────────────────────────────

def _try_import(pkg: str) -> bool:
    try:
        __import__(pkg)
        return True
    except ImportError:
        return False

EDGE_AVAILABLE  = _try_import("edge_tts")
GTTS_AVAILABLE  = _try_import("gtts")
KOKORO_AVAILABLE = _try_import("kokoro")
PIPER_AVAILABLE = _try_import("piper")
F5_AVAILABLE    = _try_import("f5_tts")
BARK_AVAILABLE  = _try_import("bark")

# XTTS / LocalVoice runs as a separate FastAPI server — we proxy it.
XTTS_PROXY_URL  = os.environ.get("XTTS_PROXY_URL", "http://127.0.0.1:8001")

log.info("── TTS Engine Status ─────────────────────────────────────")
log.info(f"  edge-tts  (Awaaz/Microsoft): {'✓' if EDGE_AVAILABLE  else '✗'}")
log.info(f"  gTTS     (Google Translate): {'✓' if GTTS_AVAILABLE  else '✗'}")
log.info(f"  Kokoro-82M     (offline EN): {'✓' if KOKORO_AVAILABLE else '✗'}")
log.info(f"  Piper     (offline 30+ lang):{'✓' if PIPER_AVAILABLE else '✗'}")
log.info(f"  F5-TTS  (voice clone, GPU):  {'✓' if F5_AVAILABLE    else '✗'}")
log.info(f"  Bark      (expressive, GPU): {'✓' if BARK_AVAILABLE  else '✗'}")
log.info("──────────────────────────────────────────────────────────")

ANY_AVAILABLE = any([EDGE_AVAILABLE, GTTS_AVAILABLE, KOKORO_AVAILABLE,
                     PIPER_AVAILABLE, F5_AVAILABLE, BARK_AVAILABLE])

if not ANY_AVAILABLE:
    log.warning("No TTS engine found. Minimal install: pip install flask flask-cors edge-tts gTTS")

# ─── Voice maps ───────────────────────────────────────────────────────

# Map app language codes → edge-tts voice names
EDGE_VOICES = {
    "ur":     "ur-PK-UzmaNeural",
    "ur-m":   "ur-PK-AsadNeural",
    "hi":     "hi-IN-SwaraNeural",
    "hi-m":   "hi-IN-MadhurNeural",
    "en":     "en-US-JennyNeural",
    "en-in":  "en-IN-NeerjaNeural",
    "en-gb":  "en-GB-SoniaNeural",
    "en-au":  "en-AU-NatashaNeural",
}

# Map edge-tts voice names → gTTS lang codes
GTTS_LANG_MAP = {
    "ur-PK-UzmaNeural":   "ur",
    "ur-PK-AsadNeural":   "ur",
    "hi-IN-SwaraNeural":  "hi",
    "hi-IN-MadhurNeural": "hi",
    "en-US-JennyNeural":  "en",
    "en-IN-NeerjaNeural": "en",
    "en-GB-SoniaNeural":  "en",
}

# Map edge-tts voice names → piper model names
PIPER_VOICE_MAP = {
    "ur-PK-UzmaNeural":   "ur_PK-usman-medium",
    "ur-PK-AsadNeural":   "ur_PK-riaz-medium",
    "hi-IN-SwaraNeural":  "hi_IN-dhruva-medium",
    "hi-IN-MadhurNeural": "hi_IN-dhruva-medium",
    "en-US-JennyNeural":  "en_US-lessac-medium",
    "en-IN-NeerjaNeural": "en_US-lessac-medium",
    "en-GB-SoniaNeural":  "en_GB-alan-medium",
}

# Bark voice presets
BARK_VOICE_MAP = {
    "en-US-JennyNeural": "v2/en_speaker_9",
    "en-GB-SoniaNeural": "v2/en_speaker_3",
    "hi-IN-SwaraNeural": "v2/hi_speaker_3",
    "hi-IN-MadhurNeural":"v2/hi_speaker_0",
    # Urdu not officially supported in Bark; use Hindi voice as closest
    "ur-PK-UzmaNeural":  "v2/hi_speaker_3",
    "ur-PK-AsadNeural":  "v2/hi_speaker_0",
}

# ─── Engine 1: edge-tts (Awaaz / Microsoft Neural) ────────────────────

async def _edge_generate(text: str, voice: str, rate: str, pitch: str) -> Optional[bytes]:
    if not EDGE_AVAILABLE:
        return None
    import edge_tts  # type: ignore
    try:
        comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        buf = io.BytesIO()
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        buf.seek(0)
        data = buf.read()
        return data if data else None
    except Exception as e:
        log.warning(f"edge-tts failed (voice={voice}): {e}")
        return None

def edge_generate(text: str, voice: str, rate="+0%", pitch="+0Hz") -> Optional[bytes]:
    return asyncio.run(_edge_generate(text, voice, rate, pitch))

# ─── Engine 2: gTTS (Google Translate TTS) ────────────────────────────

def gtts_generate(text: str, voice: str) -> Optional[bytes]:
    """Google Translate TTS — free, online, no key. 60+ languages."""
    if not GTTS_AVAILABLE:
        return None
    try:
        from gtts import gTTS  # type: ignore
        lang = GTTS_LANG_MAP.get(voice, "en")
        buf = io.BytesIO()
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.write_to_fp(buf)
        buf.seek(0)
        data = buf.read()
        return data if data else None
    except Exception as e:
        log.warning(f"gTTS failed (voice={voice}): {e}")
        return None

# ─── Engine 3: Kokoro-82M (ultra-fast offline English) ────────────────

_kokoro_pipeline = None

def _get_kokoro():
    global _kokoro_pipeline
    if _kokoro_pipeline is None and KOKORO_AVAILABLE:
        try:
            from kokoro import KPipeline  # type: ignore
            _kokoro_pipeline = KPipeline(lang_code="en-us")
            log.info("Kokoro-82M loaded")
        except Exception as e:
            log.warning(f"Kokoro load failed: {e}")
    return _kokoro_pipeline

def kokoro_generate(text: str) -> Optional[bytes]:
    """Kokoro-82M — ultra-fast offline English TTS. Near real-time on CPU."""
    if not KOKORO_AVAILABLE:
        return None
    try:
        import numpy as np  # type: ignore
        import soundfile as sf  # type: ignore
        pipeline = _get_kokoro()
        if pipeline is None:
            return None
        # Kokoro returns generator of (graphemes, phonemes, audio_array)
        audio_chunks = []
        for _, _, audio in pipeline(text):
            audio_chunks.append(audio)
        if not audio_chunks:
            return None
        combined = np.concatenate(audio_chunks)
        buf = io.BytesIO()
        sf.write(buf, combined, 24000, format="WAV")
        buf.seek(0)
        return buf.read()
    except Exception as e:
        log.warning(f"Kokoro failed: {e}")
        return None

# ─── Engine 4: MOSS-TTS-Nano (offline multilingual, CPU) ──────────────

_moss_nano = None

def _get_moss_nano():
    global _moss_nano
    if _moss_nano is None:
        try:
            # MOSS-TTS-Nano — check if the package is available
            import moss_tts_nano  # type: ignore  # noqa
            _moss_nano = moss_tts_nano
            log.info("MOSS-TTS-Nano loaded")
        except ImportError:
            pass
    return _moss_nano

def moss_nano_generate(text: str, voice: str) -> Optional[bytes]:
    """MOSS-TTS-Nano: 100M multilingual model, CPU-friendly."""
    nano = _get_moss_nano()
    if nano is None:
        return None
    try:
        buf = io.BytesIO()
        nano.synthesize(text, buf)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        log.warning(f"MOSS-Nano failed: {e}")
        return None

# ─── Engine 5: Piper (offline ONNX, 30+ languages) ────────────────────

_piper_voices_cache: dict = {}

def piper_generate(text: str, voice: str) -> Optional[bytes]:
    """Piper ONNX TTS — offline, 30+ languages including Urdu and Hindi."""
    if not PIPER_AVAILABLE:
        return None
    try:
        from piper import PiperVoice  # type: ignore
        import wave
        piper_model = PIPER_VOICE_MAP.get(voice, "en_US-lessac-medium")
        if piper_model not in _piper_voices_cache:
            log.info(f"Loading Piper voice: {piper_model}")
            _piper_voices_cache[piper_model] = PiperVoice.load(piper_model, download=True)
        pv = _piper_voices_cache[piper_model]
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            pv.synthesize(text, wf)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        log.warning(f"Piper failed (voice={voice}): {e}")
        return None

# ─── Engine 6: F5-TTS (zero-shot voice cloning, GPU) ──────────────────

def f5_generate(text: str, ref_audio: Optional[str] = None, ref_text: str = "") -> Optional[bytes]:
    """F5-TTS: zero-shot voice cloning from a reference audio clip.
    ref_audio: path to a .wav file (5-15 seconds of clean speech).
    If no ref_audio given, uses a built-in default voice.
    """
    if not F5_AVAILABLE:
        return None
    try:
        import tempfile
        import subprocess
        # F5-TTS exposes a CLI; use it to generate audio
        ref_args = []
        if ref_audio and os.path.exists(ref_audio):
            ref_args = ["--ref_audio", ref_audio, "--ref_text", ref_text or ""]
        else:
            # Use a bundled reference voice if available
            default_ref = os.path.join(os.path.dirname(__file__), "voices", "default_ref.wav")
            if os.path.exists(default_ref):
                ref_args = ["--ref_audio", default_ref, "--ref_text", ""]

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        cmd = [
            sys.executable, "-m", "f5_tts.infer.infer_cli",
            "--model", "F5TTS_v1_Base",
            "--gen_text", text,
            "--output_file", tmp_path,
        ] + ref_args

        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            log.warning(f"F5-TTS CLI failed: {result.stderr.decode()[:300]}")
            return None

        with open(tmp_path, "rb") as f:
            data = f.read()
        os.unlink(tmp_path)
        return data if data else None
    except Exception as e:
        log.warning(f"F5-TTS failed: {e}")
        return None

# ─── Engine 7: Bark (Suno — expressive TTS, GPU) ──────────────────────

def bark_generate(text: str, voice: str) -> Optional[bytes]:
    """Bark by Suno: expressive TTS with emotions, laughs, music.
    Works best with GPU. On CPU use use_small=True (~30-90 sec/10 sec audio).
    """
    if not BARK_AVAILABLE:
        return None
    try:
        import numpy as np  # type: ignore
        import scipy.io.wavfile as wavfile  # type: ignore
        from bark import SAMPLE_RATE, generate_audio, preload_models  # type: ignore
        preload_models()
        history_prompt = BARK_VOICE_MAP.get(voice, "v2/en_speaker_6")
        use_small = os.environ.get("BARK_SMALL", "0") == "1"
        audio_array = generate_audio(text, history_prompt=history_prompt,
                                     silent=True, use_small=use_small)
        buf = io.BytesIO()
        wavfile.write(buf, SAMPLE_RATE, audio_array)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        log.warning(f"Bark failed: {e}")
        return None

# ─── Engine 8: XTTS v2 via LocalVoice proxy ───────────────────────────

def xtts_proxy_generate(text: str, voice: str) -> Optional[bytes]:
    """Proxy to the LocalVoice FastAPI backend (XTTS v2 or Kokoro).
    Runs separately: cd docs/audio-integrations/local-voice-chrome-extension/backend
                     uvicorn server:app --port 8001
    """
    try:
        import urllib.request, json as _json  # noqa
        payload = _json.dumps({"text": text, "language": "en"}).encode()
        req = urllib.request.Request(
            f"{XTTS_PROXY_URL}/tts",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = _json.loads(resp.read())
            if "audio_base64" in data:
                import base64
                return base64.b64decode(data["audio_base64"])
    except Exception as e:
        log.warning(f"XTTS proxy failed: {e}")
    return None

# ─── Core: auto-select engine and generate ───────────────────────────

def generate_audio(
    text: str,
    voice: str,
    engine: str = "auto",
    rate: str = "+0%",
    pitch: str = "+0Hz",
    ref_audio: Optional[str] = None,
    ref_text: str = "",
) -> tuple[Optional[bytes], str]:
    """
    Run the TTS priority chain. Returns (audio_bytes, mimetype).
    engine="auto" tries all in priority order.
    engine="edge"|"gtts"|"kokoro"|"piper"|"f5"|"bark"|"xtts" forces that engine.
    """
    is_urdu = voice.startswith("ur-")
    is_hindi = voice.startswith("hi-")
    is_english = not is_urdu and not is_hindi

    # ── FORCED engine ────────────────────────────────────────────────
    if engine != "auto":
        audio = _try_engine(engine, text, voice, rate, pitch, ref_audio, ref_text)
        if audio:
            mime = "audio/mpeg" if engine in ("edge", "gtts", "bark") else "audio/wav"
            return audio, mime
        return None, ""

    # ── AUTO: ONLINE first ───────────────────────────────────────────
    # 1. edge-tts (best quality, all 3 languages)
    audio = edge_generate(text, voice, rate, pitch)
    if audio:
        log.info(f"[edge-tts] voice={voice} len={len(text)}")
        return audio, "audio/mpeg"

    # 2. gTTS (good Urdu/Hindi fallback, online)
    audio = gtts_generate(text, voice)
    if audio:
        log.info(f"[gTTS] voice={voice} lang={GTTS_LANG_MAP.get(voice,'en')}")
        return audio, "audio/mpeg"

    # ── AUTO: OFFLINE ────────────────────────────────────────────────
    # 3. Kokoro (English only, very fast on CPU)
    if is_english:
        audio = kokoro_generate(text)
        if audio:
            log.info(f"[Kokoro] len={len(text)}")
            return audio, "audio/wav"

    # 4. MOSS-TTS-Nano (multilingual, CPU)
    audio = moss_nano_generate(text, voice)
    if audio:
        log.info(f"[MOSS-Nano] voice={voice}")
        return audio, "audio/wav"

    # 5. Piper (offline, Urdu/Hindi/English voices)
    audio = piper_generate(text, voice)
    if audio:
        log.info(f"[Piper] voice={voice}")
        return audio, "audio/wav"

    # ── AUTO: GPU-QUALITY ────────────────────────────────────────────
    # 6. F5-TTS (voice cloning)
    audio = f5_generate(text, ref_audio, ref_text)
    if audio:
        log.info(f"[F5-TTS] len={len(text)}")
        return audio, "audio/wav"

    # 7. XTTS proxy (LocalVoice backend)
    audio = xtts_proxy_generate(text, voice)
    if audio:
        log.info(f"[XTTS-proxy] len={len(text)}")
        return audio, "audio/wav"

    # 8. Bark (expressive, GPU)
    audio = bark_generate(text, voice)
    if audio:
        log.info(f"[Bark] voice={voice}")
        return audio, "audio/wav"

    return None, ""

def _try_engine(engine: str, text: str, voice: str, rate: str, pitch: str,
                ref_audio: Optional[str], ref_text: str) -> Optional[bytes]:
    if engine == "edge":    return edge_generate(text, voice, rate, pitch)
    if engine == "gtts":    return gtts_generate(text, voice)
    if engine == "kokoro":  return kokoro_generate(text)
    if engine == "moss":    return moss_nano_generate(text, voice)
    if engine == "piper":   return piper_generate(text, voice)
    if engine == "f5":      return f5_generate(text, ref_audio, ref_text)
    if engine == "bark":    return bark_generate(text, voice)
    if engine == "xtts":    return xtts_proxy_generate(text, voice)
    return None

# ─── Flask routes ────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": ANY_AVAILABLE,
        "port": int(os.environ.get("TTS_PORT", 5052)),
        "engines": {
            "edge_tts":    EDGE_AVAILABLE,
            "gtts":        GTTS_AVAILABLE,
            "kokoro":      KOKORO_AVAILABLE,
            "piper":       PIPER_AVAILABLE,
            "f5_tts":      F5_AVAILABLE,
            "bark":        BARK_AVAILABLE,
            "xtts_proxy":  XTTS_PROXY_URL,
        }
    })


@app.route("/engines", methods=["GET"])
def engines():
    """List engines with install instructions for the UI."""
    return jsonify([
        {
            "id": "edge",   "name": "edge-tts (Microsoft Neural)",
            "available": EDGE_AVAILABLE, "offline": False,  "gpu": False,
            "languages": ["ur", "hi", "en"], "quality": "excellent",
            "install": "pip install edge-tts",
        },
        {
            "id": "gtts",   "name": "gTTS (Google Translate)",
            "available": GTTS_AVAILABLE,  "offline": False,  "gpu": False,
            "languages": ["ur", "hi", "en", "60+ more"], "quality": "good",
            "install": "pip install gTTS",
        },
        {
            "id": "kokoro", "name": "Kokoro-82M (ultra-fast offline English)",
            "available": KOKORO_AVAILABLE,"offline": True,   "gpu": False,
            "languages": ["en"], "quality": "very good",
            "install": "pip install kokoro soundfile",
        },
        {
            "id": "piper",  "name": "Piper (offline ONNX, 30+ languages)",
            "available": PIPER_AVAILABLE, "offline": True,   "gpu": False,
            "languages": ["ur", "hi", "en", "30+ more"], "quality": "good",
            "install": "pip install piper-tts",
        },
        {
            "id": "f5",     "name": "F5-TTS (voice cloning, GPU)",
            "available": F5_AVAILABLE,    "offline": True,   "gpu": True,
            "languages": ["en", "zh", "any (zero-shot)"], "quality": "studio",
            "install": "pip install f5-tts",
        },
        {
            "id": "bark",   "name": "Bark by Suno (expressive, GPU)",
            "available": BARK_AVAILABLE,  "offline": True,   "gpu": True,
            "languages": ["en", "hi", "13 languages"], "quality": "expressive",
            "install": "pip install git+https://github.com/suno-ai/bark.git",
        },
        {
            "id": "xtts",   "name": "XTTS v2 (LocalVoice, separate server)",
            "available": False,           "offline": True,   "gpu": True,
            "languages": ["en", "13 languages"], "quality": "studio",
            "install": "cd docs/audio-integrations/local-voice-chrome-extension/backend && pip install -r requirements.txt && uvicorn server:app --port 8001",
        },
    ])


@app.route("/voices", methods=["GET"])
def voices():
    return jsonify({
        "edge":  list(EDGE_VOICES.values()) if EDGE_AVAILABLE  else [],
        "gtts":  list(set(GTTS_LANG_MAP.values())) if GTTS_AVAILABLE else [],
        "piper": list(set(PIPER_VOICE_MAP.values())) if PIPER_AVAILABLE else [],
        "bark":  list(BARK_VOICE_MAP.values()) if BARK_AVAILABLE else [],
        "defaults": EDGE_VOICES,
    })


@app.route("/tts", methods=["POST"])
def tts():
    data    = request.get_json(force=True, silent=True) or {}
    text    = str(data.get("text", "")).strip()
    voice   = str(data.get("voice", EDGE_VOICES["en"])).strip()
    engine  = str(data.get("engine", "auto")).strip()
    rate    = str(data.get("rate",  "+0%")).strip()
    pitch   = str(data.get("pitch", "+0Hz")).strip()
    ref_audio = data.get("ref_audio")   # path to .wav for F5-TTS / XTTS cloning
    ref_text  = str(data.get("ref_text", "")).strip()

    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 8000:
        text = text[:8000]

    audio, mime = generate_audio(text, voice, engine, rate, pitch, ref_audio, ref_text)

    if audio:
        ext = "mp3" if "mpeg" in mime else "wav"
        return send_file(io.BytesIO(audio), mimetype=mime,
                         download_name=f"speech.{ext}")

    return jsonify({
        "error": "All TTS engines failed or unavailable.",
        "tip": "Install at least one: pip install edge-tts gTTS kokoro piper-tts"
    }), 503


@app.route("/tts/languages", methods=["GET"])
def tts_languages():
    return jsonify({
        "ur": {"name": "Urdu",    "female": "ur-PK-UzmaNeural",   "male": "ur-PK-AsadNeural"},
        "hi": {"name": "Hindi",   "female": "hi-IN-SwaraNeural",   "male": "hi-IN-MadhurNeural"},
        "en": {"name": "English", "neutral": "en-US-JennyNeural",
               "in": "en-IN-NeerjaNeural", "gb": "en-GB-SoniaNeural"},
    })


@app.route("/tts/pregenerate", methods=["POST"])
def pregenerate():
    """
    Batch pre-generate audio files for a list of question codes.
    Used for offline audio bank generation (Bark / F5-TTS).
    Body: { "items": [{"code": "CB-1", "text": "...", "voice": "..."}],
             "engine": "bark"|"f5"|"edge",
             "output_dir": "/path/to/output" }
    Returns: { "done": [...], "failed": [...] }
    """
    data = request.get_json(force=True, silent=True) or {}
    items = data.get("items", [])
    engine = str(data.get("engine", "auto"))
    out_dir = str(data.get("output_dir", "generated_audio"))
    os.makedirs(out_dir, exist_ok=True)

    done, failed = [], []
    for item in items[:500]:   # cap at 500 per batch
        code  = str(item.get("code", ""))
        text  = str(item.get("text", "")).strip()
        voice = str(item.get("voice", EDGE_VOICES["en"]))
        if not code or not text:
            continue
        audio, mime = generate_audio(text, voice, engine)
        if audio:
            ext = "mp3" if "mpeg" in mime else "wav"
            path = os.path.join(out_dir, f"{code}.{ext}")
            with open(path, "wb") as f:
                f.write(audio)
            done.append(code)
        else:
            failed.append(code)

    return jsonify({"done": done, "failed": failed,
                    "output_dir": os.path.abspath(out_dir)})


# ─── Entry point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 5052))
    log.info(f"Interview Box TTS Server starting on port {port}")
    log.info(f"Install more engines: pip install edge-tts gTTS kokoro piper-tts")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
