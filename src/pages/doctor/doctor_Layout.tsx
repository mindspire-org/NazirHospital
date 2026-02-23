import { Outlet, useNavigate } from 'react-router-dom'
import Doctor_Sidebar from '../../components/doctor/doctor_Sidebar'
import Doctor_Header from '../../components/doctor/doctor_Header'
import { useEffect, useState } from 'react'

export default function Doctor_Layout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try { return (localStorage.getItem('doctor.theme') as 'light'|'dark') || 'light' } catch { return 'light' }
  })
  useEffect(()=>{ try { localStorage.setItem('doctor.theme', theme) } catch {} }, [theme])
  useEffect(()=>{
    const html = document.documentElement
    const enable = theme === 'dark'
    try { html.classList.toggle('dark', enable) } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [theme])
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doctor.session')
      if (!raw) navigate('/hospital/login')
    } catch { navigate('/hospital/login') }
  }, [navigate])
  const shell = theme === 'dark' ? 'min-h-dvh bg-slate-900 text-slate-100' : 'min-h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'doctor-scope dark' : 'doctor-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Doctor_Header onToggle={() => setCollapsed(c=>!c)} onToggleTheme={() => setTheme(t=>t==='dark'?'light':'dark')} theme={theme} variant="navy" />
          </div>
        </div>

        <div className="flex">
          <Doctor_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
