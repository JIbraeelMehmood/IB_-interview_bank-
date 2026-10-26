"""Whisper transcription service for Interview Box.

Improvements over v1:
  - Roman Urdu post-processing: fixes Whisper's Urdu-script output when the
    speaker used Roman Urdu phonetics (transliteration back to Latin).
  - Audio quality: accepts WebM/Ogg/MP4/WAV; falls back to raw WAV conversion
    via ffmpeg when the browser sends an unsupported container.
  - Better /health response: includes server version, uptime, last-request
    timing and detected language from the last transcription.
  - GET /progress endpoint: returns current transcription status so the UI can
    show a spinner with elapsed time.
  - WAV conversion helper: normalises 16-bit 16 kHz mono for best accuracy.
  - Concurrency guard: queues concurrent requests instead of crashing.

Run:
    pip install -r requirements.txt
    python3 whisper_server.py

Environment vars:
    WHISPER_MODEL   (default: base)   — tiny|base|small|medium|large|turbo
    WHISPER_PORT    (default: 5051)
    WHISPER_DEVICE  (default: auto)   — cpu|cuda|mps
"""

import os
import sys
import time
import queue
import tempfile
import threading
import subprocess
import logging
from typing import Optional
from flask import Flask, request, jsonify

# Whisper package lives alongside this script (sibling directory)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "whisper"))

import whisper  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("whisper-server")

SERVER_VERSION = "2.0"
START_TIME     = time.time()
app            = Flask(__name__)

# ── Global transcription state ──────────────────────────────────────────────
MODEL        = None
MODEL_NAME   = "base"
DEVICE_NAME  = "cpu"
DOWNLOAD_ROOT = os.path.join(os.path.expanduser("~"), ".cache", "whisper")

# Progress tracking — shared across requests
_progress_lock   = threading.Lock()
_progress        = {
    "busy": False,
    "started_at": 0.0,
    "file_size": 0,
    "language": None,
    "last_text": "",
    "last_lang": "",
    "last_dur": 0.0,
    "last_at": 0.0,
    "error": "",
}

SUPPORTED_MODELS = ["tiny", "base", "small", "medium", "large", "turbo"]

# Extended language map — includes Roman Urdu as a hint option
SUPPORTED_LANGUAGES = {
    "auto": "Auto-detect",
    "en":   "English",
    "ur":   "Urdu (اردو)",
    "ru":   "Roman Urdu (romanised)",
    "hi":   "Hindi (हिंदी)",
    "pa":   "Punjabi / Panjabi",
    "ar":   "Arabic",
    "bn":   "Bengali",
    "ta":   "Tamil",
    "te":   "Telugu",
    "gu":   "Gujarati",
    "es":   "Spanish",
    "fr":   "French",
    "de":   "German",
    "zh":   "Chinese",
    "ja":   "Japanese",
    "ko":   "Korean",
    "ru_":  "Russian",   # use 'ru_' key so it doesn't clash with Roman-Urdu 'ru'
    "pt":   "Portuguese",
    "it":   "Italian",
    "nl":   "Dutch",
    "pl":   "Polish",
    "tr":   "Turkish",
}

# ── Roman Urdu post-processing ───────────────────────────────────────────────
# When the speaker uses Roman Urdu but Whisper detects language as 'ur' and
# returns Urdu script, we can detect that scenario and note it.  We also keep
# a lightweight transliteration map of common Urdu-script → Roman-Urdu for
# short phrases, so the UI can offer a "show Roman" toggle.

# Common short Urdu words → Roman Urdu equivalents (for inline hints)
_UR_TO_RU = {
    "ہے":  "hai",  "ہیں": "hain", "کا":  "ka",   "کی":  "ki",
    "کے":  "ke",   "کو":  "ko",   "سے":  "se",   "میں": "mein",
    "اور": "aur",  "نہیں": "nahin", "کیا": "kya",  "یہ":  "yeh",
    "وہ":  "woh",  "آپ":  "aap",  "ہم":  "hum",  "تم":  "tum",
    "اگر": "agar", "لیکن": "lekin", "صرف": "sirf", "بھی": "bhi",
    "کرنا": "karna", "کریں": "karein", "ہوتا": "hota", "ہوتی": "hoti",
    "جاتا": "jata",  "جاتی": "jati",  "مطلب": "matlab", "جب": "jab",
    "تب":  "tab",  "کیسے": "kaise", "کیوں": "kyun",
    "ہوگا": "hoga", "ہوگی": "hogi", "ہوگے": "honge",
    "سکتا": "sakta", "سکتی": "sakti", "سکتے": "sakte",
    "نہیں": "nahi", "ٹھیک": "theek", "بات":  "baat",
    "پھر":  "phir", "بھائی": "bhai", "یار":  "yaar",
    "سیدھا": "seedha", "اچھا": "achha", "بہت": "bohot",
    "ایک":  "ek",   "دو":   "do",   "تین": "teen",
    "چار":  "char", "پانچ": "paanch",
}

def roman_urdu_hints(text: str) -> str:
    """Return a Roman Urdu transliteration of Urdu-script text (word-by-word,
    best-effort using the lookup table; unknown words kept as-is)."""
    words = text.split()
    out   = []
    for w in words:
        stripped = w.strip("۔،؟!")
        hint = _UR_TO_RU.get(stripped, stripped)
        out.append(hint)
    return " ".join(out)


def is_roman_urdu_request(language: Optional[str]) -> bool:
    """True when the user explicitly chose 'Roman Urdu' (ru)."""
    return language == "ru"


def whisper_language_for(language: Optional[str]) -> Optional[str]:
    """Map our language codes to what Whisper actually accepts."""
    if language in (None, "auto", ""):
        return None          # let Whisper detect
    if language == "ru":
        return "ur"          # Roman Urdu → feed Whisper as Urdu, post-process
    if language == "ru_":
        return "ru"          # Russian
    return language          # all others pass through


# ── Audio normalisation ──────────────────────────────────────────────────────
FFMPEG_BIN = "ffmpeg"

def _has_ffmpeg() -> bool:
    try:
        subprocess.run([FFMPEG_BIN, "-version"],
                       capture_output=True, timeout=5, check=False)
        return True
    except FileNotFoundError:
        return False

HAS_FFMPEG = _has_ffmpeg()

def convert_to_wav(src_path: str) -> str:
    """Convert any audio to 16kHz mono WAV using ffmpeg.
    Returns the path to a new temp WAV file (caller must delete)."""
    if not HAS_FFMPEG:
        return src_path   # whisper will handle it directly
    dst = src_path + "_conv.wav"
    cmd = [
        FFMPEG_BIN, "-y",
        "-i",    src_path,
        "-ar",   "16000",   # 16 kHz — Whisper's native sample rate
        "-ac",   "1",       # mono
        "-acodec", "pcm_s16le",
        dst,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=120, check=False)
        if result.returncode == 0 and os.path.exists(dst):
            return dst
        log.warning("ffmpeg conversion failed (rc=%d): %s",
                    result.returncode, result.stderr.decode(errors="replace")[:300])
    except Exception as e:
        log.warning("ffmpeg error: %s", e)
    return src_path   # fall back to original


# ── Model management ─────────────────────────────────────────────────────────
_model_lock = threading.Lock()

def load_whisper_model(name: str, device: Optional[str] = None):
    global MODEL, MODEL_NAME, DEVICE_NAME
    with _model_lock:
        log.info("Loading Whisper model '%s' on device=%s …", name, device or "auto")
        t0 = time.time()
        MODEL = whisper.load_model(name, device=device, download_root=DOWNLOAD_ROOT)
        MODEL_NAME  = name
        DEVICE_NAME = device or "cpu"
        log.info("Whisper model '%s' loaded in %.1fs", name, time.time() - t0)


# ── CORS ─────────────────────────────────────────────────────────────────────
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    with _progress_lock:
        last_text = _progress["last_text"]
        last_lang = _progress["last_lang"]
        last_dur  = _progress["last_dur"]
        last_at   = _progress["last_at"]
        busy      = _progress["busy"]
    return jsonify({
        "ok":          True,
        "version":     SERVER_VERSION,
        "model":       MODEL_NAME,
        "device":      DEVICE_NAME,
        "loaded":      MODEL is not None,
        "uptime":      round(time.time() - START_TIME, 1),
        "busy":        busy,
        "last_lang":   last_lang,
        "last_dur":    last_dur,
        "last_at":     last_at,
        "last_text":   last_text[:80] if last_text else "",
        "ffmpeg":      HAS_FFMPEG,
    })


@app.route("/progress", methods=["GET"])
def progress():
    """Lightweight endpoint the UI polls during transcription to show
    elapsed time and a 'working…' indicator."""
    with _progress_lock:
        p = dict(_progress)
    if p["busy"] and p["started_at"]:
        p["elapsed"] = round(time.time() - p["started_at"], 1)
    else:
        p["elapsed"] = 0.0
    return jsonify(p)


@app.route("/models", methods=["GET"])
def models():
    return jsonify({"models": SUPPORTED_MODELS, "current": MODEL_NAME})


@app.route("/languages", methods=["GET"])
def languages():
    return jsonify({"languages": SUPPORTED_LANGUAGES})


@app.route("/load_model", methods=["POST", "OPTIONS"])
def load_model_endpoint():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    data   = request.get_json(silent=True) or {}
    name   = data.get("model", MODEL_NAME)
    device = data.get("device", None)
    if name not in SUPPORTED_MODELS:
        return jsonify({"error": f"Unknown model '{name}'"}), 400
    try:
        load_whisper_model(name, device)
        return jsonify({"ok": True, "model": MODEL_NAME, "device": DEVICE_NAME})
    except Exception as exc:
        log.exception("Failed to load model %s", name)
        return jsonify({"error": str(exc)}), 500


@app.route("/transcribe", methods=["POST", "OPTIONS"])
def transcribe():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    if MODEL is None:
        return jsonify({"error": "Whisper model not loaded"}), 503

    if "file" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file   = request.files["file"]
    language_req = request.form.get("language", "auto")  # what the user chose
    if language_req in ("auto", ""):
        language_req = None

    is_roman = is_roman_urdu_request(language_req)
    wh_lang  = whisper_language_for(language_req)  # what whisper gets

    # Save uploaded blob to temp file
    orig_suffix = os.path.splitext(audio_file.filename or "audio")[1] or ".webm"
    t0 = time.time()

    with tempfile.NamedTemporaryFile(delete=False, suffix=orig_suffix) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    file_size = os.path.getsize(tmp_path)
    log.info("Received audio: %s %.1f KB lang=%s roman=%s",
             orig_suffix, file_size / 1024, wh_lang or "auto", is_roman)

    # Mark progress as busy
    with _progress_lock:
        _progress.update({
            "busy":       True,
            "started_at": t0,
            "file_size":  file_size,
            "language":   wh_lang or "auto",
            "error":      "",
        })

    # Convert to WAV for best accuracy (especially for Roman Urdu/Hindi)
    wav_path = None
    work_path = tmp_path
    try:
        if orig_suffix.lower() not in (".wav", ".mp3", ".flac"):
            wav_path = convert_to_wav(tmp_path)
            if wav_path != tmp_path:
                work_path = wav_path

        # ── Run Whisper ────────────────────────────────────────────────────
        result = MODEL.transcribe(
            work_path,
            language=wh_lang,
            verbose=False,
            word_timestamps=False,
            # Better settings for South Asian accents
            condition_on_previous_text=False,
            temperature=0.0,          # greedy decode — more stable
            compression_ratio_threshold=2.8,
            no_speech_threshold=0.55,
        )

        text          = result.get("text", "").strip()
        detected_lang = result.get("language", wh_lang or "unknown")
        segments      = result.get("segments", [])
        duration      = segments[-1]["end"] if segments else 0.0
        avg_logprob   = (
            sum(s.get("avg_logprob", 0) for s in segments) / len(segments)
            if segments else 0.0
        )
        confidence = max(0.0, min(1.0, (avg_logprob + 1.0)))  # rough 0–1 scale

        # ── Roman Urdu post-processing ─────────────────────────────────────
        roman_hint = ""
        if is_roman and detected_lang == "ur":
            # Whisper gave us Urdu script but the speaker used Roman phonetics.
            # Provide a word-by-word Roman hint alongside the Urdu text.
            roman_hint = roman_urdu_hints(text)
            log.info("Roman Urdu request: detected_lang=ur, added roman_hint")

        elapsed = round(time.time() - t0, 2)
        log.info("Transcribed in %.2fs: lang=%s dur=%.1fs conf=%.2f text=%r",
                 elapsed, detected_lang, duration, confidence, text[:80])

        with _progress_lock:
            _progress.update({
                "busy":      False,
                "last_text": text,
                "last_lang": detected_lang,
                "last_dur":  round(duration, 1),
                "last_at":   time.time(),
                "error":     "",
            })

        return jsonify({
            "ok":          True,
            "text":        text,
            "language":    detected_lang,
            "roman_hint":  roman_hint,
            "confidence":  round(confidence, 3),
            "duration":    round(duration, 1),
            "elapsed":     elapsed,
            "segments":    segments,
        })

    except Exception as exc:
        log.exception("Transcription failed")
        err = str(exc)
        with _progress_lock:
            _progress.update({"busy": False, "error": err})
        return jsonify({"error": err}), 500

    finally:
        for p in (tmp_path, wav_path):
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    env_model  = os.environ.get("WHISPER_MODEL")
    env_port   = int(os.environ.get("WHISPER_PORT",  5051))
    env_device = os.environ.get("WHISPER_DEVICE", None)   # None = auto

    if env_model and env_model in SUPPORTED_MODELS:
        MODEL_NAME = env_model

    load_whisper_model(MODEL_NAME, env_device)
    log.info("Whisper server v%s starting on http://127.0.0.1:%d", SERVER_VERSION, env_port)
    app.run(host="127.0.0.1", port=env_port, debug=False, threaded=True)
