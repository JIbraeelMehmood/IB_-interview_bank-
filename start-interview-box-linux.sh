#!/bin/bash
# Double-click to start Interview Box at http://localhost:8765 (keep this window open)
cd "$(dirname "$0")"
URL="http://localhost:8765/interview-box.html"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is needed. Install it then run this file again."
  read -p "Press Enter to close"
  exit 1
fi

# ── Auto-start Whisper server (port 5051) ──────────────────────────────────
WHISPER_LOG="$(dirname "$0")/whisper_server.log"
WHISPER_PID=""

start_whisper() {
  echo "Starting Whisper server…"
  # Check if required packages are available; if not, warn and skip
  if ! python3 -c "import whisper" 2>/dev/null; then
    echo "  ⚠  whisper not installed — skipping (run: pip install openai-whisper)"
    echo "  Speech-to-text will be disabled in the app."
    return
  fi
  nohup python3 whisper_server.py >"$WHISPER_LOG" 2>&1 &
  WHISPER_PID=$!
  echo "  Whisper server started (PID $WHISPER_PID) — log: whisper_server.log"
}

# Only start if not already running on port 5051
if curl -s --max-time 1 http://127.0.0.1:5051/health >/dev/null 2>&1; then
  echo "Whisper server already running on port 5051."
else
  start_whisper
fi

# ── Free port 8765 if already in use ───────────────────────────────────────
if fuser 8765/tcp >/dev/null 2>&1; then
  echo "Port 8765 already in use — stopping old server…"
  fuser -k 8765/tcp 2>/dev/null
  sleep 1
fi

# ── Open browser after 1 second ────────────────────────────────────────────
(sleep 1; xdg-open "$URL" 2>/dev/null || open "$URL" 2>/dev/null) &

# ── Start HTTP file server (keeps window open) ─────────────────────────────
echo "Interview Box running at $URL — keep this window open."
echo "Press Ctrl+C to stop everything."

cleanup() {
  echo ""
  echo "Shutting down…"
  if [ -n "$WHISPER_PID" ] && kill -0 "$WHISPER_PID" 2>/dev/null; then
    kill "$WHISPER_PID"
    echo "Whisper server stopped."
  fi
  exit 0
}
trap cleanup INT TERM

python3 -m http.server 8765 --bind 127.0.0.1
