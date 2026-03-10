import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LogOut, Ticket, ListChecks, Settings as Cog, UserCog } from 'lucide-react'
import { receptionApi } from '../../utils/api'

type Item = { to: string; label: string; icon: any; end?: boolean }

const nav: Item[] = [
  { to: '/reception/token-generator', label: 'Token Generator', icon: Ticket },
  { to: "/reception/today-tokens", label: "Today's Tokens", icon: ListChecks },
  { to: '/reception/ipd-billing', label: 'IPD Billing', icon: Ticket },
  { to: '/reception/ipd-transactions', label: 'Recent IPD Payments', icon: ListChecks },
  { to: '/reception/er-billing', label: 'ER Billing', icon: Ticket },
  { to: '/reception/er-transactions', label: 'Recent ER Payments', icon: ListChecks },
  // { to: '/reception/diagnostic/token-generator', label: 'Diagnostic Token Generator', icon: Ticket },
  // { to: '/reception/diagnostic/sample-tracking', label: 'Diagnostic Sample Tracking', icon: ListChecks },
  { to: '/reception/lab/sample-intake', label: 'Lab Sample Intake', icon: Ticket },
  { to: '/reception/lab/sample-tracking', label: 'Lab Sample Tracking', icon: ListChecks },
  { to: '/reception/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  { to: '/reception/user-management', label: 'User Management', icon: UserCog },
]

export const receptionSidebarNav = nav

export default function Reception_Sidebar({ collapsed = false }: { collapsed?: boolean }){
  const navigate = useNavigate()
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  const [role, setRole] = useState<string>('receptionist')
  const [items, setItems] = useState<Item[]>(nav)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('reception.user') || localStorage.getItem('reception.session')
      if (raw) {
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res: any = await (receptionApi as any).listSidebarPermissions?.(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const isAdmin = String(role || '').toLowerCase() === 'admin'
        const computed = nav
          .filter(item => {
            if (item.to === '/reception/sidebar-permissions' && !isAdmin) return false
            const perm = map.get(item.to)
            return perm ? perm.visible !== false : true
          })
          .sort((a, b) => {
            const oa = map.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => n.to === a.to)
            const ib = nav.findIndex(n => n.to === b.to)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch {
        if (mounted) setItems(nav)
      }
    })()
    return () => { mounted = false }
  }, [role])

  async function logout(){
    try { await receptionApi.logout() } catch {}
    try { localStorage.removeItem('reception.token'); localStorage.removeItem('token'); localStorage.removeItem('reception.user'); localStorage.removeItem('reception.session') } catch {}
    navigate('/reception/login')
  }
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {items.map((it)=>{
          const Icon = it.icon
          return (
            <NavLink key={it.to} to={it.to} end={it.end}
              title={collapsed ? it.label : undefined}
              style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
              className={({ isActive }) => {
                const base = collapsed
                  ? 'rounded-md p-2 text-sm font-medium flex items-center justify-center'
                  : 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                const active = isActive
                  ? 'text-white'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                return `${base} ${active}`
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700')} />
                  {!collapsed && <span>{it.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className={collapsed ? 'p-2' : 'p-3'}>
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium'}
          style={{ backgroundColor: '#ffffff', color: 'var(--navy)', border: '1px solid var(--navy)' }}
          onMouseEnter={e => { try { ;(e.currentTarget as any).style.backgroundColor = 'rgba(15,45,92,0.06)' } catch {} }}
          onMouseLeave={e => { try { ;(e.currentTarget as any).style.backgroundColor = '#ffffff' } catch {} }}
        >
          <LogOut className="h-4 w-4" /> {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  )
}
