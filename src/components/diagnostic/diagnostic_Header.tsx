import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { diagnosticApi } from '../../utils/api'

type Props = { onToggleSidebar?: ()=>void; onToggleTheme?: ()=>void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Diagnostic_Header({ onToggleSidebar, onToggleTheme, theme, variant = 'default' }: Props) {
  const [brandName, setBrandName] = useState<string>('Diagnostic')
  const [brandLogo, setBrandLogo] = useState<string | null>(null)

  async function loadBranding(){
    try {
      const s: any = await diagnosticApi.getSettings()
      setBrandName(String(s?.diagnosticName || 'Diagnostic'))
      setBrandLogo(s?.logoDataUrl ? String(s.logoDataUrl) : null)
    } catch {
      setBrandName('Diagnostic')
      setBrandLogo(null)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await loadBranding()
    })()

    const onUpdated = () => { void loadBranding() }
    try { window.addEventListener('diagnostic:settings-updated', onUpdated as any) } catch {}
    return () => {
      mounted = false
      try { window.removeEventListener('diagnostic:settings-updated', onUpdated as any) } catch {}
    }
  }, [])

  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('diagnostic.theme', next) } catch {}
    try { document.documentElement.classList.toggle('dark', next === 'dark') } catch {}
    try { const scope = document.querySelector('.diagnostic-scope'); if (scope) scope.classList.toggle('dark', next === 'dark') } catch {}
    onToggleTheme?.()
  }

  const isNavy = variant === 'navy'
  const headerCls = isNavy
    ? 'h-14 w-full'
    : 'sticky top-0 z-10 h-14 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:px-6'

  const btnCls = isNavy
    ? 'inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 p-2 text-white hover:bg-white/10'
    : 'inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

  const titleCls = isNavy ? 'font-semibold text-white' : 'font-semibold text-slate-900 dark:text-slate-200'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700'
  const metaTextCls = isNavy ? 'hidden items-center gap-2 text-white/80 sm:flex' : 'hidden items-center gap-2 text-slate-600 sm:flex dark:text-slate-300'
  const metaBtnCls = isNavy ? 'hidden rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10 sm:flex items-center gap-2' : 'hidden rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 sm:flex items-center gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const userCls = isNavy ? 'rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-white' : 'rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:text-slate-200'

  return (
    <header className={headerCls}>
      <div className={innerCls}>
        {onToggleSidebar ? (
          <>
            <button onClick={onToggleSidebar} className={btnCls}>
              <Menu className={isNavy ? 'h-5 w-5' : 'h-4 w-4'} />
            </button>
            <div className={isNavy ? 'h-7 w-px bg-white/15' : 'h-7 w-px bg-slate-200 dark:bg-slate-700'} />
          </>
        ) : null}
        <Link to="/diagnostic" className="flex items-center gap-2">
          {brandLogo ? (
            <div className={isNavy ? 'flex h-9 w-9 items-center justify-center rounded-full bg-white/10' : 'flex h-9 w-9 items-center justify-center rounded-full bg-violet-100'}>
              <img src={brandLogo} alt="Logo" className="h-7 w-7 rounded object-contain" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4.5 12a5.5 5.5 0 0 1 9.9-3.3l.4.5 3 3a5.5 5.5 0 0 1-7.8 7.8l-3-3-.5-.4A5.48 5.48 0 0 1 4.5 12Zm4.9-3.6L7.1 10l6.9 6.9 2.3-2.3-6.9-6.9Z'/></svg>
            </div>
          )}
          <div className={titleCls}>{brandName}</div>
          <span className={pillCls}>Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className={metaTextCls}>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M6.75 3A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h10.5A2.75 2.75 0 0 0 20 18.25V5.75A2.75 2.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5c.69 0 1.25.56 1.25 1.25v12.5c0 .69-.56 1.25-1.25 1.25H6.75c-.69 0-1.25-.56-1.25-1.25V5.75c0-.69.56-1.25 1.25-1.25Z'/></svg>
            <span>{new Date().toLocaleDateString()}</span>
            <span className="opacity-60">{new Date().toLocaleTimeString()}</span>
          </div>
          <button onClick={handleToggleTheme} className={metaBtnCls}>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M7.5 3h9A2.5 2.5 0 0 1 19 5.5v13A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-13A2.5 2.5 0 0 1 7.5 3Zm0 2A.5.5 0 0 0 7 5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-9Z'/></svg>
            {theme === 'dark' ? 'Dark: On' : 'Dark: Off'}
          </button>
          <div className={userCls}>admin</div>
        </div>
      </div>
    </header>
  )
}
