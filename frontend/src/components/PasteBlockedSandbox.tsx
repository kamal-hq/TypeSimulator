import { LockKeyhole, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function PasteBlockedSandbox({ output }: { output: string }) {
  const [target, setTarget] = useState('')
  const [blocked, setBlocked] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTarget(output)
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [output])

  return (
    <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#111]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold">SIMULATED RESTRICTED FORM</span>
          <span className="flex items-center gap-1 rounded-full border border-[#FF2E93]/25 bg-[#FF2E93]/8 px-2 py-1 text-[9px] font-semibold text-[#FF2E93]">
            <LockKeyhole size={10} />CTRL+V DISABLED
          </span>
        </div>
        <button onClick={() => setTarget('')} className="tool-btn">
          <Trash2 size={12} />Clear target
        </button>
      </div>

      <div className="relative p-4">
        <label className="mb-2 block text-[10px] font-semibold tracking-widest text-zinc-600">
          SECURE CONSOLE INPUT
        </label>
        <textarea
          ref={textareaRef}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onPaste={(e) => {
            e.preventDefault()
            setBlocked(true)
            window.setTimeout(() => setBlocked(false), 2800)
          }}
          className="min-h-32 w-full resize-none rounded-xl border border-white/8 bg-[#090909] p-4 font-mono text-xs leading-6 text-zinc-300 outline-none transition focus:border-white/20"
          placeholder="Try Ctrl+V here (it's blocked!), then press Start typing or F9 above…"
        />
        {blocked && (
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-red-500/20 bg-[#251014] px-3 py-2 text-[10px] text-red-300 shadow-xl">
            Paste blocked by form policy — use TypeSimulator to inject text
          </div>
        )}
      </div>
    </section>
  )
}
