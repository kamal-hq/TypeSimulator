# TypeSimulator v2 — Design System & UI Specification

> **Design Philosophy:** Precision studio instrumentation (inspired by Linear, Raycast, and modern audio/hardware utilities). High-contrast dark-first canvas, crisp hairline borders, tabular monospace telemetry, and instant scannability—zero bloated SaaS fluff.

---

## 1. Visual Language & Design Tokens

### Color Palette (Dark Studio Default)
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#090B0E` | App root background |
| `--bg-surface` | `#11141A` | Primary cards, editor stage, inspector sidebar |
| `--bg-elevated` | `#171C24` | Controls, active tabs, dropdowns, snippet cards |
| `--bg-hover` | `#1E2530` | Hover states on interactive surfaces |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Hairline structural dividers & card borders |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | Focused inputs, active preset pills |
| `--text-primary` | `#F3F5F8` | Headings, editor text, active values |
| `--text-secondary` | `#94A3B8` | Labels, descriptions, secondary metadata |
| `--text-muted` | `#64748B` | Placeholders, disabled hints, keyboard caps |
| `--accent-emerald` | `#10B981` | Active typing, ready state, primary Start/Download CTA |
| `--accent-cyan` | `#06B6D4` | Live telemetry sparkline, sanitizer cleaned badge |
| `--accent-amber` | `#F59E0B` | Countdown, Paused state, Active-Window Focus Guard alert |
| `--accent-crimson` | `#EF4444` | Emergency Abort button, Paste-Blocked badge |

### Typography
- **UI Sans:** `Inter` or `Geist` (clean geometric legibility for labels, headers, buttons).
- **Telemetry & Code Mono:** `JetBrains Mono` or `Geist Mono` with `font-variant-numeric: tabular-nums` for WPM, ETA, char counts, progress percentages, hotkey keycaps (`F9`, `F10`, `Ctrl+Shift+Esc`), and editor code/text option.

### Key Visual Motifs
- **Tactile Keycaps:** Keyboard shortcuts rendered as subtle recessed physical keys (`border-b-2`, monospace, uppercase).
- **Live Status Beacon:** Pulsing status dot in the top bar and Compact HUD:
  - `IDLE` → muted slate
  - `COUNTDOWN` → pulsing amber + seconds counter
  - `TYPING` → pulsing emerald
  - `PAUSED` → steady amber
  - `COMPLETED` → crisp emerald check
  - `ABORTED` → crimson dot
- **Subtle Micro-Borders & Depth:** 1px hairline borders, gentle radial top-edge studio glow (very restrained), smooth `150ms` state transitions.

---

## 2. Views & Runtime Modes

The single React app supports **two runtime modes** (`web` vs `desktop`) and **three primary layouts**:

### 2.1 View A: Overview & Download Page *(Web Mode Only — Vercel)*
Clean, fast, high-trust landing experience above or switchable via top nav (`Overview` | `Live Sandbox`):
1. **Top Navigation Bar:** TypeSimulator wordmark + subtle `v2.0` pill, nav links (`Overview`, `Live Sandbox`, `Architecture`), and compact `Download .exe` button.
2. **Hero Section:**
   - Sharp headline: *"Humanized OS-Level Keystroke Automation."*
   - Concise subtitle explaining real-world use cases (paste-restricted web forms, VDI/VM/remote consoles without clipboard sharing, QA testing, live demos).
   - Dual CTAs: Primary **`Download for Windows (.exe)`** (with version/size subtext: `Windows 10/11 · Standalone Installer · No Python Required`) + Secondary **`Try Live Sandbox →`** (launches interactive Studio).
   - Visual focal element: Crisp preview frame of the Studio & Compact Floating HUD telemetry.
3. **4-Card Feature Grid:**
   - *Biomechanical Cadence & Typos* (Gaussian WPM rhythm + QWERTY neighbor typo correction)
   - *Active-Window Focus Guard* (auto-pauses instantly if another window steals focus)
   - *Strict Text Sanitizer* (cleans smart quotes, dashes, zero-width chars, safe Enter/Tab rules)
   - *Global Hotkeys & Mini HUD* (solves the focus paradox with non-destructive pause/resume)
4. **3-Step Pipeline Strip:** `1. Stage & Sanitize` → `2. Focus Target Window` → `3. Trigger F9 & Monitor`.
5. **Footer:** Author credit (*Built by Muhammad Kamal — Independent Portfolio Project*), GitHub repo link, Windows system requirements.

### 2.2 View B: Studio Workspace *(Shared by Web Sandbox & Desktop App)*
Desktop default window size: **`1120 × 740`** (resizable down to `860 × 620`).

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [Logo] [Mode Pill] [Status Beacon]   [AlwaysOnTop] [HUD] [Nav] │
├───────────────────────────────────────────────┬─────────────────────────┤
│ MAIN STAGE (Left ~65%)                        │ INSPECTOR (Right ~35%)  │
│                                               │ Tabs:                   │
│ [Staged Text Editor Card]                     │ [Cadence][Safety][Snip] │
│  • Header: "Staged Payload" + Sanitizer Badge │                         │
│    ("4 chars cleaned ▾") + Clear / Save Snip  │ • Preset Chips          │
│  • Full-height clean textarea                 │ • WPM Slider (25–150)   │
│                                               │ • Variability Slider    │
│ [Focus Guard / Alert Banner (conditional)]    │ • Typo Sim Toggle + %   │
│                                               │ • Countdown (0–5s)      │
│ [Live Telemetry Strip]                        │ • Enter / Tab Rules     │
│  Chars | Words | ETA | Live WPM | Sparkline   │ • Markdown / Clear Opts │
│                                               │                         │
│ [Progress Bar + Cursor Index]                 │ (Tab 2: Focus Guard,    │
│                                               │  Hotkey Recorders, UAC) │
│ [Transport Control Dock]                      │                         │
│  [ Start / Resume (F9) ] [ Pause (F10) ]      │ (Tab 3: Searchable      │
│  [ Abort (Ctrl+Shift+Esc) ]  [ Reset ]        │  Snippets Library)      │
│                                               │                         │
│ ── WEB MODE ONLY ───────────────────────────  │                         │
│ [Interactive Paste-Blocked Sandbox Target]    │                         │
│  • Red "Ctrl+V Disabled" badge                │                         │
│  • Simulated restricted input where sandbox   │                         │
│    live-types with real delays & typos!       │                         │
└───────────────────────────────────────────────┴─────────────────────────┘
```

#### Component Details
- **Sanitizer Shield Badge & Popover:** Shows live count of detected/cleaned artifacts (e.g., `Smart quotes: 2 · Em-dashes: 1 · NBSP: 1`). Clicking opens a clean popover showing the breakdown and an optional "Apply Clean Preview" view.
- **Transport Control Dock:**
  - When `IDLE`: Primary emerald **`Start Typing`** (`F9`).
  - When `COUNTDOWN`: Amber countdown pill **`Starting in 2s...`** + **`Cancel`**.
  - When `TYPING`: **`Pause`** (`F10`) + Crimson **`Abort`** (`Ctrl+Shift+Esc`).
  - When `PAUSED`: Primary emerald **`Resume from char 142`** (`F9`) + **`Restart`** + **`Abort`**.
  - When `COMPLETED` / `ABORTED`: Status summary + **`Type Again`** / **`Resume Remaining`**.
- **Interactive Paste-Blocked Target (Web Mode Only):**
  - Intercepts `onPaste` (`e.preventDefault()`) and flashes an inline micro-toast: *"Paste blocked by form policy — use TypeSimulator to inject text"*.
  - Receives live keystrokes (including visible wrong-key + backspace typo corrections!) from `WebSandboxAdapter` so visitors see the real engine working in real time.

### 2.3 View C: Compact Floating HUD *(Toggleable in Desktop & Previewable in Web)*
Desktop window resizes to **`440 × 76`** (frameless/compact always-on-top bar). In Web Mode, clicking the HUD toggle displays a realistic floating draggable-style overlay pill anchored at the bottom-right so visitors can experience it too!
- **Contents (single clean row):**
  1. Pulsing status dot + state label (`TYPING` / `PAUSED` / `2s`)
  2. Mini progress bar + percentage (`64%`) + truncated target window name (e.g., `Chrome — Portal`)
  3. Monospace live WPM & ETA (`72 WPM · 14s`)
  4. Compact icon buttons: **Pause/Resume**, **Abort**, **Expand to Studio**

---

## 3. UI-to-Adapter Data Contract (For Figma Pro Prompt Alignment)

To guarantee smooth integration when the Figma Pro folder lands in `frontend/`:
- Keep all engine state types in `src/types/engine.ts`.
- Keep all interactive demo simulation logic inside a clean adapter/hook (`src/adapters/engineAdapter.ts` + `src/hooks/useTypingEngine.ts`) rather than embedded inside JSX view components.
- Expose a runtime mode flag (`mode: 'web' | 'desktop'`, with a tiny dev-only or preview toggle only in Web preview if desired, defaulting to `'web'` in browser and auto-switching to `'desktop'` when `window.pywebview` is present).
- Every inspector control (Preset, WPM, Variability, Typo toggle/rate, Countdown, Enter mode, Tab mode, Strip Markdown, Clear on Complete, Focus Guard, Hotkeys) must be wired to a single `TypingConfig` state object.
