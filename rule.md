# TypeSimulator v2 — Engineering Rules & Guardrails

These rules govern all code, architecture, UI integration, and release work in this repository. Never silently violate an invariant below; if a trade-off requires a change, document it in `memory.md` first.

---

## 1. Architectural Boundaries

1. **Strict Adapter Isolation:**
   - UI components in `frontend/src/components/` MUST NEVER directly reference `window.pywebview` or browser-only simulation timers.
   - All engine actions, snippet persistence, and window controls MUST flow exclusively through `EngineAdapter` (`frontend/src/adapters/engineAdapter.ts`) and `useTypingEngine`.
2. **Single Frontend Source of Truth:**
   - Do not build parallel UIs (no resurrecting CustomTkinter). The Figma Pro React/Vite app in `frontend/` is the sole UI for both Vercel Web Mode and the PyWebView Desktop app.
3. **Desktop vs. Web Parity:**
   - The `WebSandboxAdapter` and `backend/engine.py` MUST implement the exact same FSM state names, sanitizer rule categories, preset parameters, and `EngineSnapshot` payload shape so UI behavior is identical across Web and Desktop.
4. **Zero Heavy OS Dependencies:**
   - Use Python standard library `ctypes` (`user32.dll`) for Win32 foreground window detection (`focus_guard.py`). Do NOT pull in `pywin32` unless strictly justified, as it bloats and complicates PyInstaller builds.

---

## 2. Safety & Concurrency Invariants (Non-Negotiable)

1. **No Concurrent Typing Threads:**
   - `start()` / hotkey trigger MUST be rejected or treated as `resume()` (when `PAUSED`) under an `RLock`. Two typing threads may NEVER execute simultaneously.
2. **Instantaneous Abort/Pause Latency:**
   - NEVER call `time.sleep()` inside the typing loop or countdown loop. ALWAYS use `threading.Event.wait(timeout)` so Pause, Abort, and Focus Guard stop execution immediately.
3. **Non-Destructive Default Behavior:**
   - Aborting or pausing MUST NEVER wipe the user's staged text.
   - `clearOnComplete` defaults to `false`.
4. **No Destructive Default Hotkeys:**
   - Bare `<esc>` MUST NOT be the default global abort hotkey (it propagates to target apps and closes dialogs/modals). Default is `Ctrl+Shift+Esc`.
5. **Focus Guard Fail-Safe:**
   - When `focusGuardEnabled` is true and foreground `HWND` changes mid-run, transition immediately to `PAUSED` before injecting the next keystroke and report the new window title to the UI.
6. **Clean Resource Teardown:**
   - Closing the PyWebView window MUST stop the typing engine, stop the `pynput` global hotkey listener, and flush config/snippets cleanly with zero orphaned threads.

---

## 3. Figma Pro Frontend Handoff Rules

1. **Drop Location:** Exported Figma Pro React/Vite code goes into `frontend/`.
2. **Minimal-Surgery Integration:** Preserve the Figma visual styling, typography, spacing, and animations verbatim. Refactor ONLY state/data wiring into `frontend/src/types/engine.ts`, `frontend/src/adapters/`, and `frontend/src/hooks/useTypingEngine.ts`.
3. **Runtime Detection Rule:**
   - Desktop Mode is active when `window.pywebview !== undefined` OR `import.meta.env.VITE_RUNTIME_MODE === 'desktop'`.
   - In Desktop Mode, marketing/hero/download chrome is hidden and the app boots directly into the **Studio** view.
   - In Web Mode (Vercel), users can seamlessly navigate between **Overview / Download** and **Live Sandbox Studio** (which displays the interactive Paste-Blocked target sandbox).
4. **No Hardcoded Localhost URLs:** Desktop PyWebView loads bundled static assets directly from `frontend/dist/index.html` (or Vite dev server only when `TYPESIM_DEV_URL` env var is explicitly set during local development).

---

## 4. Code Quality, Testing & Documentation Rules

1. **Type Safety Everywhere:**
   - Python backend uses strict type annotations (`dataclasses`, `Literal`, `Protocol` / `TypedDict`) compatible with Python 3.10+.
   - Frontend uses TypeScript (`strict: true` where possible; no untyped `any` across adapter boundaries).
2. **Test Coverage Requirements:**
   - Every core backend module (`sanitizer.py`, `cadence.py`, `engine.py` FSM transitions, `storage.py`) MUST have deterministic `pytest` unit tests using a mock keystroke injector (never send real OS keystrokes during automated tests!).
   - Frontend must pass `npm run build` (TypeScript + Vite production build) with zero errors before any phase is marked complete.
3. **No Silent Failures:**
   - Catch and surface `pynput` hotkey registration errors, invalid hotkey strings, storage permission errors, and UAC/elevation warnings cleanly to the UI as structured error messages.
4. **Keep Governance Docs Alive:**
   - Update `phase-doc.md` checkboxes and `memory.md` at the completion of every phase or major architectural change.
   - Never let `README.md` or `architecture.md` drift from actual commands or file paths (especially Windows PowerShell commands).

---

## 5. Git & Packaging Hygiene

1. Never commit `venv/`, `node_modules/`, `frontend/dist/`, `build/`, `dist/`, `__pycache__/`, or `.env` files.
2. Semantic versioning (`v2.0.0`, `v2.1.0`, etc.) must stay synchronized across `pyproject.toml`, `frontend/package.json`, and `installer/setup.iss`.
3. Keep `legacy/` isolated once v1 files are archived, or remove cleanly only after v2 desktop build passes full manual verification.
