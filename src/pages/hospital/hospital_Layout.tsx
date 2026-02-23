import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Hospital_Sidebar from '../../components/hospital/hospital_Sidebar'
import Hospital_Header from '../../components/hospital/hospital_Header'

export default function Hospital_Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('hospital.sidebar_collapsed') === '1'
  })
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('hospital.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('hospital.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('hospital.sidebar_collapsed', sidebarCollapsed ? '1' : '0')
    } catch (_) {}
  }, [sidebarCollapsed])

  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'hospital-scope dark' : 'hospital-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Hospital_Header
              variant="navy"
              onToggleSidebar={() => setSidebarCollapsed(v => !v)}
              collapsed={sidebarCollapsed}
              onToggleTheme={() => setTheme(t=>t==='dark'?'light':'dark')}
              theme={theme}
            />
          </div>
        </div>

        <div className="flex">
          <Hospital_Sidebar collapsed={sidebarCollapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
