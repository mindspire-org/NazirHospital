import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Lab_Sidebar from '../../components/lab/lab_Sidebar'
import Lab_Header from '../../components/lab/lab_Header'

export default function Lab_Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(()=>{
    try { return localStorage.getItem('lab.sidebar.collapsed') === '1' } catch { return false }
  })
  const toggle = () => {
    setCollapsed(v=>{
      const nv = !v
      try { localStorage.setItem('lab.sidebar.collapsed', nv ? '1' : '0') } catch {}
      return nv
    })
  }
  // Theme (dark/light) scoped to Lab only
  const [theme, setTheme] = useState<'light'|'dark'>(()=>{
    try {
      const t = (localStorage.getItem('lab.theme') as 'light'|'dark')
      return t || 'light'
    } catch { return 'light' }
  })
  useEffect(()=>{
    try { localStorage.setItem('lab.theme', theme) } catch {}
  }, [theme])
  // Force Lab theme to be scoped to the Lab layout only.
  // Some other app areas may toggle <html>.dark globally; that can make Lab blocks
  // look dark even when Lab is in light mode. While Lab is mounted, we remove
  // <html>.dark and restore the previous state on unmount.
  useEffect(()=>{
    const html = document.documentElement
    const hadDark = (() => {
      try { return html.classList.contains('dark') } catch { return false }
    })()
    const forceRemove = () => {
      try {
        if (html.classList.contains('dark')) html.classList.remove('dark')
      } catch {}
    }
    forceRemove()

    // If some other code re-adds `dark` to <html>, remove it again.
    let obs: MutationObserver | null = null
    try {
      obs = new MutationObserver(() => forceRemove())
      obs.observe(html, { attributes: true, attributeFilter: ['class'] })
    } catch {}

    return () => {
      try {
        if (obs) obs.disconnect()
        html.classList.toggle('dark', hadDark)
      } catch {}
    }
  }, [])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  const navigate = useNavigate()
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lab.session')
      if (!raw) navigate('/lab/login')
    } catch {
      navigate('/lab/login')
    }
  }, [navigate])
  const shell = theme === 'dark' ? 'h-dvh bg-slate-900 text-slate-100' : 'h-dvh bg-slate-50 text-slate-900'
  return (
    <div className={theme === 'dark' ? 'lab-scope dark' : 'lab-scope'}>
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Lab_Header variant="navy" onToggleSidebar={toggle} onToggleTheme={toggleTheme} theme={theme} />
          </div>
        </div>

        <div className="flex">
          <Lab_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
