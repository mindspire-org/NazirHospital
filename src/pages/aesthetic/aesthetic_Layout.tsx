import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Aesthetic_Sidebar from '../../components/aesthetic/aesthetic_Sidebar'
import Aesthetic_Header from '../../components/aesthetic/aesthetic_Header'
import { aestheticApi } from '../../utils/api'

export default function Aesthetic_Layout(){
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('aesthetic.sidebar_collapsed') === '1'
  })
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('aesthetic.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('aesthetic.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('aesthetic.sidebar_collapsed', collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  const navigate = useNavigate()
  const [username, setUsername] = useState<string>('')
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('aesthetic.session')
      if (!raw) { navigate('/aesthetic/login'); return }
      try { const s = JSON.parse(raw||'{}'); setUsername(String(s?.username||'')) } catch {}
    } catch { navigate('/aesthetic/login') }
  }, [navigate])

  const onLogout = async () => {
    try { await aestheticApi.logout() } catch {}
    try {
      localStorage.removeItem('aesthetic.token')
      localStorage.removeItem('token')
      localStorage.removeItem('aesthetic.session')
    } catch {}
    navigate('/aesthetic/login')
  }

  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'

  return (
    <div className={theme === 'dark' ? 'aesthetic-scope dark' : 'aesthetic-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Aesthetic_Header
              variant="navy"
              onToggleSidebar={() => setCollapsed(v => !v)}
              collapsed={collapsed}
              onToggleTheme={() => setTheme(t=> t==='dark'?'light':'dark')}
              theme={theme}
              onLogout={onLogout}
              username={username}
            />
          </div>
        </div>

        <div className="flex">
          <Aesthetic_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
