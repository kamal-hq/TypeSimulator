# TypeSimulator v2 — System Architecture

> **Architecture Model:** Single Unified React/Vite Frontend (Figma Pro) + Dual Runtime Adapter (`WebSandboxAdapter` on Vercel, `DesktopBridgeAdapter` via PyWebView + Python Engine v2 on Windows) packaged into a standalone Windows `.exe` installer.

---

## 1. High-Level System Overview

TypeSimulator v2 solves two distinct goals from **one unified frontend codebase**:
1. **Live Web Presence (Vercel):** A product showcase, Windows installer download portal, and an **Interactive Browser Sandbox** where visitors experience the exact cadence engine, typo simulator, and sanitizer against a simulated paste-blocked field.
2. **Standalone Desktop Application (Windows `.exe` Installer):** Wraps the exact same compiled frontend inside Windows' native Edge WebView2 via **PyWebView**, connected over a synchronous/asynchronous JS↔Python IPC bridge to **Python Engine v2** for OS-level keystroke injection, global hotkeys, and active-window focus protection.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                UNIFIED FRONTEND (frontend/ — Figma Pro)                 │
│             React 18 + TypeScript + Vite + Tailwind CSS                 │
│                                                                         │
│   Views: [Overview & Download (Web)] | [Studio] | [Compact Mini HUD]    │
│                               │                                         │
│                    EngineAdapter Interface                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
             ┌──────────────────┴──────────────────┐
             ▼ (Runtime: Web / Vercel)             ▼ (Runtime: Desktop / PyWebView)
┌─────────────────────────────────┐   ┌─────────────────────────────────────────┐
│       WebSandboxAdapter         │   │         DesktopBridgeAdapter            │
│  • Pure TS cadence + typo sim   │   │  • Calls window.pywebview.api.*         │
│  • Types into Paste-Blocked     │   │  • Subscribes to window.__tsPushEvent() │
│    sandbox <textarea> in DOM    │   └────────────────────┬────────────────────┘
│  • LocalStorage snippets/prefs  │                        │ JS ↔ Python Bridge
│  • Deployed via Vercel          │                        ▼
└─────────────────────────────────┘   ┌─────────────────────────────────────────┐
                                      │        PYTHON ENGINE v2 (backend/)      │
                                      │  • FSM Controller (typing_engine.py)    │
                                      │  • Sanitizer Pipeline (sanitizer.py)    │
                                      │  • Cadence & Typo Model (cadence.py)    │
                                      │  • Win32 Focus Guard (focus_guard.py)   │
                                      │  • Global Hotkeys (hotkeys.py / pynput) │
                                      │  • JSON Storage (%APPDATA%)             │
                                      └────────────────────┬────────────────────┘
                                                           │ Win32 SendInput
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │    Target OS Application / Browser      │
                                      │   (Forms, VDI, VM Consoles, Terminals)  │
                                      └─────────────────────────────────────────┘
```

---

## 2. Repository Directory Structure

```text
TypeSimulator/
├── architecture.md          # This document — system & runtime blueprint
├── rule.md                  # Engineering rules, safety invariants & contracts
├── phase-doc.md             # Phased roadmap with deliverables & exit gates
├── design.md                # Design system, UX states & Figma handoff spec
├── memory.md                # Decision log (ADRs), state tracker & gotchas
├── README.md                # Public documentation & install guide
├── pyproject.toml           # Python project metadata & pytest config
├── requirements.txt         # Runtime dependencies (pywebview, pynput)
├── vercel.json              # Vercel build config targeting frontend/
├── frontend/                # Figma Pro React + Vite + Tailwind codebase
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── types/engine.ts          # Shared TypeScript data contracts
│       ├── adapters/
│       │   ├── engineAdapter.ts     # Abstract adapter interface + runtime detector
│       │   ├── webSandboxAdapter.ts # Browser-native simulator (Vercel)
│       │   └── desktopBridgeAdapter.ts # PyWebView JS↔Python bridge
│       ├── hooks/useTypingEngine.ts # Unified React state hook
│       └── components/              # Modular UI views & panels
├── backend/                 # Python Engine v2 & PyWebView desktop host
│   ├── __init__.py
│   ├── models.py            # Typed dataclasses & JSON serialization
│   ├── sanitizer.py         # Rule-based text sanitizer + structured diff report
│   ├── cadence.py           # Log-normal WPM model + QWERTY neighbor typo engine
│   ├── focus_guard.py       # Win32 ctypes active-window tracker (HWND + title)
│   ├── hotkeys.py           # Rebindable global hotkey manager with clean shutdown
│   ├── engine.py            # Thread-safe FSM execution engine
│   ├── storage.py           # %APPDATA%/TypeSimulator JSON store (snippets + prefs)
│   ├── bridge.py            # PyWebView API surface + throttled UI event emitter
│   └── desktop_app.py       # PyWebView window lifecycle, always-on-top & HUD resize
├── tests/                   # pytest suite for backend logic & FSM invariants
├── installer/               # PyInstaller .spec, Inno Setup .iss, icon assets
└── legacy/                  # Archived v1 CustomTkinter prototype
```

---

## 3. Core Subsystems

### 3.1 Execution Finite State Machine (FSM)
All typing sessions are governed by a single lock-protected FSM (`threading.RLock`) eliminating concurrency race conditions (e.g., double `F9` triggers):

```text
                ┌──────────────┐
      ┌────────►│     IDLE     │◄───────────────────────────┐
      │         └──────┬───────┘                            │
      │                │ start() / F9                       │ reset() / edit text
      │                ▼                                    │
      │         ┌──────────────┐   abort()                  │
      │         │  COUNTDOWN   ├──────────────►┌────────────┴───┐
      │         └──────┬───────┘               │    ABORTED     │
      │                │ timer = 0             └────────────────┘
      │                ▼                                ▲
      │         ┌──────────────┐   abort()              │
      │   ┌────►│    TYPING    ├────────────────────────┤
      │   │     └──┬────────┬──┘                        │
      │   │        │        │ pause() / F10 /           │
      │   │resume()│        │ Focus Guard triggered     │
      │   │        │        ▼                           │
      │   │        │ ┌──────────────┐   abort()         │
      │   └────────┼─┤    PAUSED    ├───────────────────┘
      │            │ └──────────────┘
      │            │ cursorIndex == totalChars
      │            ▼
      │     ┌──────────────┐
      └─────┤  COMPLETED   │
            └──────────────┘
```

**Key Invariants:**
- **Zero-Latency Interruption:** Delays use `stop_or_pause_event.wait(timeout)` instead of `time.sleep()`, waking in `< 2ms` on Pause, Abort, or Focus Guard triggers.
- **Non-Destructive Pause & Abort:** `cursor_index` is strictly preserved on `PAUSED` and `ABORTED`. Staged text is **never** cleared unless `clearOnComplete` is explicitly enabled and state reaches `COMPLETED`.
- **Single Worker Guarantee:** A new worker thread cannot spawn while state is `COUNTDOWN`, `TYPING`, or `PAUSED`.

### 3.2 Humanized Cadence & Typo Engine (`backend/cadence.py`)
Replaces flat uniform randomness with a realistic biomechanical timing model:
- **WPM-Anchored Distribution:** Base inter-key interval derived from `targetWpm` (`60 / (targetWpm * 5)` seconds/char) modulated by a clipped log-normal distribution scaled by `variability` (0–100%).
- **Contextual Rhythm Multipliers:**
  - Same-word alphabetic characters: slight burst acceleration (`0.75x–1.1x`).
  - Spaces: brief word-boundary transition (`1.2x–1.8x`).
  - Sentence punctuation (`.`, `!`, `?`): cognitive pause (`1.8x–3.2x`).
  - Newlines / paragraph breaks: extended pause (`2.2x–4.0x`).
- **Preset Profiles:** `natural` (68 WPM, 45% var), `fast` (105 WPM, 30% var), `thoughtful` (48 WPM, 65% var), `steady` (75 WPM, 12% var), `custom`.
- **QWERTY Typo & Correction Engine (Optional):**
  - When `typoEnabled` is true and character is an ASCII letter, rolls against `typoRate` (0–8%).
  - Picks a physically adjacent key from a QWERTY neighbor map → injects wrong char → pauses for human error-recognition delay (`140–280ms`) → sends `Key.backspace` → brief recovery delay (`60–120ms`) → injects intended char.

### 3.3 Text Sanitizer & Diff Reporter (`backend/sanitizer.py`)
A deterministic rule-based pipeline returning both `sanitizedText` and a structured `SanitizeReport` (counts per category):
1. **Line Endings:** `\r\n` and standalone `\r` → `\n`.
2. **Smart Quotes:** `‘`, `’`, `‚`, `‛` → `'`; `“`, `”`, `„`, `‟` → `"`.
3. **Dashes:** En-dash `–`, Em-dash `—`, Minus `−` → `-`.
4. **Ellipses:** `…` → `...`.
5. **Invisible & Non-Standard Whitespace:** NBSP `\u00a0`, thin/en/em spaces → `' '`; Zero-width chars (`\u200b`, `\u200c`, `\u200d`, `\ufeff`) → removed.
6. **Bullets:** `•`, `◦`, `▪` → `- `.
7. **Optional Markdown Stripping:** Strips `**bold**`, `*italic*`, `` `code` ``, `# headings` when `stripMarkdown` is enabled.

**Control-Key Safety Rules (at injection time):**
- `\n` respects `newlineMode`: `'enter'` sends `Key.enter`; `'shift_enter'` holds `Key.shift` + presses `Key.enter` (prevents accidental chat/form submission).
- `\t` respects `tabMode`: `'spaces_4'` (default), `'spaces_2'`, `'strip'`, or `'tab'` (prevents focus jumping out of inputs).

### 3.4 Active-Window Focus Guard (`backend/focus_guard.py`)
Implemented with Python's standard-library `ctypes` against Windows `user32.dll` (zero third-party C extension fragility):
- Calls `GetForegroundWindow()` and `GetWindowTextW()` right after `COUNTDOWN` finishes to lock onto `(target_hwnd, target_title)`.
- Before every keystroke (or every 50ms), re-checks `GetForegroundWindow()`.
- If `focusGuardEnabled` is true and `current_hwnd != target_hwnd`, the engine **immediately transitions to `PAUSED`** with `pauseReason = f"Focus changed to '{new_title}' — auto-paused for safety"`.
- Also checks process elevation hints where possible so the UI can warn users if targeting an Administrator/UAC window from a non-elevated session.

### 3.5 Global Hotkey Manager (`backend/hotkeys.py`)
- Uses `pynput.keyboard.GlobalHotKeys` with dynamic re-registration whenever user hotkeys change.
- **Safe Defaults:** `Start/Resume = F9`, `Pause = F10`, `Abort = Ctrl+Shift+Esc` (eliminates bare `<esc>` accidentally closing target modals).
- Guaranteed teardown via `listener.stop()` on application window close.

---

## 4. JS ↔ Python Bridge & Dual Adapter Contract

Both `WebSandboxAdapter` and `DesktopBridgeAdapter` implement the exact same TypeScript `EngineAdapter` interface:

| Method / Event | Direction | Purpose |
| :--- | :--- | :--- |
| `getRuntimeInfo()` | UI → Engine | Returns `{ mode: 'web' \| 'desktop', version, platform, isElevated }` |
| `sanitize(text, stripMarkdown)` | UI → Engine | Returns `SanitizeResult` with normalized text & per-rule change counts |
| `start(text, config)` | UI → Engine | Begins countdown → typing from `cursorIndex = 0` |
| `pause()` | UI → Engine | Non-destructive pause preserving `cursorIndex` |
| `resume()` | UI → Engine | Resumes countdown/typing from saved `cursorIndex` |
| `abort()` | UI → Engine | Stops immediately; keeps text & reports `ABORTED` |
| `reset()` | UI → Engine | Returns FSM to `IDLE` and resets `cursorIndex = 0` |
| `updateConfig(config)` | UI → Engine | Persists settings and rebinds global hotkeys (Desktop) |
| `listSnippets() / saveSnippet() / deleteSnippet()` | UI → Engine | CRUD against `localStorage` (Web) or `%APPDATA%` JSON (Desktop) |
| `setAlwaysOnTop(enabled)` | UI → Engine | Desktop window `-topmost` toggle (no-op on Web) |
| `setCompactHud(enabled)` | UI → Engine | Resizes PyWebView window to floating mini HUD (`440x76`) or restores full Studio (`1120x740`) |
| `onSnapshot(callback)` | Engine → UI | Pushes `EngineSnapshot` updates (throttled ~15Hz + immediate on state changes) |

**PyWebView Event Push Mechanism:**
Python pushes state snapshots into the WebView via `window.evaluate_js(f"window.__typeSimulatorOnEvent({json_payload})")`, keeping UI telemetry smooth without polling overhead.

---

## 5. Build, Deployment & Installer Pipeline

### 5.1 Vercel (Web Mode)
- `vercel.json` builds `frontend/` (`npm run build` → `frontend/dist`) with `VITE_RUNTIME_MODE=web`.
- Serves the Landing/Download overview + Live Paste-Blocked Sandbox.
- Download CTA links directly to the latest GitHub Releases `.exe` asset URL.

### 5.2 Standalone Windows Installer (Desktop Mode)
1. **Frontend Build:** `npm run build` in `frontend/` with `VITE_RUNTIME_MODE=desktop` outputs static bundle into `frontend/dist/`.
2. **PyInstaller Bundle (`installer/typesimulator.spec`):** Packages `backend/desktop_app.py`, all backend modules, `pywebview`, `pynput`, and `frontend/dist/` into a self-contained Windows folder (`dist/TypeSimulator/TypeSimulator.exe`) with `--noconsole` and custom `.ico`.
3. **Inno Setup (`installer/setup.iss`):** Compiles `dist/TypeSimulator/` into a professional **`TypeSimulator-Setup-v2.0.0.exe`** installer featuring:
   - Standard install wizard, Start Menu shortcut, optional Desktop shortcut.
   - Clean Windows Add/Remove Programs uninstaller.
   - Zero Python dependency on the end user's machine (leverages Windows 10/11 built-in Edge WebView2 Runtime).
