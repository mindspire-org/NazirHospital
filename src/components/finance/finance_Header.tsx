import { Link, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Finance_Header({ onToggleSidebar, onToggleTheme, theme, variant = 'default' }: Props) {
  const navigate = useNavigate()
  function handleLogout(){
    try { localStorage.removeItem('finance.session') } catch {}
    navigate('/finance/login')
  }
  const user = (()=>{ try { return JSON.parse(localStorage.getItem('finance.session')||'{}') } catch { return {} } })()
  function handleToggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('finance.theme', next) } catch {}
    try { document.documentElement.classList.toggle('dark', next === 'dark') } catch {}
    try {
      const scope = document.querySelector('.finance-scope') || document.body
      scope.classList.add('finance-scope')
      scope.classList.toggle('dark', next === 'dark')
    } catch {}
    onToggleTheme?.()
  }

  const isNavy = variant === 'navy'
  const headerCls = isNavy
    ? 'h-14 w-full'
    : 'sticky top-0 z-10 h-16 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-4 sm:px-6'
  const btnCls = isNavy
    ? 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const titleCls = isNavy ? 'font-semibold text-white' : 'font-semibold text-slate-900 dark:text-slate-200'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700'
  const metaTextCls = isNavy ? 'hidden items-center gap-2 text-white/80 sm:flex' : 'hidden items-center gap-2 text-slate-600 sm:flex dark:text-slate-300'
  const metaBtnCls = isNavy ? 'hidden rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10 sm:flex items-center gap-2' : 'hidden rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 sm:flex items-center gap-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  const userCls = isNavy ? 'rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-white' : 'rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:text-slate-200'
  const logoutCls = isNavy ? 'rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10' : 'rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  return (
    <header className={headerCls}>
      <div className={innerCls}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={btnCls}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/finance" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75Zm5.25.75a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm-.75 4.5c0-.414.336-.75.75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm.75 3a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5H9.25Z'/></svg>
          </div>
          <div className={titleCls}>Finance</div>
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
          <div className={userCls}>{(user as any)?.username || '-'}</div>
          <button onClick={handleLogout} className={logoutCls}>Logout</button>
        </div>
      </div>
    </header>
  )
}
