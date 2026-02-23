import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Pharmacy_Sidebar from '../../components/pharmacy/pharmacy_Sidebar'
import Pharmacy_Header from '../../components/pharmacy/pharmacy_Header'
import { useEffect, useState } from 'react'

export default function Pharmacy_Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const theme: 'light' = 'light'
  useEffect(() => {
    const html = document.documentElement
    try { html.classList.remove('dark') } catch {}
    return () => { try { html.classList.remove('dark') } catch {} }
  }, [])
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const tag = (t?.tagName || '').toLowerCase()
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable
      if (isTyping) return

      const key = e.key?.toLowerCase?.() || ''
      if (e.ctrlKey && !e.shiftKey && key === 'n') {
        e.preventDefault()
        navigate('/pharmacy/pos')
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'r') {
        e.preventDefault()
        navigate('/pharmacy/reports')
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'i') {
        e.preventDefault()
        navigate('/pharmacy/inventory')
        return
      }
      if (e.ctrlKey && !e.shiftKey && key === 'd') {
        if (location.pathname.startsWith('/pharmacy/pos')) {
          e.preventDefault()
          setTimeout(() => { (document.getElementById('pharmacy-pos-search') as HTMLInputElement | null)?.focus() }, 0)
        }
        return
      }
      if (e.shiftKey && !e.ctrlKey && key === 'f') {
        if (location.pathname.startsWith('/pharmacy/inventory')) {
          e.preventDefault()
          setTimeout(() => { (document.getElementById('pharmacy-inventory-search') as HTMLInputElement | null)?.focus() }, 0)
        }
        return
      }
      if (e.ctrlKey && !e.shiftKey && key === 'p') {
        if (location.pathname.startsWith('/pharmacy/pos')) {
          e.preventDefault()
          try { window.dispatchEvent(new Event('pharmacy:pos:pay')) } catch {}
        }
        return
      }
    }
    window.addEventListener('keydown', onKeyDown as any)
    return () => window.removeEventListener('keydown', onKeyDown as any)
  }, [navigate, location.pathname])
  const shell = 'h-dvh bg-slate-50 text-slate-900'
  return (
    <div className="pharmacy-scope">
      <div className={shell}>
        <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex h-14">
            <Pharmacy_Header
              variant="navy"
              onToggleSidebar={() => setCollapsed(c => !c)}
              theme={theme}
            />
          </div>
        </div>

        <div className="flex">
          <Pharmacy_Sidebar collapsed={collapsed} />
          <main className="w-full flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
