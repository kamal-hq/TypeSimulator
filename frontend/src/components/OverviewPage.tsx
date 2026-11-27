import { ArrowRight, Check, Code2, Download, Keyboard, LockKeyhole, Play, ShieldCheck, Sparkles, Target, Waves } from 'lucide-react'
import { GITHUB_REPO_URL, RELEASE_DOWNLOAD_URL } from '../config/links'
import type { LegalDoc } from './LegalPage'
import { Logo } from './TopBar'

const features = [
  [Waves, 'Biomechanical cadence', 'Log-normal timing with punctuation pauses, natural variance and optional QWERTY typo correction.', 'SIGNAL / 01'],
  [Target, 'Active-window Focus Guard', 'Target-lock safety automatically pauses the instant another application steals focus.', 'SAFETY / 02'],
  [ShieldCheck, 'Strict text sanitizer', 'Smart quotes, dashes, invisible characters and line endings normalized before transmission.', 'CLEAN / 03'],
  [Keyboard, 'Global hotkeys + HUD', 'Control your run without breaking focus. Monitor progress in a compact floating instrument.', 'CONTROL / 04'],
] as const

export function OverviewPage({
  onStudio,
  onLegal,
}: {
  onStudio: () => void
  onLegal: (doc: LegalDoc) => void
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#090909] text-white">
      <nav className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Logo />
        <div className="hidden items-center gap-8 text-xs text-zinc-500 md:flex">
          <button className="text-white">Overview</button>
          <button onClick={onStudio} className="hover:text-white">Live Sandbox</button>
          <a href="#workflow" className="hover:text-white">Workflow</a>
        </div>
        <a
          href={RELEASE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-[#C9EF35] px-3 py-2 text-xs font-bold text-black hover:bg-[#d8fa55]"
        >
          <Download size={14} />Download .exe
        </a>
      </nav>

      <main>
        <section className="relative mx-auto grid max-w-[1440px] items-center gap-16 px-5 pb-24 pt-20 md:px-10 lg:grid-cols-[1.05fr_.95fr] lg:pb-32 lg:pt-28">
          <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#C9EF35]/8 blur-[120px]" />
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[10px] font-semibold tracking-[.14em] text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C9EF35]" />WINDOWS ENGINE 2.0 IS LIVE
            </div>
            <h1 className="max-w-[760px] text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[82px]">
              Human cadence.<br />
              <span className="text-[#C9EF35]">Machine precision.</span>
            </h1>
            <p className="mt-7 max-w-[620px] text-base leading-7 text-zinc-500 md:text-lg">
              OS-level keystroke automation for paste-restricted forms, remote consoles, QA runs and technical demos. Built to type like you would—only reliably.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl bg-[#C9EF35] px-5 py-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-[#d8fa55]"
              >
                <Download size={17} />Download for Windows{' '}
                <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </a>
              <button
                onClick={onStudio}
                className="flex items-center gap-3 rounded-xl border border-white/12 bg-white/[.03] px-5 py-4 text-sm font-semibold transition hover:bg-white/[.07]"
              >
                <Play size={16} fill="currentColor" />Try live sandbox
              </button>
            </div>
            <p className="mt-4 pl-1 font-mono text-[9px] tracking-wider text-zinc-700">
              WINDOWS 10/11 · STANDALONE INSTALLER · NO PYTHON REQUIRED
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rotate-2 rounded-[28px] bg-[#FF2E93] opacity-70" />
            <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#111] shadow-2xl shadow-black/80">
              <div className="flex h-12 items-center justify-between border-b border-white/8 px-4">
                <span className="font-mono text-[9px] tracking-[.18em] text-zinc-600">LIVE SIGNAL MONITOR</span>
                <span className="flex items-center gap-2 rounded-full bg-[#C9EF35]/10 px-2 py-1 font-mono text-[9px] text-[#C9EF35]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C9EF35]" />TYPING
                </span>
              </div>
              <div className="p-6">
                <div className="mb-5 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-600">TARGET WINDOW</p>
                    <p className="mt-1 text-sm">VDI Console · production-east</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-md border border-amber-400/20 px-2 py-1 text-[9px] text-amber-300">
                    <LockKeyhole size={10} />FOCUS LOCKED
                  </span>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/30 p-4 font-mono text-xs leading-6 text-zinc-400">
                  <span className="text-[#C9EF35]">$</span> sudo systemctl status sshd<br />
                  ● sshd.service — OpenSSH server daemon
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-[#C9EF35] align-middle" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[['LIVE WPM', '71'], ['PROGRESS', '64%'], ['ETA', '00:18']].map(([a, b]) => (
                    <div key={a} className="rounded-xl bg-white/[.035] p-3">
                      <p className="text-[8px] tracking-widest text-zinc-600">{a}</p>
                      <p className="mt-2 font-mono text-xl">{b}</p>
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 400 60" className="mt-5 h-14 w-full">
                  <path
                    d="M0 45 C30 42,40 15,70 26 S110 48,145 31 S190 10,220 28 S270 52,300 24 S350 20,400 8"
                    fill="none"
                    stroke="#C9EF35"
                    strokeWidth="2"
                  />
                  <path
                    d="M0 45 C30 42,40 15,70 26 S110 48,145 31 S190 10,220 28 S270 52,300 24 S350 20,400 8 L400 60 L0 60Z"
                    fill="url(#heroGlow)"
                  />
                  <defs>
                    <linearGradient id="heroGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop stopColor="#C9EF35" stopOpacity=".2" />
                      <stop offset="1" stopColor="#C9EF35" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-8 hidden rotate-[-4deg] rounded-xl bg-[#C9EF35] px-5 py-4 text-black shadow-xl md:block">
              <Sparkles size={18} />
              <p className="mt-2 text-xs font-black uppercase">Feels human.<br />Runs exact.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-[#0D0D0D] px-5 py-24 md:px-10">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-label text-[#FF2E93]">ENGINE CAPABILITIES</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Quiet confidence, under pressure.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-zinc-600">
                Every layer is engineered to keep high-stakes input predictable, recoverable and under your control.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 md:grid-cols-2 xl:grid-cols-4">
              {features.map(([Icon, title, body, index]) => (
                <article key={title} className="group bg-[#111] p-6 transition hover:bg-[#151515]">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#C9EF35]/8 text-[#C9EF35] transition group-hover:bg-[#C9EF35] group-hover:text-black">
                      <Icon size={19} />
                    </div>
                    <span className="font-mono text-[8px] tracking-widest text-zinc-700">{index}</span>
                  </div>
                  <h3 className="mt-10 text-base font-semibold">{title}</h3>
                  <p className="mt-3 text-xs leading-6 text-zinc-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-[1440px] px-5 py-24 md:px-10">
          <p className="section-label">ONE CLEAN RUN</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['01', 'Stage & sanitize', 'Paste or load text. Invisible formatting hazards are surfaced and neutralized.'],
              ['02', 'Focus target window', 'Lock onto the destination and let Focus Guard protect your active context.'],
              ['03', 'Trigger F9 & monitor', 'Transmit with human cadence. Pause, resume or abort without losing your place.'],
            ].map(([num, title, copy], i) => (
              <div key={num} className="relative rounded-2xl border border-white/8 p-6">
                <span className={`font-mono text-4xl font-bold ${i === 1 ? 'text-[#FF2E93]' : 'text-[#C9EF35]'}`}>
                  {num}
                </span>
                <h3 className="mt-10 font-semibold">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-zinc-600">{copy}</p>
                {i < 2 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden text-zinc-700 md:block" size={20} />}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 text-[10px] text-zinc-600">
          <span>Built by Muhammad Kamal · Independent Portfolio Project</span>
          <span className="flex flex-wrap items-center gap-4">
            <button onClick={() => onLegal('privacy')} className="hover:text-white">
              Privacy Policy
            </button>
            <button onClick={() => onLegal('terms')} className="hover:text-white">
              Terms of Service
            </button>
            <span className="flex items-center gap-1.5"><Check size={12} />Windows 10/11</span>
            <a
              className="flex items-center gap-1.5 hover:text-white"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Code2 size={13} />GitHub
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}
