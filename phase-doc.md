# TypeSimulator v2 — Phased Delivery Roadmap

Track all revamp work sequentially. Do not advance to the next phase until every exit gate in the current phase passes.

---

## Phase 0: Governance, Design Contract & Figma Handoff *(Completed)*
**Goal:** Align architecture, rules, UX specs, and integrate the Figma Pro frontend.

- [x] Critically analyze v1 codebase (`engine.py`, `main.py`, `ui.py`, `architecture.md`, `README.md`)
- [x] Lock stack & product decisions (`1A`: PyWebView + Python + Inno Setup, `2A`: Unified Vercel Sandbox + Landing, full v2 feature set)
- [x] Author `architecture.md`, `rule.md`, `phase-doc.md`, `design.md`, and `memory.md`
- [x] Provide tailored Figma Pro prompt matching `design.md`
- [x] User generated frontend in Figma Pro and dropped export into workspace
- [x] Normalized export into `frontend/`, cleaned Vite config, installed npm packages (`0 vulnerabilities`)

**Exit Gate:** Passed — all 5 governance docs aligned and `frontend/` installs & builds cleanly.

---

## Phase 1: Python Engine v2 & Automated Tests *(Completed)*
**Goal:** Build the rock-solid, tested v2 backend independent of UI.

- [x] Initialize `pyproject.toml`, `requirements.txt`, and update `.gitignore` for Node/frontend/installer artifacts
- [x] Build `backend/models.py` (shared dataclasses matching `EngineSnapshot`, `TypingConfig`, `SanitizeResult`, `Snippet`, `HotkeyBindings`)
- [x] Build `backend/sanitizer.py` (full Unicode/whitespace/markdown pipeline + structured diff report)
- [x] Build `backend/cadence.py` (log-normal WPM timing presets + QWERTY adjacent-key typo generator)
- [x] Build `backend/focus_guard.py` (Win32 `ctypes` foreground `HWND` & title monitor + elevation check)
- [x] Build `backend/hotkeys.py` (rebindable `pynput` global hotkeys with safe defaults & clean teardown)
- [x] Build `backend/engine.py` (lock-protected FSM: `IDLE → COUNTDOWN → TYPING ↔ PAUSED → COMPLETED | ABORTED`, `Event.wait` zero-latency cancel, non-destructive cursor tracking, `Enter` vs `Shift+Enter`, `Tab` rules)
- [x] Build `backend/storage.py` (`%APPDATA%/TypeSimulator` atomic JSON persistence for config & snippets)
- [x] Write `tests/` (`pytest` suite with mocked keyboard injector & window monitor: 19 passing tests covering sanitizer, cadence, FSM race conditions, Focus Guard, hotkeys, storage, and DesktopBridge RPC)

**Exit Gate:** Passed — `pytest` passes 19/19 tests with zero warnings and zero real OS keystrokes fired.

---

## Phase 2: Frontend Wiring & Dual Adapter Integration *(Completed)*
**Goal:** Connect the Figma Pro UI to `WebSandboxAdapter` and `DesktopBridgeAdapter`.

- [x] Define `frontend/src/types/engine.ts`, `frontend/src/adapters/sanitizeLocal.ts`, and `frontend/src/adapters/engineAdapter.ts`
- [x] Upgrade `WebSandboxAdapter` (fixed `12000/wpm` timing math, log-normal cadence, full 26-key QWERTY typo simulator, `localStorage` config & snippets)
- [x] Implement `DesktopBridgeAdapter` (`window.pywebview.api` RPC calls + `window.__typeSimulatorOnEvent` push listener + `pywebviewready` detection)
- [x] Wire `useTypingEngine` hook cleanly into Figma UI components without degrading visual fidelity
- [x] Add inline Save Snippet modal/form (replacing WebView2-incompatible `window.prompt`), `Enter`/`Shift+Enter` control, interactive hotkey rebinding, dynamic target window titles, and proper Compact HUD expand sync
- [x] Build `backend/bridge.py` and `backend/desktop_app.py` (PyWebView window, Always-on-Top, Compact Floating HUD resize, clean shutdown hook)
- [x] Archive legacy v1 prototype files (`engine.py`, `main.py`, `ui.py`) into `legacy/`

**Exit Gate:** Passed — `tsc --noEmit` + `vite build` succeed with zero errors in both `web` and `desktop` modes.

---

## Phase 3: Vercel Live Deployment (Web Mode) *(Ready to Deploy)*
**Goal:** Ship the live web showcase, interactive sandbox, and download portal.

- [x] Add `vercel.json` (build config targeting `frontend/`, SPA fallback rewrites, `npm run build:web`)
- [x] Add OpenGraph/SEO metadata and embedded SVG brand favicon in `frontend/index.html`
- [x] Wire Download `.exe` and GitHub CTAs cleanly via `frontend/src/config/links.ts` (`VITE_DOWNLOAD_URL` / `VITE_GITHUB_URL`)
- [x] Verify Web production build locally (`npm run build:web` passes cleanly, 87.5 kB gzipped JS)
- [ ] Push repo to GitHub and connect project in Vercel dashboard

**Exit Gate:** Live Vercel URL verified by user after pushing to GitHub/Vercel.

---

## Phase 4: Standalone Windows Installer Packaging *(Completed — Built Locally)*
**Goal:** Package TypeSimulator v2 as a zero-dependency Windows `.exe` installer.

- [x] Create multi-resolution Windows icon (`installer/assets/icon.ico` via `installer/make_icon.py`)
- [x] Write `installer/typesimulator.spec` (PyInstaller bundle with `collect_all("webview")`, `pythonnet`, `clr_loader`, `pynput`, and `frontend/dist/`)
- [x] Write `installer/build.ps1` one-command Windows build script with strict exit-code checks
- [x] Write `installer/setup.iss` (Inno Setup 6 wizard, per-user install, Start Menu & optional Desktop shortcuts, clean uninstaller)
- [x] Compiled standalone installer: `installer/output/TypeSimulator-Setup-v2.0.0.exe` (**14.67 MB**)
- [x] User smoke-test of installed `TypeSimulator-Setup-v2.0.0.exe` passed (global hotkeys, Focus Guard, Compact HUD)

**Exit Gate:** Passed — installer compiled cleanly at `14.67 MB` and verified by user smoke test.

---

## Phase 5: Documentation, Release & Portfolio Polish *(In Progress)*
**Goal:** Make the repository GitHub-ready and release v2.0.0.

- [x] Update `README.md` with v2 architecture, accurate PowerShell commands, Vercel deploy guide, and installer build guide
- [x] Add GitHub Actions CI workflow (`.github/workflows/ci.yml`) running `pytest` + `frontend` Web & Desktop builds
- [x] Update `phase-doc.md` and `memory.md`
- [ ] Publish GitHub Release `v2.0.0` attaching `TypeSimulator-Setup-v2.0.0.exe` and configure `VITE_DOWNLOAD_URL` in Vercel (if repo URL differs from default)
