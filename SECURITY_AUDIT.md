# TypeSimulator v2 — Security & Compliance Audit Report

**Audit Date:** November 27, 2026  
**Repository:** `kamal-hq/TypeSimulator`  
**Audit Branch:** `security-compliance-audit` (branched from `main` @ `afa13c4`; `main` untouched, nothing pushed)  
**Contact:** `muhammad.kamal.hq@gmail.com`

---

## 1. Executive Summary

- **Risk Rating:** **Medium-High (pre-audit) → Low (post-audit fixes on `security-compliance-audit`)**
- **Key Takeaway:** TypeSimulator has no authentication, no database, no server API routes, and no leaked secrets anywhere in working tree or git history. Its primary attack surface is the **Windows Desktop PyWebView host**, where JavaScript has privileged access to OS-level keystroke injection (`window.pywebview.api`)—meaning any off-origin navigation, arbitrary `TYPESIM_DEV_URL` override, or XSS in the WebView would equal arbitrary OS keystroke injection. All critical IPC, origin-isolation, font-privacy, input-limit, and compliance gaps have been fixed on this branch without changing existing user functionality.

### Top 5 Things You Must Do Now
1. **Review & Merge `security-compliance-audit` → `main`:** Inspect the 7 atomic commits, merge to `main`, and let Vercel deploy the new self-hosted fonts, security headers, and Privacy/Terms pages.
2. **Test Report-Only CSP & Flip to Enforcing:** Open browser DevTools (Vercel) and WebView2 DevTools (`TYPESIM_DEBUG=1 python -m backend.desktop_app`), run the verification checklist in Section 5.2, and once zero violations appear, promote `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
3. **Rebuild the Desktop Installer & Publish SHA-256:** After merging, run `.\installer\build.ps1`, run `Get-FileHash .\installer\output\TypeSimulator-Setup-v2.0.0.exe -Algorithm SHA256`, and attach the updated installer + SHA-256 checksum to GitHub Release `v2.0.1` (or updated `v2.0.0`).
4. **Apply the Proposed LGPL-3.0 Installer/Spec Update (Section 5.1):** Bundle `LICENSE`, `THIRD_PARTY_NOTICES.md`, and LGPL-3.0/GPL-3.0 texts inside `installer/setup.iss` and decide on your `pynput` relinking strategy before wide public binary distribution.
5. **Pin GitHub Actions to Commit SHAs & Evaluate Code Signing:** Apply the proposed commit-SHA pins in `.github/workflows/ci.yml` (Section 5.3) and consider **Azure Trusted Signing** or **SignPath.io** (free for OSS) to remove Windows SmartScreen warnings.

---

## 2. Feature Map & Phase Applicability

| Feature | Present? | Evidence | Audit Phase Status |
| :--- | :---: | :--- | :--- |
| **Phase 0 — Recon & Data Flow** | Yes | Full repo (`main` @ `afa13c4`) | **Ran** |
| **Phase 1 — Secrets & Env Vars** | Yes | Full git history (`40cd7ca..afa13c4`), `.gitignore`, `.env.example`, `VITE_*` | **Ran** |
| **Phase 2 — User Login / Auth & Sessions** | **No** | No auth libraries, routes, cookies, or sessions anywhere | **Skipped:** user login not present |
| **Phase 3 — Database / Supabase / Storage Buckets** | **No** | No DB client, SQL, ORM, or cloud storage buckets | **Skipped:** database not present |
| **Phase 4 — Application & Desktop Security** | Yes | PyWebView IPC (`backend/desktop_app.py`, `backend/bridge.py`), `pynput` hotkeys (`backend/hotkeys.py`), local JSON (`backend/storage.py`), Vercel headers (`frontend/vercel.json`), npm deps, CI (`ci.yml`) | **Ran** (customized for PyWebView Desktop + Static Web SPA; server-endpoint/SSRF/third-party-API sub-checks skipped as not present) |
| **Phase 5 — Compliance Pages, Data Deletion & Licenses** | Yes | `LegalPage.tsx`, `InspectorSidebar.tsx`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `README.md` | **Ran** (Cookie consent & Google OAuth consent screen skipped as cookies/analytics/OAuth are not present) |
| **Phase 6 — Final Verification** | Yes | `pytest` (29/29), `npm audit` (0 vulns), `build:web`, `build:desktop`, placeholder & CDN grep | **Ran** |

### Verified Personal Data Flow (Post-Audit)
- **Staged payloads:** In-memory only (React state + `DesktopBridge._staged_text`); never sent over the network.
- **Saved snippets & preferences:** Stored strictly locally (`localStorage` in Web Mode; plaintext `%APPDATA%\TypeSimulator\config.json` & `snippets.json` in Desktop Mode). One-click confirmed deletion added via **Clear all local data**.
- **Active window titles (Desktop Focus Guard):** Transient in-memory reads via Win32 `user32.GetWindowTextW` only; never persisted or transmitted.
- **Keystrokes (Desktop Global Hotkeys):** Verified in `pynput 1.8.2` (`GlobalHotKeys._on_press` & `HotKey.press`) and regression-tested in `tests/test_security.py`: non-hotkey keys are discarded immediately in memory—nothing typed is logged, stored, or transmitted.
- **Third-party network calls:** Zero font CDN requests (Inter & JetBrains Mono are now self-hosted in `frontend/dist/assets/`). Web hosting uses Vercel CDN (standard edge access logs); outbound GitHub/mailto links open only on explicit user click.

---

## 3. Findings Table

| ID | Severity | Location (`file:line`) | Issue | Status | How to Verify |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Critical** | `backend/desktop_app.py:16-39`, `webview/platforms/edgechromium.py` | **Unrestricted WebView2 navigation & `TYPESIM_DEV_URL` override:** PyWebView injects `window.pywebview.api` (OS keystroke injection) on every `NavigationCompleted` event, `OPEN_EXTERNAL_LINKS_IN_BROWSER` defaulted to `True` without an allowlist, and `TYPESIM_DEV_URL` accepted arbitrary remote URLs even in packaged `.exe` builds. | **Fixed** | `tests/test_security.py` (`test_dev_url_restricted_to_loopback_and_disabled_when_frozen`, `test_navigation_guard_blocks_off_origin_and_dangerous_schemes`, `test_open_external_url_enforces_allowlist`); `desktop_app.py` now serves over `127.0.0.1`, disables `ALLOW_FILE_URLS`/`ALLOW_DOWNLOADS`/`OPEN_EXTERNAL_LINKS_IN_BROWSER`, hooks `NavigationStarting`, and restricts external links to an explicit allowlist. |
| **SEC-02** | **High** | `backend/desktop_app.py:58` | **`TYPESIM_DEBUG` enabled DevTools in frozen `.exe` builds:** Setting `TYPESIM_DEBUG=1` in the user environment could expose WebView2 DevTools with direct `window.pywebview.api` access in production installs. | **Fixed** | `tests/test_security.py::test_debug_flag_disabled_when_frozen` verifies `is_debug_enabled(is_frozen=True)` always returns `False`. |
| **SEC-03** | **High** | `frontend/vercel.json`, `backend/desktop_app.py` | **Missing CSP & HTTP security headers on both Web and Desktop:** No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, or `Permissions-Policy`. | **Fixed (CSP in Report-Only; Needs Approval to enforce)** | Inspect `frontend/vercel.json` headers; run `tests/test_security.py::test_local_static_server_delivers_report_only_csp_and_blocks_traversal`; test per Section 5.2 before switching to enforcing CSP. |
| **SEC-04** | **Medium** | `backend/bridge.py:80-85` | **`evaluate_js` string interpolation edge case:** `json.dumps(..., ensure_ascii=False)` allowed raw Unicode line/paragraph separators (`\u2028`/`\u2029`) or `<script>` sequences from external OS window titles inside `evaluate_js`. | **Fixed** | `tests/test_security.py::test_evaluate_js_serializer_outputs_pure_ascii_and_escapes_script_breakers` verifies pure ASCII + `\`-escaped `<`/`>`. |
| **SEC-05** | **Medium** | `frontend/src/index.css:1` | **Unnecessary third-party Google Fonts CDN requests (Privacy/GDPR):** Both Web and Desktop modes loaded `fonts.googleapis.com` on startup, exposing user IP & User-Agent to Google and requiring external `font-src` CSP allowances. | **Fixed** | Self-hosted `@fontsource/inter` and `@fontsource/jetbrains-mono` in `frontend/src/main.tsx`. Grep over `frontend/dist/` confirms zero `fonts.googleapis.com` / `fonts.gstatic.com` references. |
| **SEC-06** | **Medium** | `backend/bridge.py`, `backend/storage.py`, `frontend/src/adapters/` | **Unbounded payload & snippet sizes/counts:** No cap on staged text length or saved snippet count/size allowed accidental memory exhaustion or unbounded `%APPDATA%` / `localStorage` growth. | **Fixed** | `tests/test_security.py::test_payload_and_snippet_size_and_count_limits` verifies 100k payload cap, 50k snippet cap, 200 snippet max, and title/tag bounds. |
| **SEC-07** | **Medium** | `frontend/src/config/links.ts:1-7`, `OverviewPage.tsx`, `TopBar.tsx` | **Unvalidated `VITE_DOWNLOAD_URL`/`VITE_GITHUB_URL` scheme & `rel` hardening:** Build-time env URLs were placed into `href` without validating `https:`, and external links lacked explicit `noopener`. | **Fixed** | `links.ts` enforces `safeHttpsUrl()`; all external anchors use `rel="noopener noreferrer"` and Desktop mode intercepts off-origin clicks via allowlisted `open_external_url`. |
| **SEC-08** | **Medium** | `installer/typesimulator.spec`, `installer/setup.iss` | **LGPL-3.0 redistribution compliance for bundled `pynput 1.8.2`:** Current `setup.iss` does not install `LICENSE`, `THIRD_PARTY_NOTICES.md`, or LGPL-3.0/GPL-3.0 texts, and PyInstaller's `PYZ` embeds `pynput` bytecode inside `TypeSimulator.exe`. | **Needs approval (Proposed only)** | See detailed LGPL-3.0 analysis and proposed spec/installer changes in Section 5.1. |
| **SEC-09** | **Medium** | `installer/output/TypeSimulator-Setup-v2.0.0.exe`, `README.md` | **Unsigned Windows `.exe` SmartScreen & AV trust risk:** Unsigned binaries registering global hotkeys and injecting keystrokes trigger SmartScreen/AV warnings; no checksum verification guide existed. | **Fixed (Docs) / Manual action (Signing)** | Verify new SmartScreen & `Get-FileHash -Algorithm SHA256` section in `README.md`; publish SHA-256 on GitHub Releases and see code-signing options in Section 5.4. |
| **SEC-10** | **Low** | `.github/workflows/ci.yml:13,15,30,32,37` | **CI supply-chain hardening:** Workflow lacked top-level `permissions: contents: read`, used `npm install` instead of `npm ci`, and referenced mutable major tags (`@v4`/`@v5`). | **Partially Fixed / Needs approval (SHA pinning)** | `npm ci` + `permissions: contents: read` applied in `ci.yml`; commit-SHA pinning proposed in Section 5.3. |
| **SEC-11** | **Low** | `.gitignore:15-16`, repo root | **Incomplete `.env.*` ignore rules & missing `.env.example`:** `.gitignore` missed `.env.production`/`.env.development`/etc. and had no `.env.example`. | **Fixed** | Verify `.gitignore` covers `.env`, `.env.*`, `frontend/.env*`, `!.env.example`, and `.env.example` lists variable names only. |
| **SEC-12** | **Low** | Frontend footer / Safety tab / Repo root | **Missing Privacy Policy, Terms of Service (Acceptable Use), Local Data Deletion UI, `LICENSE`, and `THIRD_PARTY_NOTICES.md`.** | **Fixed** | Open Overview footer or Studio → Safety to inspect Privacy Policy, Terms of Service (with Acceptable Use), and confirmed **Clear all local data** flow; verify `LICENSE` & `THIRD_PARTY_NOTICES.md` in repo root. |
| **SEC-13** | **Info (Verified Safe)** | `backend/hotkeys.py`, `pynput 1.8.2` | **Keystroke privacy audit:** Verified `pynput.keyboard.GlobalHotKeys` (`HotKey.press`) ignores and discards every non-hotkey keystroke immediately in memory without logging, storage, or network transmission. | **Verified Safe + Regression Tested** | `tests/test_security.py::test_keystroke_privacy_pynput_discards_non_hotkey_characters` passes cleanly. |
| **SEC-14** | **Info (Verified Safe)** | Full git history (`40cd7ca..afa13c4`), `legacy/`, `frontend/src/` | **Secrets, personal-path, legacy-license, and DOM-sink audit:** Zero leaked secrets, zero personal paths (`Asif Computers` / `C:\Users\...`), zero third-party code in `legacy/`, zero `dangerouslySetInnerHTML`/`innerHTML`/`eval` sinks, and `npm audit` reports 0 vulnerabilities. | **Verified Safe** | Verified via full `git log -p --all` scan, `Select-String` DOM sink audit, and `npm audit` (0 vulnerabilities). |

---

## 4. Commits Made (`security-compliance-audit`)

1. `a132e20` — `chore(security): cover all .env files in .gitignore and add .env.example`
2. `761bd9b` — `ci(security): switch to npm ci and set workflow permissions to contents: read`
3. `250ece7` — `chore(legal): add MIT LICENSE and THIRD_PARTY_NOTICES.md`
4. `2f41b2b` — `security(backend): harden PyWebView IPC, origin isolation, Desktop CSP, limits, and keystroke privacy tests`
5. `20b3fda` — `security(frontend): self-host fonts, add Web Report-Only CSP headers, and harden external links`
6. `90661d1` — `feat(compliance): add Privacy Policy, Terms of Service, Clear All Data UI, and SmartScreen SHA-256 docs`
7. *(This commit)* — `docs(security): add SECURITY_AUDIT.md and update project memory`

---

## 5. Manual Actions & Proposals (Needs Your Approval / Action)

### 5.1 LGPL-3.0 Compliance for `pynput` in PyInstaller Builds *(PROPOSED ONLY — NOT APPLIED)*

`pynput` (`1.8.2`) is licensed under **GNU Lesser General Public License v3.0 (LGPL-3.0)**. Shipping it inside a distributed Windows installer triggers **LGPL-3.0 Section 4** obligations:

1. **Prominent Notice & License Copies (Required):** Installed distributions must prominently state that `pynput` is used and covered by LGPL-3.0, and ship copies of **both** the GPL-3.0 and LGPL-3.0 license texts alongside your MIT `LICENSE` and `THIRD_PARTY_NOTICES.md`.
2. **Source Link / Written Offer (Required):** Identify the exact upstream `pynput` source (`https://github.com/moses-palmer/pynput`, version `1.8.2`) and ensure users can obtain the matching source code.
3. **Ability to Modify / Replace `pynput` (LGPL-3.0 Section 4(d)):**
   - **Why `onefile` builds make compliance hard:** A PyInstaller `--onefile` binary packs all Python modules and DLLs into one compressed executable; end users cannot swap `pynput` without re-running PyInstaller with the full application source and build configuration.
   - **Where TypeSimulator stands today:** `installer/typesimulator.spec` already uses an **`onedir` (`COLLECT`)** build—which is much friendlier to LGPL—**but** PyInstaller's `PYZ(a.pure)` still archives `pynput`'s compiled `.pyc` files inside the bundled archive rather than as loose files.
   - **Two Compliant Options (Proposed Changes to `installer/typesimulator.spec` & `installer/setup.iss`):**
     - **Option A — Reproducible Relinking via Open-Source MIT Repo (Section 4(d)(0)):** Because TypeSimulator itself is MIT open source with `installer/build.ps1`, `installer/typesimulator.spec`, and `requirements.txt` publicly available, users can already replace `pynput` and rebuild the executable. To make this airtight:
       1. Add `LICENSES/LGPL-3.0.txt` and `LICENSES/GPL-3.0.txt` to the repo.
       2. Add the following lines to `installer/setup.iss` under `[Files]`:
          ```iss
          Source: "..\LICENSE"; DestDir: "{app}"; Flags: ignoreversion
          Source: "..\THIRD_PARTY_NOTICES.md"; DestDir: "{app}"; Flags: ignoreversion
          Source: "..\LICENSES\*"; DestDir: "{app}\LICENSES"; Flags: ignoreversion recursesubdirs
          ```
       3. Pin exact runtime versions in `requirements.txt` (e.g., `pynput==1.8.2`, `pywebview==6.2.1`) so anyone rebuilding gets an identical environment.
     - **Option B — Loose Replaceable `pynput` Directory Inside `onedir` (Section 4(d)(1) dynamic-replacement style):** In addition to the `[Files]` additions above, modify `installer/typesimulator.spec` to filter `pynput` entries out of `a.pure` before `PYZ(a.pure)` and copy the `pynput` package directory as loose `.py` files into `_internal/pynput/` via `datas` (keeping `_internal` on `sys.path`). End users can then replace `pynput` in place without even installing PyInstaller.
   - **Alternative Long-Term Path (Eliminates LGPL Entirely):** Replace `pynput` with direct Win32 `ctypes` (`user32.SendInput` + `RegisterHotKey`)—zero LGPL dependency at all, and Windows `RegisterHotKey` does not even need a low-level keyboard hook (`WH_KEYBOARD_LL`), reducing antivirus false positives too!

---

### 5.2 CSP Enforcement Rollout Plan (`Report-Only` → Enforcing — *NEEDS APPROVAL*)

Both `frontend/vercel.json` (Web) and `backend/desktop_app.py` (Desktop) currently ship:
```http
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'
```

**Test checklist before renaming the header to `Content-Security-Policy`:**
1. **Vercel Web Deployment:** Open Chrome/Edge DevTools → Console & Network tabs:
   - Load Overview page → confirm Inter and JetBrains Mono load from `/assets/*.woff2`, SVG favicon renders, and **zero CSP warnings** appear.
   - Open Privacy Policy and Terms of Service pages → confirm zero violations.
   - Open Studio Sandbox → run Start, Pause, Simulate Focus Switch, Resume, Abort, Save Snippet, Clear All Local Data, and Compact HUD → confirm inline progress bar widths (`style-src 'unsafe-inline'`) and SVG sparkline trigger **zero** violations.
2. **Windows Desktop App:** Run `set TYPESIM_DEBUG=1` (PowerShell: `$env:TYPESIM_DEBUG="1"; python -m backend.desktop_app`) → open WebView2 DevTools Console:
   - Confirm PyWebView's `window.pywebview` bridge injection and `window.__typeSimulatorOnEvent` live updates execute with **zero** `script-src` violation reports.
   - Confirm self-hosted fonts load from `http://127.0.0.1:<port>/assets/*.woff2` with **zero** external requests in the Network tab.
   - Test clicking GitHub / contact links → confirm WebView2 stays on `127.0.0.1` and opens allowlisted URLs in your default OS browser.
3. Once both checklists show **zero** CSP reports, change `Content-Security-Policy-Report-Only` → `Content-Security-Policy` in `frontend/vercel.json` and `backend/desktop_app.py`.

---

### 5.3 Unpinned Third-Party GitHub Actions *(PROPOSED ONLY — NOT APPLIED)*

`.github/workflows/ci.yml` currently uses mutable major version tags for 3 third-party actions:
1. `actions/checkout@v4` (lines 16, 33)
2. `actions/setup-python@v5` (line 17)
3. `actions/setup-node@v4` (line 34)

**Proposal:** Pin each to its verified full 40-character commit SHA with a version comment (e.g., `actions/checkout@<40-char-sha> # v4.x.x`) after confirming the latest official tag SHAs on GitHub, and add `.github/dependabot.yml` with `package-ecosystem: "github-actions"` so SHA pins stay updated automatically.

---

### 5.4 Release Checksum & Windows Code-Signing Follow-Up *(MANUAL ACTIONS)*

1. **Publish SHA-256 on Every Release:**
   - Merge `security-compliance-audit` → `main` on GitHub.
   - Locally run `.\installer\build.ps1`.
   - Generate the release checksum:
     ```powershell
     Get-FileHash .\installer\output\TypeSimulator-Setup-v2.0.0.exe -Algorithm SHA256
     ```
   - Upload the rebuilt installer and paste the SHA-256 hash into the GitHub Release notes.
2. **Code-Signing Options (Eliminate SmartScreen Warnings):**
   - **SignPath.io (Free OSS Tier):** Free Authenticode signing via GitHub Actions for qualifying public open-source repositories.
   - **Microsoft Azure Trusted Signing:** ~$9.99/month for individual developers (subject to identity verification); grants immediate SmartScreen trust via Microsoft's root CA without buying a hardware USB token.
   - **Traditional OV/EV Authenticode Certificate (DigiCert / Sectigo / SSL.com):** Hardware HSM/cloud key signing (~$200–$500/yr).

---

### 5.5 Merging & Vercel Dashboard Verification *(MANUAL STEPS)*

1. Inspect commits locally: `git log main..security-compliance-audit --stat`
2. Push branch & open a PR (or merge locally into `main` and push):
   - `git push -u origin security-compliance-audit`
   - Review PR on `https://github.com/kamal-hq/TypeSimulator` → confirm GitHub Actions CI passes (`backend-tests` + `frontend-build`) → merge to `main`.
3. Vercel will auto-deploy `frontend/` (`Root Directory: frontend`, using `frontend/vercel.json`).
4. Verify live headers with:
   ```powershell
   curl.exe -I https://<your-vercel-domain>
   ```
   Confirm `Content-Security-Policy-Report-Only`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy` are present.

---

## 6. Shared-Database Notes

Not applicable — TypeSimulator does not use Supabase or any database.

---

## 7. Items Deliberately Not Changed (and Why)

- **`installer/typesimulator.spec` & `installer/setup.iss`:** Left unchanged per your instruction not to modify build/installer behavior without approval; exact LGPL-3.0 changes are proposed in Section 5.1.
- **Third-party GitHub Action SHA pins (`.github/workflows/ci.yml`):** Left on `@v4`/`@v5` per your instruction to propose rather than apply.
- **Enforcing CSP header:** Shipped as `Content-Security-Policy-Report-Only` on both Web and Desktop so you can verify zero violations against PyWebView's runtime script injection and Tailwind styles before enforcing (Section 5.2).
- **`legacy/` v1 prototype files:** Audited cleanly (zero secrets, zero personal paths, zero foreign licenses); kept archived as-is.
- **Python dependency version pinning (`requirements.txt`):** Kept `>=` ranges intact to avoid breaking existing environments; exact pinning is recommended alongside the LGPL build update.

---

## 8. Remaining Risks & 30-Day Follow-Up List

### Remaining Risks
- **Plaintext local snippets on Desktop (`%APPDATA%\TypeSimulator\snippets.json`) and Web (`localStorage`):** Disclosed in the Privacy Policy with an explicit warning not to store passwords/API keys and an in-app **Clear all local data** button. Any other process running under the same Windows user account can read `%APPDATA%`.
- **Unsigned installer executable:** Until code-signed, Windows SmartScreen and some AV engines may warn on first execution.
- **Windows `WH_KEYBOARD_LL` hook optics:** Even though `pynput.keyboard.GlobalHotKeys` discards non-hotkey keys immediately (verified & tested), endpoint detection tools (EDR/AV) treat global keyboard hooks with suspicion.

### 30-Day Follow-Up Checklist
- [ ] **Week 1:** Merge `security-compliance-audit`, run the Section 5.2 CSP test checklist on Vercel + Windows Desktop, and flip Report-Only CSP to enforcing `Content-Security-Policy`.
- [ ] **Week 2:** Apply the Section 5.1 LGPL-3.0 installer updates (`LICENSES/` + `setup.iss` `[Files]`), rebuild `.exe`, and publish a signed or SHA-256-verified GitHub Release.
- [ ] **Week 3:** Pin GitHub Actions in `.github/workflows/ci.yml` to commit SHAs and add `.github/dependabot.yml` for `npm`, `pip`, and `github-actions` security updates + `pip-audit` in CI.
- [ ] **Week 4:** Evaluate replacing `pynput` hotkeys with Win32 `ctypes` `RegisterHotKey` + `SendInput` (eliminates both the LGPL-3.0 dependency and the `WH_KEYBOARD_LL` global hook!) and apply for SignPath.io or Azure Trusted Signing.
