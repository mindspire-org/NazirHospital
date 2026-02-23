import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Finance_Sidebar from '../../components/finance/finance_Sidebar'
import Finance_Header from '../../components/finance/finance_Header'

export default function Finance_Layout(){
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('finance.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('finance.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])
  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'finance-scope dark' : 'finance-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Finance_Header
              variant="navy"
              onToggleSidebar={()=> setCollapsed(c=>!c)}
              onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')}
              theme={theme}
            />
          </div>
        </div>

        <div className="flex">
          <Finance_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
