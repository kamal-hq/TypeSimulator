# TypeSimulator v2

> **Human cadence. Machine precision.** An OS-level humanized keystroke automation studio for Windows—engineered for paste-restricted web forms, VDI/VM/remote consoles without clipboard sharing, QA regression runs, and live demos.

---

## Overview

TypeSimulator v2 pairs a **Figma-crafted React/TypeScript Studio UI** with a dual-runtime engine architecture:

1. **Web Mode (Vercel):** A live product showcase, Windows `.exe` download portal, and an **Interactive Paste-Blocked Sandbox** where anyone can test biomechanical typing cadence, typo simulation, and text sanitization directly in the browser.
2. **Desktop Mode (Standalone Windows `.exe` Installer):** Wraps the exact same React frontend inside Windows' built-in Edge WebView2 via **PyWebView**, backed by **Python Engine v2** for real OS-level `SendInput` keystroke injection, global hotkeys, and active-window safety protection—requiring zero Python installation for end users.

---

## Key Features

- **Biomechanical Cadence Engine:** WPM-anchored log-normal timing (`25–150 WPM`) with presets (*Natural*, *Fast*, *Thoughtful*, *Steady*, *Custom*), word-burst acceleration, and natural punctuation/paragraph pauses.
- **QWERTY Typo Simulator:** Optional configurable error rate (`0–8%`) using a physical adjacent-key neighbor map with realistic reaction pause and `Backspace` correction.
- **Active-Window Focus Guard:** Uses native Win32 `ctypes` (`GetForegroundWindow`) to lock onto the target `HWND` and **auto-pause instantly** if another window or popup steals focus mid-run.
- **Strict Text Sanitizer & Diff Report:** Automatically detects and normalizes smart quotes, em/en dashes, ellipses (`…`), non-breaking spaces, zero-width characters, bullet symbols, `\r\n` line endings, optional Markdown, plus configurable `Enter` vs `Shift+Enter` and `Tab` handling.
- **Non-Destructive Transport & Global Hotkeys:** Lock-protected FSM (`IDLE → COUNTDOWN → TYPING ↔ PAUSED → COMPLETED | ABORTED`) with zero-latency `Event.wait` cancellation, exact cursor preservation on pause/resume, and customizable global hotkeys (defaults: `F9` Start/Resume, `F10` Pause, `Ctrl+Shift+Esc` Abort).
- **Compact Floating HUD & Snippets Library:** Pin Always-on-Top, shrink into a floating mini telemetry pill (`WPM`, `ETA`, progress bar, controls), and save/search reusable text snippets locally.

---

## Architecture

```text
                ┌─────────────────────────────────────────────┐
                │   Unified React + TypeScript + Vite UI      │
                │    (frontend/ — Studio, HUD, Overview)      │
                └──────────────────────┬──────────────────────┘
                                       │ EngineAdapter
                 ┌─────────────────────┴─────────────────────┐
                 ▼ (Vercel Web Mode)                         ▼ (Desktop Mode)
   ┌───────────────────────────┐               ┌───────────────────────────────┐
   │     WebSandboxAdapter     │               │     DesktopBridgeAdapter      │
   │ • In-browser cadence sim  │               │ • PyWebView JS <-> Python IPC │
   │ • Paste-blocked test box  │               └───────────────┬───────────────┘
   │ • localStorage snippets   │                               ▼
   └───────────────────────────┘               ┌───────────────────────────────┐
                                               │       Python Engine v2        │
                                               │ • FSM + Sanitizer + Cadence   │
                                               │ • Win32 ctypes Focus Guard    │
                                               │ • pynput Global Hotkeys       │
                                               │ • %APPDATA% JSON Storage      │
                                               └───────────────┬───────────────┘
                                                               ▼
                                               Target OS Application / Browser
```

### Engineering & Governance Docs
- [architecture.md](architecture.md) — System design, FSM invariants, IPC bridge & packaging pipeline
- [rule.md](rule.md) — Engineering guardrails, safety invariants & frontend contract
- [phase-doc.md](phase-doc.md) — Phased implementation roadmap & exit gates
- [design.md](design.md) — Visual design system, UX views & telemetry specs
- [memory.md](memory.md) — Architectural Decision Records (ADRs) & project memory

---

## Prerequisites (For Local Development)

- **Windows 10 / 11** (Edge WebView2 Runtime is built-in)
- **Python 3.10+**
- **Node.js 20+**
- **Inno Setup 6** *(only required to compile the `.exe` setup wizard)*

---

## Local Development Setup

### 1. Python Backend & Automated Tests (PowerShell)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt pytest
pytest
```

### 2. Frontend Web Sandbox (Vite Dev Server)
```powershell
cd frontend
npm install
npm run dev
```

### 3. Desktop App (PyWebView + Python Engine v2)
```powershell
# Build the desktop-mode frontend bundle once
cd frontend
npm run build:desktop
cd ..

# Launch the native Windows desktop application
python -m backend.desktop_app
```

---

## Deploying Web Mode to Vercel

The root `vercel.json` is pre-configured for zero-friction Vercel deployment:
1. Push this repository to GitHub and import it into **Vercel**.
2. Keep the root directory as `.` (`vercel.json` runs `cd frontend && npm run build:web` and outputs `frontend/dist`).
3. *(Optional)* Set `VITE_DOWNLOAD_URL` in Vercel Environment Variables to point directly to your latest GitHub Releases `.exe` asset URL.

---

## Building the Standalone Windows Installer (`.exe`)

Run the automated PowerShell packaging pipeline from the project root:

```powershell
.\installer\build.ps1
```

This builds `frontend` in Desktop mode, generates `installer/assets/icon.ico`, bundles the application via PyInstaller (`installer/typesimulator.spec`), and compiles a standalone Inno Setup installer at:

```text
installer/output/TypeSimulator-Setup-v2.0.0.exe
```

---

## Author & Project Information

- **Developer:** Muhammad Kamal
- **Project Type:** Independent portfolio project
