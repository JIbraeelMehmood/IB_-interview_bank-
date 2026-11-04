# Interview Box — Full Analysis Report

**Date:** 2026-10-14
**Target:** `/home/lenovo/Downloads/modern --ai---interviweer/interview-box-laptop/interview-box/`
**Files analyzed:** `interview-box.html`, `server.ps1`, `Start Interview Box (Windows).bat`, `start-interview-box-linux.sh`, `README.txt`

---

## 1. Executive Summary

Interview Box is a **self-contained, single-file web application** (3.27 MB `interview-box.html`) that combines a question bank, JD (job description) prep, AI mock interviews, voice practice, transcript-to-Q&A conversion, and offline downloads — all in one HTML file with zero build step. It is launched via a thin platform-specific server script that provides a **localhost-only HTTP server** on port 8765 (required because cloud AI auth and sign-in flows are blocked by the `file://` origin).

The architecture is deliberately simple: static files served by Python or PowerShell, client-side state in `localStorage`/`IndexedDB`/`sessionStorage`, and AI calls routed through a provider-agnostic `SAMPLE()` wrapper.

---

## 2. Files Analyzed

| File | Size | Role |
|---|---|---|
| `interview-box.html` | 3,273,914 B | Entire application (CSS + JS + SVG icons, no external CSS/JS files) |
| `server.ps1` | 1,784 B | Windows PowerShell HTTP listener |
| `Start Interview Box (Windows).bat` | 141 B | Windows double-click entrypoint |
| `start-interview-box-linux.sh` | 574 B | Linux/macOS double-click entrypoint |
| `README.txt` | 679 B | Documentation (why HTTP server is required) |

**Also present in the folder:** 8 `.md` files (question banks, interview prep guides, Roman Urdu versions, priority maps, etc.) — all imported/reference data, not runnable scripts.

---

## 3. `interview-box.html` — Detailed Breakdown

### 3.1 Structure (3,273,914 bytes)

The file is a **single HTML document** containing:
- `<head>` → meta tags, Google Fonts (4 families), inline theme script
- `<style>` → ~280 CSS rules (design system, dark/light themes, language styles, component styles)
- SVG icon set (inline, used throughout)
- `<body>` → 10 named `<section>` views + `.js` (~1,000 lines)

### 3.2 `<head>`

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1D5C48">
<title>Interview Box — Q&A bank, JD prep & mock interviewer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&
     family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&
     family=JetBrains+Mono:wght@400;600&
     family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
<script>try{var t=localStorage.getItem('ibx-theme');if(t&&t!=='auto')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
```

- **4 Google Fonts:**
  - `Atkinson Hyperlegible` — body text (accessibility-focused)
  - `Bricolage Grotesque` — headings (display)
  - `JetBrains Mono` — code/mono
  - `Noto Nastaliq Urdu` — Urdu text in dark mode (with fallback to `Noto Naskh Arabic`)
- **Theme script** reads `localStorage['ibx-theme']` and applies `data-theme="dark"` or `data-theme="light"` to `<html>` (ignoring `auto`). This runs before CSS load, preventing a flash.

---

## 4. CSS Design System

**CSS Custom Properties (`:root`):**

| Variable | Light value | Dark value |
|---|---|---|
| `--bg` | `#EEF0EA` | `#0E1311` |
| `--card` | `#FFFFFF` | `#161D1A` |
| `--ink` | `#16201C` | `#E3EAE6` |
| `--muted` | `#5C6862` | `#98A69F` |
| `--brand` | `#1D5C48` | `#7FCBA9` |
| `--hl` (gold accent) | `#F4D83D` | `#E2C53A` |
| `--j` (green) | `#2C7552` | `#76D1A2` |
| `--m` (blue) | `#2D5FA6` | `#8FB4F0` |
| `--s` (purple) | `#7A3D90` | `#C9A4EA` |
| `--bad` (red) | `#B3261E` | `#F2968D` |
| `--ok` (green) | `#1E7A45` | `#7FD6A0` |
| `--warn` (amber) | `#9A5A00` | `#F0C060` |
| `--code` (background) | `#EDF0EA` | `#0B100E` |

**Key CSS infrastructure:**
- `color-mix(in srgb, var(--bg) 92%, transparent)` — used for sticky top bar backdrop
- `scroll-padding-top: calc(env(safe-area-inset-top, 0px) + 70px)` — iOS safe area support
- `color-scheme: light` / `dark` — system scrollbar + form control theming
- `@media (prefers-reduced-motion:reduce)` — disables CSS animations for accessibility
- `@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]) { ... } }` — dark mode applies when system is dark AND no explicit theme chosen
- `.hidden,[hidden]{display:none!important}` — utility hide class
- `html,body{overflow-x:clip}` — prevents horizontal scroll on narrow screens

**Component classes:**
- `.top` — sticky header (~64px, `backdrop-filter: blur(8px)`)
- `.chip` — toggleable button chip
- `.qc` — question card (`.l-j`/`.l-m`/`.l-s` for level, `.done` for completed)
- `.qh` — question header
- `.ans` — answer body (supports `ul/ol`, `mark`, `.follow`, `.trap`, `.tbl`, `.fill`)
- `.tag` — badge (level `lv-j`/`.lv-m`/`.lv-s`, importance `imp`, category `com`, source `src`, tag `how`)
- `.player` — fixed-bottom audio player (bottom `var(--nav) + env(safe-area-inset-bottom)`)
- `.sheet` — full-screen modal (`.on` to show)
- `.toast` — fixed bottom notification
- `.chat` — message thread (AI chat interface)
- `.stage` — mock interview UI
- `.grp` — JD details sections
- `.labtbl` — SQL lab table
- `.spplan` — spaced-repetition plan

**Language styles:**
- `.ur` — Urdu/Arabic RTL (`direction: rtl`, `text-align: right`, `line-height: 2.3`, `font-size: 1.02rem`)
- `.ur code, .ur pre` — RTL override for code blocks
- `.ur ul, .ur ol, .ans .ur ul, .ans .ur ol, .lines li.ur` — padding/indent adjustments for RTL lists
- `.ui-ur [data-i18n]` — Urdu UI text style
- `.ltabs` — language tabs for mixed content
- `.trq` — translation question
- `.trnote` — translation note



## 4. `server.ps1` — Detailed Breakdown

```powershell
# Interview Box - tiny local web server (only reachable from this computer)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch {
  Write-Host "Port $port is busy - Interview Box may already be running. Opening it..."
  Start-Process "http://localhost:$port/interview-box.html"; Start-Sleep 3; exit
}
Start-Process "http://localhost:$port/interview-box.html"
Write-Host "Interview Box is running at http://localhost:$port/interview-box.html"
Write-Host "Keep this window open while you use the app. Close it to stop."
$types = @{ '.html'='text/html; charset=utf-8';
           '.js'='text/javascript';
           '.json'='application/json';
           '.css'='text/css';
           '.png'='image/png';
           '.svg'='image/svg+xml';
           '.mp3'='audio/mpeg';
           '.zip'='application/zip' }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '') { $rel = 'interview-box.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404; $b = [Text.Encoding]::UTF8.GetBytes('Not found')
    } else {
      $b = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    }
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
  } catch { } finally { $ctx.Response.Close() }
}
```

**Key behaviors:**
- `$ErrorActionPreference = 'Stop'` — PowerShell stops on errors
- `$root` — directory of `server.ps1` (the app root)
- Listens on `http://localhost:8765/` (localhost-only)
- If port is busy: opens the existing instance and exits
- Opens the app in the default browser via `Start-Process`
- **Static file server loop:**
  - Parses URL path, URL-decodes it
  - Default route `/` → `interview-box.html`
  - Resolves full path and verifies it **starts with `$root`** (path traversal guard — prevents `../../etc/passwd` style requests)
  - Only serves **leaf files** (`-PathType Leaf`), not directories
  - Maps extensions to MIME types: `.html`, `.js`, `.json`, `.css`, `.png`, `.svg`, `.mp3`, `.zip`
  - `Cache-Control: no-store` — disables caching (so updates always refresh)
  - Writes file bytes to response
- **Security:** the `StartsWith($root)` check blocks directory traversal attacks; `Test-Path -Leaf` blocks directory requests.
- **Single-threaded** synchronous loop (no async/await). Fine for low-concurrency static serving.

---


## 5. `Start Interview Box (Windows).bat` — Detailed Breakdown

```bat
@echo off
title Interview Box
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if errorlevel 1 pause
```

- `@echo off` — suppresses command echo
- `title Interview Box` — sets window title
- `cd /d "%~dp0"` — changes to script's directory (`%~dp0` = drive + path of batch file)
- Runs `server.ps1` via PowerShell with `Bypass` execution policy (so scripts run without admin)
- `if errorlevel 1 pause` — if PowerShell fails, pause so the window doesn't close immediately

---

## 6. `start-interview-box-linux.sh` — Detailed Breakdown

```bash
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
```

**Key behaviors:**
- `cd "$(dirname "$0")"` — ensures the script's directory (where `interview-box.html` lives)
- Opens the browser after a 1-second delay (so server is ready first) using `open` (macOS) or `xdg-open` (Linux)
- Starts Python 3 built-in HTTP server on `127.0.0.1:8765` (localhost-only)
- Runs `python3 -m http.server` in the **foreground** (blocks the window) — that's the "keep this window open" behavior
- If Python3 is missing, it prints an error and waits for Enter

---

## 7. `README.txt` — Documentation

**Key messages:**
- **Why:** sign-in windows (email account, OpenRouter) only work when the app is opened from a web address. Opening `interview-box.html` directly from Downloads (`file://`) blocks them — that's why AI didn't work.
- **Start (one double-click, keep the small window open):**
  - Windows: `Start Interview Box (Windows).bat`
  - Mac: `Start Interview Box (Mac).command` (first time: right-click › Open)
  - Linux: `bash start-interview-box-linux.sh`
- **After starting:** app opens at `http://localhost:8765/interview-box.html` (only your computer can reach it)
- **Setup flow:** Sign in with email › "Get my phone link" › open that https link on your phone and sign in with the same email.

**Critical insight:** The app is deliberately **not** a `file://` app. It requires a local HTTP server because:
1. Cloud AI providers (OpenRouter, email sign-in) use iframe/OAuth flows that are blocked by `file://` origin
2. The app's AI features and auth require a proper `http://localhost` origin

---


## 8. Cross-Cutting Themes & Architecture

### 8.1 Single-file design
- All CSS, JS, and SVG icons are inlined in `interview-box.html`
- No build step, no separate JS/CSS files, no bundler
- The 3.27 MB file is a deliberate trade-off: zero deployment complexity, but a larger initial download

### 8.2 HTTP server as a required layer
- Python (Linux/macOS) and PowerShell (Windows) both provide a **localhost-only** static server
- This is **not optional** — `file://` breaks email sign-in (OAuth/iframe) and AI provider auth (OpenRouter, etc.)
- The server handles:
  - MIME type mapping
  - Path traversal prevention (`StartsWith($root)` on Windows)
  - Cache control (`no-store`)
  - Default route to `interview-box.html`

### 8.3 Client-side state persistence
- `localStorage` — primary state, translation cache (`ibx-tr`), theme (`ibx-theme`)
- `sessionStorage` — transient state (filters, last viewed)
- `IndexedDB` — translation cache with memory map; syncs and prunes older entries
- The app's state is **portable** via backup export/import (JSON)

### 8.4 AI architecture
- `SAMPLE()` wrapper abstracts multiple providers (OpenRouter, Puter, Mistral, Ollama, Fireworks, Groq, xAI, Gemini, etc.)
- Per-card inline AI with 6 prompt types (`simple`, `cross`, `short`, `draw`, `traps`, `mine`)
- AI menu (`openCardAi`) with 7 tools + external AI handoff (ChatGPT/Claude/Perplexity)
- "AI Connect" feature for configuring API keys
- Requires a real `http://localhost` origin (per README)

### 8.5 Language & localization
- English, Urdu, Hindi, Roman Urdu fully supported
- RTL styling for Urdu (`.ur` class)
- Language tabs for mixed English/Urdu/Hindi content
- Translation cache with `trGet`/`trSave`/`trFlush` (memory + IndexedDB + localStorage)
- `detectLang()` detects Urdu/Hindi/Roman Urdu vs English

### 8.6 Audio (TTS)
- `speechSynthesis` for English, Urdu, Hindi, Roman Urdu
- Voice selection: automatic / English / Urdu / Hindi / Roman Urdu
- Settings: rate, gap, qonly, auto, loop, memory, accent
- Voice test buttons for each language
- Fallback messages for missing voices/embedded browsers

### 8.7 Views & workflows
| View | Purpose | Key interactions |
|---|---|---|
| Library | Question bank | Search, filter, sort, rate, practice, mock, AI explanations |
| JD | Job description prep | Paste JD → AI extracts tech stack, predicts questions, runs mock |
| Mock | AI interviewer | Timer, scorecard, live feedback, cross-questions |
| Coach | AI chat | Conversational prep with JD/profile/weak-topics context |
| Progress | Stats | Practice history, progress tracking, language prefs |
| Settings | Preferences | Theme, language, audio, backup/restore |
| Learn | Transcript-to-Q&A | Paste video link/transcript/article → AI generates Q&A |
| Downloads | Export/offline | Prepare offline, download as file, translation packs |
| Speak | Voice practice | TTS with language selection, rate, voice |
| AI Studio | Advanced AI | Agent, voice interviewer, spaced review, CV↔JD match, STAR bank |

### 8.8 Security & privacy
- **Path traversal guard** in `server.ps1` (`StartsWith($root)` + `-Leaf`)
- **Cache-Control: no-store** — prevents stale cached content
- **localhost-only** binding — no network exposure
- **No build step** — no compiled assets to leak
- **Client-side AI** — data stays on the machine (no cloud scraping except AI provider calls)
- **Translation cache** — persistent but local (IndexedDB + localStorage)

### 8.9 Dependencies
- **Python 3** (Linux/macOS) — standard library only (`http.server`)
- **PowerShell** (Windows) — .NET `System.Net.HttpListener` + `System.IO`
- **Browser** — any modern browser (Chrome/Edge recommended for TTS, voice data)
- **Internet** — only for Google Fonts and AI provider calls (Puter requires no key)
- **Claude app / claude.ai** — required for the "Learn from video/article" AI features

---


## 9. Known Limitations & Gotchas

1. **Port 8765 is hardcoded** — cannot run a second instance on a different port
2. **No cross-platform "macOS" script is provided** — the README references `Start Interview Box (Mac).command`, but the repo only ships `.sh` and `.bat`
3. **Trailing slash handling** — `http://localhost:8765/` (with slash) routes to `interview-box.html`; `http://localhost:8765` (without) may not match
4. **Single-threaded server** — synchronous loop could block under heavy concurrency (not a real concern for a local static server)
5. **AI features require a real origin** — `file://` opens break email sign-in + OpenRouter; AI features are blocked on `file://`
6. **No mobile entry point** — the app is desktop/laptop-only (top nav 64px, sidebar-style layout)
7. **Google Fonts require internet** — offline usage falls back to system fonts
8. **The JS is embedded in the HTML** — for editing, you'd need to edit the `<script>` block in `interview-box.html` directly

---

## 10. Summary

Interview Box is a **production-quality, self-contained web app** that solves a real problem: "How do I get a local, offline-capable interview prep tool with AI features that work on a laptop?" The architecture is:

1. **One HTML file** — the entire app (CSS + JS + SVG)
2. **A localhost HTTP server** — Python (Linux/macOS) or PowerShell (Windows) — required for OAuth/cloud AI auth and cache control
3. **Client-side persistence** — `localStorage` + `IndexedDB` + `sessionStorage`
4. **Provider-agnostic AI** — `SAMPLE()` wrapper + "AI Connect"
5. **Full i18n + TTS** — English/Urdu/Hindi/Roman Urdu with a translation cache

It's a clever, minimal, dependency-light design that maximizes portability while still providing a full-featured interview-prep experience.

---
