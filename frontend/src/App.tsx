import { useEffect, useState } from 'react'
import { hasNativePyWebView, isDesktopBuildOrHost } from './adapters/engineAdapter'
import { OverviewPage } from './components/OverviewPage'
import { StudioWorkspace } from './components/StudioWorkspace'

export default function App() {
  const [nativeReady, setNativeReady] = useState<boolean>(() => hasNativePyWebView())
  const [mode, setMode] = useState<'web' | 'desktop'>(() => (isDesktopBuildOrHost() ? 'desktop' : 'web'))
  const [view, setView] = useState<'overview' | 'studio'>(() => (isDesktopBuildOrHost() ? 'studio' : 'overview'))

  useEffect(() => {
    const onPyWebViewReady = () => {
      setNativeReady(true)
      setMode('desktop')
      setView('studio')
    }
    window.addEventListener('pywebviewready', onPyWebViewReady)
    if (hasNativePyWebView()) onPyWebViewReady()
    return () => window.removeEventListener('pywebviewready', onPyWebViewReady)
  }, [])

  return (
    <>
      {view === 'overview' && mode === 'web' ? (
        <OverviewPage onStudio={() => setView('studio')} />
      ) : (
        <StudioWorkspace mode={mode} nativeReady={nativeReady} onOverview={() => setView('overview')} />
      )}

      {import.meta.env.DEV && !nativeReady && (
        <button
          onClick={() => {
            const next = mode === 'web' ? 'desktop' : 'web'
            setMode(next)
            setView(next === 'desktop' ? 'studio' : 'overview')
          }}
          className="fixed bottom-3 right-3 z-50 rounded-full border border-white/10 bg-black/80 px-2.5 py-1.5 font-mono text-[9px] text-zinc-500 backdrop-blur hover:text-white"
        >
          PREVIEW: {mode.toUpperCase()}
        </button>
      )}
    </>
  )
}
