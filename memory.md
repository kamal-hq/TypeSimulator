# TypeSimulator v2 — Project Memory & Decision Log

This file is the living memory of the project: architectural decisions, constraints, phase progress, and gotchas. Update this whenever a phase completes or a design/tech decision changes.

---

## 1. Current Project Status

- **Active Phase:** Phase 5 — GitHub Release `v2.0.0` & Vercel Deployment
- **Repository:** `https://github.com/kamal-hq/TypeSimulator` (branch `main`)
- **Last Updated:** 2026-11-22
- **Verification Summary:**
  - `pytest`: **19/19 passing** (`tests/test_sanitizer.py`, `test_cadence.py`, `test_engine_fsm.py`, `test_hotkeys.py`, `test_storage.py`, `test_bridge.py`).
  - Frontend Web build (`npm run build:web`): **0 TypeScript errors, 0 Vite warnings**, 87.51 kB gzipped JS.
  - Frontend Desktop build (`npm run build:desktop`): **0 TypeScript errors, 0 Vite warnings**, relative `./` base for PyWebView `file://`.
  - Standalone Windows Installer: **`installer/output/TypeSimulator-Setup-v2.0.0.exe` (14.67 MB)** compiled cleanly via PyInstaller + Inno Setup 6.7.3 and **passed user smoke test**.
- **Legacy v1 Status:** Archived into `legacy/` (`engine.py`, `main.py`, `ui.py`). Raw Figma export folder removed after full integration into `frontend/`.

---

## 2. Architectural Decision Records (ADRs)

### ADR-001: Desktop Shell & Installer Stack → Option 1A (PyWebView + Python Engine v2 + PyInstaller + Inno Setup)
- **Date:** 2026-11-22
- **Decision:** Keep the backend in Python (`backend/`), render the Figma Pro React/Vite frontend inside Windows native Edge WebView2 via `pywebview`, bundle with PyInstaller, and distribute via an Inno Setup `.exe` installer.
- **Rationale:** Preserves and levels up the project's Python engineering core while upgrading the UI from CustomTkinter to a production-grade Figma-designed React interface with zero duplicate UI maintenance.

### ADR-002: Vercel Web Presence → Option 2A (Unified Landing + Interactive Paste-Blocked Sandbox + Download Portal)
- **Date:** 2026-11-22
- **Decision:** Deploy the same `frontend/` React app to Vercel in `web` mode, offering a product overview, direct Windows `.exe` installer download CTA, and a fully working in-browser Paste-Blocked Sandbox Studio.
- **Rationale:** Web browsers cannot inject OS-level keystrokes due to sandboxing. Running the exact same Studio UI against `WebSandboxAdapter` lets recruiters and users immediately test cadence, typos, sanitizer diffs, and compact HUD right in their browser before downloading the desktop app.

### ADR-003: Full v2 Feature Scope Locked
- **Date:** 2026-11-22
- **Decision:** Ship full v2 feature set: WPM presets & log-normal cadence, QWERTY typo simulator + backspace correction, expanded sanitizer + live diff counts, non-destructive Pause/Resume/Abort with cursor tracking, pre-start countdown, Win32 `ctypes` Active-Window Focus Guard, customizable global hotkeys (`F9` / `F10` / `Ctrl+Shift+Esc`), Compact Floating HUD, Always-on-Top, and Local Snippets library.

### ADR-004: Win32 Focus Guard via `ctypes` (No `pywin32`)
- **Date:** 2026-11-22
- **Decision:** Use Python's built-in `ctypes.windll.user32` (`GetForegroundWindow`, `GetWindowTextW`) and `shell32.IsUserAnAdmin()` instead of `pywin32`.
- **Rationale:** Zero native dependency headaches during PyInstaller bundling and smaller installer size (final `.exe` installer is only 14.67 MB).

### ADR-005: Replace Bare `<esc>` Default Abort Hotkey
- **Date:** 2026-11-22
- **Decision:** Change default global abort from `<esc>` to `Ctrl+Shift+Esc` (configurable by user).
- **Rationale:** Global `pynput` hooks observe rather than swallow keys; bare `ESC` leaked into target web browsers and closed modals/forms mid-typing.

### ADR-006: Inline Snippet Modals & `pywebviewready` Sync
- **Date:** 2026-11-22
- **Decision:** Replaced Figma export's `window.prompt()` calls with inline dark-studio modal/forms, added `pywebviewready` bootstrap listener, and debounced `set_staged_text` sync from React to Python.
- **Rationale:** `window.prompt()` is unreliable in Edge WebView2; syncing staged text to Python lets global `F9` start typing immediately from any external window without needing a JS round-trip.

### ADR-007: Per-User Inno Setup Installer (`PrivilegesRequired=lowest`)
- **Date:** 2026-11-22
- **Decision:** Configure `setup.iss` to install under `{localappdata}\TypeSimulator` without requiring Administrator elevation to install.
- **Rationale:** Frictionless Windows install experience; users only need to run as Administrator at runtime if targeting elevated Administrator windows due to Windows UIPI.

---

## 3. Known Constraints & Environment Gotchas

- **OS & Shell:** Developer workstation runs Windows with PowerShell 5.1 (`&&` is not supported in PS 5.1; `installer/build.ps1` uses an explicit `Invoke-Checked` `$LASTEXITCODE` wrapper after every native command).
- **Windows UAC / UIPI Constraint:** An un-elevated process using `SendInput` (`pynput`) cannot inject keystrokes into an elevated (Run as Administrator) target window. The Safety tab displays the current process privilege (`Administrator` vs `Standard User`).
- **PyInstaller + PyWebView:** `installer/typesimulator.spec` uses `collect_all("webview")`, `collect_all("pythonnet")`, and `collect_all("clr_loader")` to ensure all WebView2Loader and WebBrowserInterop DLLs are bundled cleanly.
- **Figma Export Fixes Applied During Integration:**
  1. Fixed WebSandbox WPM delay bug (`12000 / (wpm * 5)` was 5× too fast → fixed to `12000 / wpm` ms with log-normal dispersion and full 26-key QWERTY neighbor map).
  2. Fixed Compact HUD `onExpand` missing `adapter.setCompactHud(false)` call.
  3. Replaced Vite 8 deprecated `__dirname` with `import.meta.dirname`.
  4. Added `Enter`/`Shift+Enter` control, interactive click-to-record hotkey rebinding, dynamic target window title, and wired Release/GitHub URLs (`frontend/src/config/links.ts`).

---

## 4. Historical Baseline (v1 Prototype Audit Findings — Resolved in v2)
1. Double-F9 race condition spawning concurrent typing threads (`legacy/main.py:18-33`) → Fixed via `RLock` FSM.
2. Unconditional `clear_text()` wiping staged text on abort (`legacy/main.py:15`) → Fixed; non-destructive by default.
3. `time.sleep()` causing up to 250ms abort latency (`legacy/engine.py:44`) → Fixed via `Event.wait()`.
4. Flat `random.uniform()` cadence and missing `\t` / `Shift+Enter` control-key handling → Fixed in `backend/cadence.py` & `backend/engine.py`.
5. Missing `listener.stop()` teardown on app exit → Fixed via `window.events.closed`.
6. Doc drift between `architecture.md`, `README.md`, and code → Resolved across all 5 docs & README.
