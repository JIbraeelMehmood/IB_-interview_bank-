#!/bin/bash
# Double-click to start Interview Box at http://localhost:8765 (keep this window open)
cd "$(dirname "$0")"
URL="http://localhost:8765/interview-box.html"
if command -v python3 >/dev/null 2>&1; then
  (sleep 1; open "$URL" 2>/dev/null || xdg-open "$URL") &
  echo "Interview Box is running at $URL — keep this window open."
  python3 -m http.server 8765 --bind 127.0.0.1
else
  echo "Python 3 is needed. macOS will offer to install it (Command Line Tools) — accept, then double-click this file again."
  python3 --version
  read -p "Press Enter to close"
fi
