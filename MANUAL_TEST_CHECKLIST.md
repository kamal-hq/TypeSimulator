# TypeSimulator v2 — Pre-Merge Regression & Manual Test Checklist

**Branch Under Verification:** `security-compliance-audit`  
**Base Branch:** `main` (`afa13c4`, untouched)  
**Automated Verification Status:** `pytest` **34 / 34 passed** (including `tests/test_security.py` and `tests/test_regression_e2e.py`); `npm audit` **0 vulnerabilities**; `npm run build:web` & `npm run build:desktop` **0 errors, 0 warnings**.

---

## 1. Commits on `security-compliance-audit` (What Each Touched)

| Commit | Summary | Files Touched |
| :--- | :--- | :--- |
| `a132e20` | Cover all `.env*` files in `.gitignore` & add `.env.example` | `.gitignore`, `.env.example` |
| `761bd9b` | Switch CI to `npm ci` & set `permissions: contents: read` | `.github/workflows/ci.yml` |
| `250ece7` | Add MIT `LICENSE` & `THIRD_PARTY_NOTICES.md` | `LICENSE`, `THIRD_PARTY_NOTICES.md` |
| `2f41b2b` | Harden PyWebView IPC, loopback server, origin guard, Desktop Report-Only CSP, payload/snippet limits, `clear_all_data`, & keystroke privacy tests | `backend/bridge.py`, `backend/desktop_app.py`, `backend/storage.py`, `tests/test_security.py` |
| `20b3fda` | Self-host Inter & JetBrains Mono fonts, add Web Report-Only CSP + headers, harden external links & adapter limits | `frontend/package.json`, `frontend/package-lock.json`, `frontend/vercel.json`, `frontend/src/main.tsx`, `frontend/src/index.css`, `frontend/src/App.tsx`, `frontend/src/vite-env.d.ts`, `frontend/src/config/links.ts`, `frontend/src/adapters/*`, `frontend/src/hooks/useTypingEngine.ts`, `frontend/src/components/TopBar.tsx` |
| `90661d1` | Add Privacy Policy & Terms of Service pages, confirmed **Clear all local data** UI, & README SmartScreen/SHA-256 docs | `frontend/src/components/LegalPage.tsx`, `frontend/src/App.tsx`, `frontend/src/components/OverviewPage.tsx`, `frontend/src/components/StudioWorkspace.tsx`, `frontend/src/components/InspectorSidebar.tsx`, `README.md` |
| `1af0452` | Add `SECURITY_AUDIT.md` & update `memory.md` | `SECURITY_AUDIT.md`, `memory.md` |
| *(Test commit)* | Add E2E regression tests (`LocalStaticServer`, `DesktopBridge`, navigation guard, `vercel.json`, built `frontend/dist`) | `tests/test_regression_e2e.py` |
| *(This commit)* | Add this pre-merge verification checklist | `MANUAL_TEST_CHECKLIST.md` |

---

## 2. Click-by-Click Manual Test Checklist

> **How to launch both modes locally:**
> - **Web Mode:** `cd frontend` → `npm run dev` → open `http://127.0.0.1:5173` (or `npm run build:web` + `npm run preview`).
> - **Desktop Mode:** `cd frontend` → `npm run build:desktop` → `cd ..` → `python -m backend.desktop_app`.

### A. Overview Page & Typography *(Web Mode)*
- [ ] **A1. Visual & Self-Hosted Font Render** `[commits: 20b3fda]`
  1. Open the app in Web Mode (`Overview` view) with browser DevTools → **Network** tab open.
  2. Reload (`Ctrl+Shift+R`).
  3. **Expect:** Headings/UI render in **Inter**, badges/metrics render in **JetBrains Mono**, and **zero requests** appear for `fonts.googleapis.com` or `fonts.gstatic.com`.
- [ ] **A2. Overview Navigation & CTAs** `[commits: 20b3fda, 90661d1]`
  1. Click **Workflow** in the top nav → page smoothly scrolls to the 3-step workflow section.
  2. Click **Download .exe** (top right) and **Download for Windows** (hero) → both open `https://github.com/kamal-hq/TypeSimulator/releases/latest/download/TypeSimulator-Setup-v2.0.0.exe` in a new tab with no `window.opener` leak.
  3. Click **GitHub** in the footer → opens `https://github.com/kamal-hq/TypeSimulator` in a new tab.
  4. Click **Try live sandbox** → switches cleanly to the **Studio Workspace**.

### B. Compliance Pages (Privacy Policy & Terms of Service) *(Web & Desktop)*
- [ ] **B1. Open from Overview Footer (Web)** `[commits: 90661d1]`
  1. Scroll to the Overview footer → click **Privacy Policy**.
  2. Verify effective date (`November 27, 2026`), contact email (`muhammad.kamal.hq@gmail.com`), self-hosted fonts statement, keystroke privacy section, and local storage details render cleanly.
  3. Click **Terms of Service** in the top-right pill toggle → verify the amber **Acceptable Use Policy** box prohibits exam/proctoring bypass, impersonation, and third-party ToS violations.
  4. Click **Back to Overview** → returns to Overview.
- [ ] **B2. Open from Studio Safety Tab (Web & Desktop)** `[commits: 90661d1, 20b3fda]`
  1. Open Studio → click right inspector **Safety** tab → scroll to bottom of **Local data & privacy** card.
  2. Click **Privacy Policy** → click `muhammad.kamal.hq@gmail.com` mailto link (Desktop must open OS mail client without navigating WebView away from `127.0.0.1`).
  3. Click **Open Studio Safety to Clear Local Data** or **Back to Studio** → returns cleanly to Studio.

### C. Staged Payload Editor & Sanitizer Popover *(Web & Desktop)*
- [ ] **C1. Live Sanitizer Detection & Preview** `[commits: 20b3fda, 2f41b2b]`
  1. Click **Load sample** in the Staged Payload toolbar.
  2. Verify the cyan badge updates with artifact count (smart quotes, em-dash, ellipsis, bullets).
  3. Click the cyan **artifacts detected** badge → popover opens showing per-category counts.
  4. Toggle **Preview sanitized text** ON → textarea becomes read-only and displays normalized straight quotes/dashes/bullets (`UTF-8 · LF · SANITIZED PREVIEW`). Toggle OFF → original source text is completely untouched.
  5. Click the **Clear** (eraser) icon → editor clears cleanly.

### D. Telemetry, Transport & Web Paste-Blocked Sandbox *(Web Mode)*
- [ ] **D1. Paste-Blocked Target Form** `[commits: 20b3fda]`
  1. Click inside **Simulated Restricted Form** (`SECURE CONSOLE INPUT`) and press `Ctrl+V`.
  2. **Expect:** Paste is blocked and crimson toast *"Paste blocked by form policy — use TypeSimulator to inject text"* appears for ~2.8s.
- [ ] **D2. Full Typing Run, Pause, Focus Switch, Resume, Abort & Reset** `[commits: 20b3fda, 90661d1]`
  1. Stage sample text → verify **Telemetry Strip** shows live Characters, Words, Est. Duration (ETA), and Cadence sparkline.
  2. Click **Start typing** (`F9`) → verify amber `STARTING IN 3..2..1` countdown, then emerald `TYPING`, progress bar width animates smoothly, Live WPM updates, and characters type into **Simulated Restricted Form** (including occasional typo + backspace `↺` counter when Typo simulator is ON).
  3. Click **Simulate focus switch** mid-run → status immediately turns `PAUSED`, amber Focus Guard banner appears (*"Focus switched to Slack — paused at char X for safety"*), and typing halts immediately.
  4. Click **Resume** (banner or `F9`) → typing resumes from the exact paused character with zero dropped or duplicated characters.
  5. Start again, click **Abort** (`Ctrl+Shift+Esc`) mid-run → typing stops immediately, status shows `ABORTED`, and **staged payload is NOT erased**.
  6. Click **Reset** (circular arrow) → cursor resets to `0`, status returns to `IDLE`.

### E. Cadence Inspector Controls *(Web & Desktop)*
- [ ] **E1. Presets, Sliders & Key Rules** `[commits: 20b3fda, 2f41b2b]`
  1. Click each preset chip (**Natural**, **Fast**, **Thoughtful**, **Steady**) → Target speed & Variability sliders update immediately.
  2. Drag **Target speed** slider → active preset switches to **Custom** and ETA in Telemetry Strip recalculates live.
  3. Toggle **Typo simulator** OFF/ON → Error rate slider hides/shows.
  4. Toggle **Newline keystroke** between `Enter` and `Shift + Enter`, change **Tabs** dropdown (`4 spaces`, `2 spaces`, `Strip`, `Send Tab`), toggle **Strip markdown** ON/OFF (confirm markdown syntax strips in sanitized preview), and test **Clear editor on complete** ON (editor clears ONLY after reaching `COMPLETED`, NOT on Abort).

### F. Safety Tab, Global Hotkeys & Clear All Local Data *(Web & Desktop)*
- [ ] **F1. Hotkey Rebinding & Duplicate Rejection** `[commits: 20b3fda, 2f41b2b]`
  1. Open **Safety** tab → click **Start / Resume** keycap (`F9`) → press `F8` → verify keycap updates to `F8` and Transport Dock shows `F8`.
  2. Click **Pause** (`F10`) → press `F8` (duplicate) → red error banner appears (*"Global hotkeys must be unique..."*) and previous valid binding stays intact.
  3. Rebind Start / Resume back to `F9`.
- [ ] **F2. Clear All Local Data (Confirmed Deletion)** `[commits: 90661d1, 20b3fda, 2f41b2b]`
  1. Save a test snippet and change Target speed to `110 WPM`.
  2. Open **Safety** tab → click **Clear all local data** → inline confirmation box appears.
  3. Click **Cancel** → nothing is deleted; settings and snippet remain.
  4. Click **Clear all local data** → click **Confirm delete**.
  5. **Expect:** Green confirmation (*"All local data cleared and defaults restored."*), Target speed resets to `68 WPM`, editor clears, Snippets tab becomes empty, and:
     - *Web:* DevTools → Application → `localStorage` no longer contains `typesimulator-config-v2` or `typesimulator-snippets-v2`.
     - *Desktop:* `%APPDATA%\TypeSimulator\config.json` and `snippets.json` are deleted from disk.

### G. Snippets Library *(Web & Desktop)*
- [ ] **G1. Create, Search, Load & Delete Snippets** `[commits: 20b3fda, 90661d1, 2f41b2b]`
  1. Click **Save snippet** in the Editor toolbar → dark modal opens → enter Title + Tags → click **Save snippet** → appears in Snippets tab.
  2. Open **Snippets** tab → click **+ Save current text** → fill inline form → click **Save** → appears at top of list.
  3. Type a tag or keyword in the search box → list filters live.
  4. Click **LOAD →** on a snippet → replaces staged payload cleanly.
  5. Click trash icon → snippet deletes and stays deleted after reload/restart.

### H. Always-on-Top & Compact Floating HUD *(Web & Desktop)*
- [ ] **H1. Pin & Compact HUD Toggle** `[commits: 20b3fda, 2f41b2b]`
  1. Click the **Pin** icon in the Top Bar → highlights acid-lime (Desktop window stays above other windows).
  2. Click the **Compact HUD** (shrink) icon → switches to floating pill (Desktop window resizes to `580 × 96` and pins on top).
  3. Verify live status dot, target window title, progress bar, WPM, ETA, Play/Pause, and Abort buttons work inside HUD.
  4. Click **Expand** icon → returns to full Studio (`1220 × 800`) and restores previous Always-on-Top state.

### I. Desktop-Only OS Integration & Safety Flows *(Desktop Mode Only)*
- [ ] **I1. Real OS Keystroke Injection & Global Hotkeys** `[commits: 2f41b2b]`
  1. Launch `python -m backend.desktop_app` → verify Studio opens directly (no Overview/Download chrome) with `DESKTOP OS ENGINE` pill and privilege readout (`Standard User` or `Administrator`) in Safety tab.
  2. Stage a multi-line payload containing smart quotes (`“test”`), em-dash (`—`), and a newline → set `Enter` or `Shift+Enter`.
  3. Click into **Notepad** (so Notepad has OS focus) → press global **`F9`** → wait countdown → verify sanitized text types into Notepad with realistic cadence.
  4. While typing into Notepad, click into **another window** (e.g., File Explorer or browser) → verify **Focus Guard** immediately pauses typing and Studio/HUD shows `"Focus switched to <Window Title>"` with zero leaked characters into the second window.
  5. Click back into Notepad and press **`F9`** → resumes cleanly from the exact paused character to completion.
  6. Test global **`F10`** (Pause) and **`Ctrl+Shift+Esc`** (Abort) while Notepad is focused.
  7. Close the TypeSimulator window → check Task Manager / terminal returns immediately with zero orphaned Python processes or active keyboard hooks.

---

## 3. Boundary-Change Risk Matrix & Quick Tests (< 2 Minutes Each)

| # | Changed Boundary & File(s) | What Could Break | How It Would Look to a User | Quick Test (< 2 min) |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Desktop static server (`127.0.0.1:0` replacing `file://`)** (`backend/desktop_app.py`) | Ephemeral port bind failure or wrong MIME type for `.js`/`.css`/`.woff2` assets. | Blank dark `#090909` Desktop window or unstyled HTML on launch. | Run `python -m backend.desktop_app`: Studio renders styled with Inter + JetBrains Mono in < 2s. Also covered by `tests/test_regression_e2e.py`. |
| **2** | **`TYPESIM_DEV_URL` loopback allowlist & frozen disable** (`backend/desktop_app.py`) | Setting a valid local Vite URL with IPv6 `[::1]` or `https://` gets rejected; setting remote URL raises `ValueError`. | Startup crash with `ValueError` if someone passes a non-`http://127.0.0.1` / `localhost` URL. | PowerShell: `$env:TYPESIM_DEV_URL="https://example.com"; python -m backend.desktop_app` → fails fast with `ValueError`; clear `$env:TYPESIM_DEV_URL=""` → launches normally. |
| **3** | **`TYPESIM_DEBUG` ignored when frozen** (`backend/desktop_app.py`) | Cannot open DevTools in packaged `.exe` even if `TYPESIM_DEBUG=1` is set. | Right-click Inspect / F12 DevTools stay disabled in installed `.exe` (intended); still works when running from source (`python -m backend.desktop_app`). | Run `$env:TYPESIM_DEBUG="1"; python -m backend.desktop_app` → F12 opens DevTools from source; verified frozen=`False` in `test_security.py`. |
| **4** | **WebView2 `NavigationStarting` guard + Frontend click interceptor + `open_external_url` allowlist** (`backend/desktop_app.py`, `backend/bridge.py`, `frontend/src/App.tsx`, `frontend/src/config/links.ts`) | Over-strict origin comparison blocks internal reloads or a legitimate link (e.g., custom `VITE_DOWNLOAD_URL` on a different host in Desktop mode). | Clicking an allowlisted link does nothing, or Desktop stays stuck on a blank page if navigation is cancelled unexpectedly. | In Desktop mode: click Privacy Policy → click `github.com/kamal-hq/TypeSimulator` and `muhammad.kamal.hq@gmail.com` → OS browser/mail opens while Desktop window stays on Studio. In DevTools console run `location.href = "https://example.com"` → blocked; window stays on Studio! |
| **5** | **`evaluate_js` ASCII + `<`/`>` escaping** (`backend/bridge.py`) | Double-escaping or malformed JSON breaking `window.__typeSimulatorOnEvent(...)`. | Live WPM, progress bar, countdown, and Focus Guard pause banner freeze at `IDLE` / `0%` during Desktop typing. | Open Notepad with a Unicode/special title or any window → trigger `F9` → verify progress bar, Live WPM, and `targetWindowTitle` update live in Desktop Studio. |
| **6** | **Payload (100k chars) & Snippet (50k chars / 200 max / 120 title / 10 tags) caps** (`backend/bridge.py`, `backend/storage.py`, `frontend/src/adapters/*`) | Large pasted essays (>100k chars) silently truncated in editor textarea or rejected on Start/Save. | Textarea stops accepting characters past 100,000 chars; saving >50,000-char snippet shows red error banner in Studio. | Paste >100k chars (or test via `pytest tests/test_regression_e2e.py`) → exact 100k accepted; >50k snippet shows clear red error banner instead of crashing. |
| **7** | **`clear_all_data()` disk & `localStorage` wipe** (`backend/bridge.py`, `backend/storage.py`, `frontend/src/adapters/*`) | File-lock error on Windows if config/snippets are being written concurrently, or hotkeys not rebounding back to defaults. | Old custom hotkeys keep firing after clear, or snippets reappear immediately. | Change hotkey to `F8` + save snippet → Safety → **Clear all local data** → Confirm → verify `%APPDATA%\TypeSimulator\` JSON files vanish and `F9` works again. |
| **8** | **Self-hosted `@fontsource` fonts replacing Google Fonts CDN** (`frontend/src/main.tsx`, `frontend/src/index.css`) | Missing font weight or broken relative font path in Desktop `build:desktop`. | UI falls back to system Arial/Consolas fonts, or 404s in DevTools Network tab for `.woff2`. | Open DevTools Network tab (filter `Font`) on both Web & Desktop → confirm `inter-latin-*.woff2` and `jetbrains-mono-latin-*.woff2` return `200 OK` from app origin and zero requests go to Google. |
| **9** | **HTTP Security Headers & Report-Only CSP** (`frontend/vercel.json`, `backend/desktop_app.py`) | `X-Frame-Options: DENY` blocks iframe embeds if you ever embed the site; `Report-Only` CSP logs violations if an unexpected inline script or external resource appears. | Site refuses to render inside an `<iframe>` (intended); CSP warnings appear in DevTools Console (non-blocking while Report-Only). | Open DevTools Console on Vercel preview & Desktop (`TYPESIM_DEBUG=1`) → exercise every tab, modal, HUD, and typing run → confirm **zero** `[Report Only] Refused to ...` messages. |
| **10** | **`LocalStaticServer` path traversal & read-only method block** (`backend/desktop_app.py`) | Valid nested asset paths misclassified as traversal (`403`). | Missing CSS/JS/font assets (`403`) in Desktop mode. | Launch Desktop mode + run `pytest tests/test_regression_e2e.py::test_e2e_local_static_server_serves_assets_enforces_headers_and_rejects_bad_requests` → valid `/assets/*` return `200`, `..%2F` returns `403`, `POST` returns `501`. |
| **11** | **CI `npm ci` + `permissions: contents: read`** (`.github/workflows/ci.yml`) | Lockfile drift between `package.json` and `package-lock.json` causes `npm ci` to fail in CI. | Red `frontend-build` check on GitHub Actions PR. | Run `npm --prefix frontend ci --dry-run` (or push PR to branch) → completes cleanly with zero lockfile mismatch errors. |

---

## 4. Header Enforcement Status by File

| File | Header | Mode | Value |
| :--- | :--- | :---: | :--- |
| `frontend/vercel.json` | `Content-Security-Policy-Report-Only` | **REPORT-ONLY** | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'` |
| `frontend/vercel.json` | `Strict-Transport-Security` | **ENFORCED** | `max-age=31536000; includeSubDomains` |
| `frontend/vercel.json` | `X-Content-Type-Options` | **ENFORCED** | `nosniff` |
| `frontend/vercel.json` | `X-Frame-Options` | **ENFORCED** | `DENY` |
| `frontend/vercel.json` | `Referrer-Policy` | **ENFORCED** | `strict-origin-when-cross-origin` |
| `frontend/vercel.json` | `Permissions-Policy` | **ENFORCED** | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `backend/desktop_app.py` | `Content-Security-Policy-Report-Only` | **REPORT-ONLY** | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'` |
| `backend/desktop_app.py` | `X-Content-Type-Options` | **ENFORCED** | `nosniff` |
| `backend/desktop_app.py` | `X-Frame-Options` | **ENFORCED** | `DENY` |
| `backend/desktop_app.py` | `Referrer-Policy` | **ENFORCED** | `no-referrer` |
| `backend/desktop_app.py` | `Permissions-Policy` | **ENFORCED** | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `backend/desktop_app.py` | `Cache-Control` | **ENFORCED** | `no-store` |

> **Confirmed:** Neither `frontend/vercel.json` nor `backend/desktop_app.py` sends an enforcing `Content-Security-Policy` header yet. Automated test `tests/test_regression_e2e.py::test_vercel_json_headers_and_enforcement_contract` and `test_e2e_local_static_server_serves_assets_enforces_headers_and_rejects_bad_requests` assert this explicitly.

---

## 5. Automated Regression Verification Results

Ran `python -m pytest -p no:cacheprovider`: **34 / 34 passed** (`16.38s`), including 5 new end-to-end tests in `tests/test_regression_e2e.py`:
- **`test_e2e_desktop_bridge_full_user_workflow_and_boundary_caps`:** Exercised full `DesktopBridge` session (runtime info, config update, sanitize, exact 100k payload & 50k snippet boundary acceptance + `+1` rejection, typing run + Focus Guard auto-pause with malicious `\u2029</script>` window title + pure-ASCII `evaluate_js` JSON verification + resume to completion, Compact HUD resize/restore, external link allowlist pass/block, and `clear_all_data()` disk cleanup).
- **`test_e2e_webview_navigation_guard_blocks_off_origin_and_routes_allowlisted`:** Simulated native WebView2 `NavigationStarting` events confirming same-origin & `about:blank` pass, allowlisted GitHub links cancel in-WebView and route to OS browser, and untrusted `https://`, `javascript:`, and `file://` URLs are cancelled and never opened.
- **`test_e2e_local_static_server_serves_assets_enforces_headers_and_rejects_bad_requests`:** Started real `LocalStaticServer`, verified `200` on `/`, `/index.html`, CSS, JS, `.woff2`, `HEAD`, exact Report-Only CSP + enforced headers, no wildcard CORS, `404` on missing files, `501` on `POST`, and `403` on URL-encoded/backslash path traversal.
- **`test_vercel_json_headers_and_enforcement_contract`:** Confirmed `npm ci`, Report-Only CSP (no enforcing CSP), `font-src 'self'`, and all 5 enforced headers.
- **`test_e2e_real_built_frontend_served_by_local_static_server`:** Served the actual compiled `frontend/dist` bundle over `LocalStaticServer`, fetched `index.html`, JS, CSS, and live `Inter` + `JetBrains Mono` `.woff2` font files (`wOF2` header bytes verified), confirmed Privacy Policy / Terms / `muhammad.kamal.hq@gmail.com` / `Clear all local data` are bundled, and verified zero Google Fonts CDN URLs or placeholders exist.

---

## 6. Every User-Visible Difference Between `main` and `security-compliance-audit`

1. **New Compliance Links & Pages:**
   - **Overview footer** now includes **Privacy Policy** and **Terms of Service** buttons.
   - **Studio → Safety tab** now includes **Privacy Policy** and **Terms of Service** links at the bottom of the new **Local data & privacy** card.
   - Clicking either opens a styled full-page legal view (with Acceptable Use policy and `muhammad.kamal.hq@gmail.com` contact) and a **Back to Overview / Back to Studio** button.
2. **New "Clear All Local Data" Control:**
   - **Studio → Safety tab** now has a **Clear all local data** button with an inline **Cancel / Confirm delete** prompt and a green *"All local data cleared and defaults restored."* feedback message.
3. **New Input Size & Count Caps + Error Banner:**
   - Staged payload is capped at **100,000 characters** (textarea clamps at 100k; bridge RPC rejects >100k with a clear `ValueError`).
   - Saved snippets are capped at **50,000 characters**, **200 total snippets**, **120-char titles**, and **10 tags (32 chars each)**; hitting a snippet or engine error displays a red inline alert banner below the editor.
4. **Removed External Network Calls (Zero Google Fonts CDN):**
   - Neither Web nor Desktop contacts `fonts.googleapis.com` or `fonts.gstatic.com` anymore; Inter and JetBrains Mono load directly from local bundle assets (visually identical, works 100% offline in Desktop mode, slightly larger static assets directory).
5. **Desktop Runtime Origin & Link Behavior:**
   - Desktop mode now loads from a local `http://127.0.0.1:<ephemeral-port>/index.html` loopback server instead of `file:///...`.
   - Clicking an allowlisted link (`github.com/kamal-hq/TypeSimulator*` or `mailto:muhammad.kamal.hq@gmail.com`) in Desktop opens your default browser/mail app while keeping the WebView locked to Studio; any non-allowlisted external navigation or download inside WebView2 is silently blocked.
6. **Developer Environment Variable Restrictions:**
   - `TYPESIM_DEV_URL` now only accepts `http://127.0.0.1` or `http://localhost` (raising `ValueError` on remote URLs) and is completely ignored in packaged `.exe` builds.
   - `TYPESIM_DEBUG=1` is completely ignored in packaged `.exe` builds.
7. **Web Embedding Restriction (Enforced Header):**
   - `X-Frame-Options: DENY` on Vercel prevents the live site from being embedded inside third-party `<iframe>` elements.
8. **New Repo Docs & Notices:**
   - Added `LICENSE` (MIT), `THIRD_PARTY_NOTICES.md`, `.env.example`, `SECURITY_AUDIT.md`, `MANUAL_TEST_CHECKLIST.md`, and a SmartScreen/SHA-256 verification section in `README.md`.
