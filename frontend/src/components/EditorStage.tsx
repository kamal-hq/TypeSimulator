import { Eraser, FilePlus2, Save, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { SanitizeResult } from '../types/engine'
import { SanitizerPopover } from './SanitizerPopover'

export function EditorStage({
  payload,
  onChange,
  result,
  onSave,
}: {
  payload: string
  onChange: (value: string) => void
  result: SanitizeResult
  onSave: () => void
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(false)

  return (
    <section className="overflow-visible rounded-2xl border border-white/8 bg-[#111111]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-200">STAGED PAYLOAD</span>
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-400/10"
            >
              <ShieldCheck size={12} />
              {result.totalArtifacts} artifacts detected
            </button>
            {open && (
              <SanitizerPopover
                result={result}
                preview={preview}
                onPreview={setPreview}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onChange(
                'Server: production-east-02\nStatus: “degraded” — retrying connection…\n\n• Verify the active session\n• Re-run diagnostics',
              )
            }
            className="tool-btn"
          >
            <FilePlus2 size={13} />Load sample
          </button>
          <button onClick={onSave} disabled={!payload.trim()} className="tool-btn disabled:opacity-40">
            <Save size={13} />Save snippet
          </button>
          <button onClick={() => onChange('')} className="icon-btn !h-8 !w-8" title="Clear editor">
            <Eraser size={13} />
          </button>
        </div>
      </div>

      <textarea
        value={preview ? result.sanitized : payload}
        onChange={(event) => onChange(event.target.value)}
        readOnly={preview}
        spellCheck={false}
        className="min-h-[218px] w-full resize-y bg-transparent p-5 font-mono text-[13px] leading-7 text-zinc-300 outline-none placeholder:text-zinc-700"
        placeholder="Stage text here. TypeSimulator will take care of the rest."
      />

      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2 font-mono text-[10px] text-zinc-600">
        <span>UTF-8 · LF · {preview ? 'SANITIZED PREVIEW' : 'SOURCE'}</span>
        <span>{payload.length} CHARS</span>
      </div>
    </section>
  )
}
