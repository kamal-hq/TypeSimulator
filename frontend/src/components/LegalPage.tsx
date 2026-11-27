import { ArrowLeft, FileText, Mail, ShieldCheck, Trash2 } from 'lucide-react'
import { CONTACT_EMAIL, CONTACT_MAILTO, GITHUB_REPO_URL } from '../config/links'
import { Logo } from './TopBar'

export type LegalDoc = 'privacy' | 'terms'

export function LegalPage({
  doc,
  onSwitch,
  onBack,
  backLabel,
  onOpenClearData,
}: {
  doc: LegalDoc
  onSwitch: (next: LegalDoc) => void
  onBack: () => void
  backLabel: string
  onOpenClearData?: () => void
}) {
  return (
    <div className="min-h-screen bg-[#090909] text-zinc-200">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#0B0B0B]/90 px-5 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-4">
          <Logo />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={13} />
            {backLabel}
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/[.02] p-1">
          <button
            onClick={() => onSwitch('privacy')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              doc === 'privacy' ? 'bg-[#C9EF35] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck size={13} />Privacy Policy
          </button>
          <button
            onClick={() => onSwitch('terms')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              doc === 'terms' ? 'bg-[#C9EF35] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={13} />Terms of Service
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 md:px-10">
        {doc === 'privacy' ? (
          <article className="space-y-8">
            <div className="border-b border-white/8 pb-6">
              <p className="section-label text-[#C9EF35]">COMPLIANCE / PRIVACY</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Privacy Policy</h1>
              <p className="mt-2 font-mono text-[11px] text-zinc-500">
                Effective Date: November 27, 2026 · Contact: {CONTACT_EMAIL}
              </p>
            </div>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">1. Summary — Local-First, Zero Accounts</h2>
              <p>
                TypeSimulator does not have user accounts, logins, cloud databases, advertising trackers, analytics
                scripts, or cookies. Both the Web Sandbox and the Windows Desktop app operate locally on your device.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">2. Data Stored Locally on Your Device</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-zinc-200">Staged Text Payloads:</strong> Held in memory only while the app is
                  open and never transmitted over the network.
                </li>
                <li>
                  <strong className="text-zinc-200">Saved Snippets &amp; Preferences (Web Sandbox):</strong> Stored
                  strictly in your browser&apos;s <code className="font-mono text-xs text-zinc-300">localStorage</code>{' '}
                  (<code className="font-mono text-xs text-zinc-300">typesimulator-config-v2</code> and{' '}
                  <code className="font-mono text-xs text-zinc-300">typesimulator-snippets-v2</code>).
                </li>
                <li>
                  <strong className="text-zinc-200">Saved Snippets &amp; Preferences (Desktop App):</strong> Stored
                  locally as plaintext JSON files in{' '}
                  <code className="font-mono text-xs text-zinc-300">%APPDATA%\TypeSimulator\config.json</code> and{' '}
                  <code className="font-mono text-xs text-zinc-300">snippets.json</code>. Do not save passwords, API
                  keys, or confidential credentials as persistent snippets.
                </li>
                <li>
                  <strong className="text-zinc-200">Active-Window Focus Guard (Desktop Only):</strong> Reads the active
                  foreground window handle and title in memory via Windows{' '}
                  <code className="font-mono text-xs text-zinc-300">user32</code> solely to auto-pause typing if another
                  window steals focus. Window titles are never saved to disk or sent anywhere.
                </li>
              </ul>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">3. Keystroke Privacy (Desktop Global Hotkeys)</h2>
              <p>
                To let you trigger Start/Resume, Pause, or Abort while focused in another application, the Windows
                Desktop app registers a global hotkey listener using{' '}
                <code className="font-mono text-xs text-zinc-300">pynput.keyboard.GlobalHotKeys</code>. Our listener
                reacts strictly to your configured hotkey combinations (defaults:{' '}
                <kbd>F9</kbd>, <kbd>F10</kbd>, <kbd>Ctrl+Shift+Esc</kbd>). Every other key event is immediately
                discarded in memory—nothing you type is logged, stored, or transmitted anywhere.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">4. Third-Party Services &amp; Network Requests</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-zinc-200">Self-Hosted Fonts:</strong> Inter and JetBrains Mono are bundled
                  directly with the application. Neither the web app nor the desktop app contacts Google Fonts or any
                  external font CDN.
                </li>
                <li>
                  <strong className="text-zinc-200">Web Hosting (Vercel):</strong> When you visit the hosted Web
                  Sandbox, Vercel serves the static site and processes standard HTTP access metadata (such as IP address
                  and User-Agent) in accordance with Vercel&apos;s privacy policy.
                </li>
                <li>
                  <strong className="text-zinc-200">External Links (GitHub):</strong> Clicking Download or GitHub links
                  navigates externally to{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C9EF35] hover:underline"
                  >
                    github.com/kamal-hq/TypeSimulator
                  </a>{' '}
                  in your browser.
                </li>
              </ul>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">5. Retention, User Rights &amp; Data Deletion</h2>
              <p>
                Because TypeSimulator stores no user data on remote servers, your data remains exclusively on your
                device for as long as you keep it. You can delete all saved snippets, custom hotkeys, and preferences at
                any time via <strong className="text-zinc-200">Studio → Safety → Clear all local data</strong>, by
                clearing browser site storage (Web), or by deleting{' '}
                <code className="font-mono text-xs text-zinc-300">%APPDATA%\TypeSimulator\</code> (Desktop).
              </p>
              {onOpenClearData && (
                <button
                  onClick={onOpenClearData}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 size={14} />Open Studio Safety to Clear Local Data
                </button>
              )}
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">6. Cookies &amp; Children&apos;s Privacy</h2>
              <p>
                TypeSimulator sets no first-party or third-party cookies. TypeSimulator is a developer and productivity
                utility not directed to children under 13 (or the equivalent age of digital consent in your
                jurisdiction), and it does not knowingly collect personal data from children.
              </p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-[#111] p-5 text-xs leading-6 text-zinc-400">
              <p className="flex items-center gap-2 font-semibold text-white">
                <Mail size={14} className="text-[#C9EF35]" />Questions or Privacy Requests
              </p>
              <p className="mt-2">
                Contact Muhammad Kamal at{' '}
                <a href={CONTACT_MAILTO} className="font-mono text-[#C9EF35] hover:underline">
                  {CONTACT_EMAIL}
                </a>
                . This policy describes actual software behavior for transparency and does not constitute formal legal
                advice.
              </p>
            </section>
          </article>
        ) : (
          <article className="space-y-8">
            <div className="border-b border-white/8 pb-6">
              <p className="section-label text-[#FF2E93]">COMPLIANCE / TERMS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Terms of Service</h1>
              <p className="mt-2 font-mono text-[11px] text-zinc-500">
                Effective Date: November 27, 2026 · Contact: {CONTACT_EMAIL}
              </p>
            </div>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">1. Acceptance of Terms</h2>
              <p>
                By accessing the TypeSimulator Web Sandbox or installing and using the TypeSimulator desktop
                application, you agree to these Terms of Service. If you do not agree, do not use the software.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-amber-400/20 bg-amber-400/[.04] p-5 text-sm leading-7 text-zinc-300">
              <h2 className="text-base font-semibold text-amber-200">2. Acceptable Use Policy</h2>
              <p>
                TypeSimulator automates OS-level keystroke input into other applications, including text fields that
                restrict clipboard pasting. It is intended for legitimate workflows such as remote VDI/VM/KVM consoles
                without clipboard sharing, QA testing, accessibility assistance, and technical demonstrations.
              </p>
              <p className="font-semibold text-white">You MUST NOT use TypeSimulator to:</p>
              <ul className="list-disc space-y-1.5 pl-5 text-zinc-300">
                <li>
                  Bypass academic exam, online proctoring, hiring test, certification, or assessment rules or integrity
                  controls;
                </li>
                <li>
                  Impersonate another individual or misrepresent automated input as live manual typing where prohibited;
                </li>
                <li>
                  Violate the terms of service, acceptable use policies, or security rules of any third-party website,
                  employer, school, or platform;
                </li>
                <li>
                  Conduct unauthorized automation, credential stuffing, spam, harassment, or unlawful activity.
                </li>
              </ul>
              <p className="text-xs text-amber-200/80">
                You are solely responsible for how you use TypeSimulator and for verifying that your usage complies with
                all applicable laws, institutional rules, and third-party terms.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">3. Safety &amp; User Responsibility</h2>
              <p>
                Simulated keystrokes act on whichever window has operating system focus. While TypeSimulator includes an
                Active-Window Focus Guard and Emergency Abort controls, you remain solely responsible for verifying the
                staged payload, target window, and key rules (such as <code className="font-mono text-xs">Enter</code>{' '}
                vs <code className="font-mono text-xs">Shift+Enter</code>) before starting transmission.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">4. Disclaimer of Warranties (&ldquo;AS IS&rdquo;)</h2>
              <p>
                TypeSimulator is provided <strong className="text-zinc-200">&ldquo;AS IS&rdquo;</strong> and{' '}
                <strong className="text-zinc-200">&ldquo;AS AVAILABLE&rdquo;</strong>, without warranty of any kind,
                express or implied, including but not limited to implied warranties of merchantability, fitness for a
                particular purpose, availability, or non-infringement.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">5. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, Muhammad Kamal shall not be liable for any direct,
                indirect, incidental, special, exemplary, or consequential damages—including accidental form
                submissions, unintended command execution, account suspension, or data loss—arising out of or related to
                your use of or inability to use TypeSimulator.
              </p>
            </section>

            <section className="space-y-3 text-sm leading-7 text-zinc-400">
              <h2 className="text-base font-semibold text-white">6. Open-Source License &amp; Third-Party Notices</h2>
              <p>
                TypeSimulator&apos;s own source code is released under the MIT License. Bundled open-source components
                (including <code className="font-mono text-xs">pynput</code> under LGPL-3.0 and{' '}
                <code className="font-mono text-xs">pywebview</code> under BSD-3-Clause) remain governed by their
                respective licenses documented in{' '}
                <code className="font-mono text-xs text-zinc-300">THIRD_PARTY_NOTICES.md</code>.
              </p>
            </section>

            <section className="rounded-2xl border border-white/8 bg-[#111] p-5 text-xs leading-6 text-zinc-400">
              <p className="flex items-center gap-2 font-semibold text-white">
                <Mail size={14} className="text-[#C9EF35]" />Contact
              </p>
              <p className="mt-2">
                Questions about these terms may be sent to{' '}
                <a href={CONTACT_MAILTO} className="font-mono text-[#C9EF35] hover:underline">
                  {CONTACT_EMAIL}
                </a>
                . These terms are provided for an independent portfolio project and do not constitute formal legal
                advice.
              </p>
            </section>
          </article>
        )}
      </main>
    </div>
  )
}
