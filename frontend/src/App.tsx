import { useEffect, useState } from 'react'
import { hasNativePyWebView, isDesktopBuildOrHost } from './adapters/engineAdapter'
import { LegalPage, type LegalDoc } from './components/LegalPage'
import { OverviewPage } from './components/OverviewPage'
import { StudioWorkspace } from './components/StudioWorkspace'
import { openExternalUrlSafe } from './config/links'

type AppView = 'overview' | 'studio' | 'privacy' | 'terms'

export default function App() {
  const [nativeReady, setNativeReady] = useState<boolean>(() => hasNativePyWebView())
  const [mode, setMode] = useState<'web' | 'desktop'>(() => (isDesktopBuildOrHost() ? 'desktop' : 'web'))
  const [view, setView] = useState<AppView>(() => (isDesktopBuildOrHost() ? 'studio' : 'overview'))
  const [returnView, setReturnView] = useState<'overview' | 'studio'>(() =>
    isDesktopBuildOrHost() ? 'studio' : 'overview',
  )

  useEffect(() => {
    const onPyWebViewReady = () => {
      setNativeReady(true)
      setMode('desktop')
      setView('studio')
      setReturnView('studio')
    }
    window.addEventListener('pywebviewready', onPyWebViewReady)
    if (hasNativePyWebView()) onPyWebViewReady()
    return () => window.removeEventListener('pywebviewready', onPyWebViewReady)
  }, [])

  // Defense-in-depth: intercept off-origin anchor clicks in Desktop Mode so WebView never leaves app origin
  useEffect(() => {
    if (!nativeReady && mode !== 'desktop') return
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!target) return
      const href = target.getAttribute('href') || ''
      if (!href || href.startsWith('#')) return
      const isExternal =
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:')
      if (!isExternal) return
      event.preventDefault()
      openExternalUrlSafe(href)
    }
    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [mode, nativeReady])

  const openLegal = (doc: LegalDoc, from: 'overview' | 'studio') => {
    setReturnView(from)
    setView(doc)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <>
      {view === 'privacy' || view === 'terms' ? (
        <LegalPage
          doc={view}
          onSwitch={(next) => setView(next)}
          onBack={() => setView(mode === 'desktop' ? 'studio' : returnView)}
          backLabel={returnView === 'studio' || mode === 'desktop' ? 'Back to Studio' : 'Back to Overview'}
          onOpenClearData={() => setView('studio')}
        />
      ) : view === 'overview' && mode === 'web' ? (
        <OverviewPage
          onStudio={() => setView('studio')}
          onLegal={(doc) => openLegal(doc, 'overview')}
        />
      ) : (
        <StudioWorkspace
          mode={mode}
          nativeReady={nativeReady}
          onOverview={() => setView('overview')}
          onLegal={(doc) => openLegal(doc, 'studio')}
        />
      )}

      {import.meta.env.DEV && !nativeReady && (
        <button
          onClick={() => {
            const next = mode === 'web' ? 'desktop' : 'web'
            setMode(next)
            setView(next === 'desktop' ? 'studio' : 'overview')
            setReturnView(next === 'desktop' ? 'studio' : 'overview')
          }}
          className="fixed bottom-3 right-3 z-50 rounded-full border border-white/10 bg-black/80 px-2.5 py-1.5 font-mono text-[9px] text-zinc-500 backdrop-blur hover:text-white"
        >
          PREVIEW: {mode.toUpperCase()}
        </button>
      )}
    </>
  )
}
