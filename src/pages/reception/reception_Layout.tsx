import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Reception_Sidebar from '../../components/reception/reception_Sidebar'
import Reception_Header from '../../components/reception/reception_Header'

export default function Reception_Layout(){
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('reception.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  const hasSession = (()=>{ try { return !!localStorage.getItem('reception.session') } catch { return false } })()
  useEffect(()=>{ try { localStorage.setItem('reception.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])
  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'
  if (!hasSession) return <Navigate to="/reception/login" replace />
  return (
    <div className={theme === 'dark' ? 'reception-scope dark' : 'reception-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Reception_Header
              variant="navy"
              onToggleSidebar={()=> setCollapsed(c=>!c)}
              onToggleTheme={()=> setTheme(t=> t==='dark'?'light':'dark')}
              theme={theme}
            />
          </div>
        </div>

        <div className="flex">
          <Reception_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
