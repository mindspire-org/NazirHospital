import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { diagnosticApi } from '../../utils/api'
import {
  LayoutDashboard, ListChecks, FlaskConical, FileText, BarChart3, ScrollText,
  Settings as Cog, Ticket, UserCog, LogOut, DollarSign
} from 'lucide-react'

type Item = { to: string; label: string; end?: boolean; icon: any }
const nav: Item[] = [
  { to: '/diagnostic', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/diagnostic/token-generator', label: 'Token Generator', icon: Ticket },
  { to: '/diagnostic/tests', label: 'Tests', icon: FlaskConical },
  { to: '/diagnostic/sample-tracking', label: 'Sample Tracking', icon: ListChecks },
  { to: '/diagnostic/result-entry', label: 'Result Entry', icon: FileText },
  { to: '/diagnostic/report-generator', label: 'Report Generator', icon: BarChart3 },
  { to: '/diagnostic/income-ledger', label: 'Income Ledger', icon: DollarSign },
  { to: '/diagnostic/referrals', label: 'Referrals', icon: ListChecks },
  { to: '/diagnostic/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  { to: '/diagnostic/user-management', label: 'User Management', icon: UserCog },
  { to: '/diagnostic/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/diagnostic/settings', label: 'Settings', icon: Cog },
]

export const diagnosticSidebarNav = nav

export default function Diagnostic_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [role, setRole] = useState<string>('admin')
  const [items, setItems] = useState(nav)

  const logout = async () => {
    try { await diagnosticApi.logout() } catch {}
    try { localStorage.removeItem('token'); localStorage.removeItem('diagnostic.user') } catch {}
    navigate('/diagnostic/login')
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('diagnostic.user') || localStorage.getItem('user')
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
        const res: any = await (diagnosticApi as any).listSidebarPermissions?.(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const isAdmin = String(role || '').toLowerCase() === 'admin'
        const computed = nav
          .filter(item => {
            if (item.to === '/diagnostic/sidebar-permissions' && !isAdmin) return false
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
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-72'} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {items.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
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
              end={item.end}
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700')} />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className={collapsed ? 'p-2' : 'p-3'}>
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={collapsed ? 'w-full inline-flex items-center justify-center rounded-md p-2 text-sm font-medium' : 'w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium'}
          style={{ backgroundColor: '#ffffff', color: 'var(--navy)', border: '1px solid var(--navy)' }}
          onMouseEnter={e => { try { ;(e.currentTarget as any).style.backgroundColor = 'rgba(15,45,92,0.06)' } catch {} }}
          onMouseLeave={e => { try { ;(e.currentTarget as any).style.backgroundColor = '#ffffff' } catch {} }}
        >
          {!collapsed && <LogOut className="h-4 w-4" />}
          {!collapsed && 'Logout'}
          {collapsed && <LogOut className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  )
}
