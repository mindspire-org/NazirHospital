import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, BarChart3, FlaskConical, LayoutDashboard, Users, Activity, FileText, BookOpen, Receipt, Repeat, Scale, Store, Settings } from 'lucide-react'
import { financeApi } from '../../utils/api'

const nav = [
  { to: '/finance/pharmacy-reports', label: 'Pharmacy Reports', Icon: BarChart3 },
  { to: '/finance/lab-reports', label: 'Lab Reports', Icon: FlaskConical },
  // { to: '/finance/diagnostics-dashboard', label: 'Diagnostics Dashboard', Icon: LayoutDashboard },
  { to: '/finance/staff-dashboard', label: 'Staff Dashboard', Icon: Users },
  { to: '/finance/hospital-dashboard', label: 'Hospital Dashboard', Icon: Activity },
  { to: '/finance/vendors', label: 'Vendors', Icon: Store },
  { to: '/finance/trial-balance', label: 'Trial Balance', Icon: FileText },
  { to: '/finance/balance-sheet', label: 'Balance Sheet', Icon: Scale },
  { to: '/finance/ledger', label: 'Ledger', Icon: BookOpen },
  { to: '/finance/vouchers', label: 'Vouchers', Icon: Receipt },
  { to: '/finance/recurring', label: 'Recurring Payments', Icon: Repeat },
  { to: '/finance/combined', label: 'Combined Summary', Icon: Activity },
  { to: '/finance/liabilities', label: 'Liabilities', Icon: Scale },
  { to: '/finance/audit-logs', label: 'Audit Logs', Icon: FileText },
  { to: '/finance/sidebar-permissions', label: 'Sidebar Permissions', Icon: Settings },
  { to: '/finance/user-management', label: 'User Management', Icon: Users },
]

export const financeSidebarNav = nav

export default function Finance_Sidebar({ collapsed = false }: { collapsed?: boolean }){
  const navigate = useNavigate()
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  async function logout(){
    try {
      await financeApi.logout()
    } catch {}
    try { localStorage.removeItem('finance.session') } catch {}
    navigate('/finance/login')
  }
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {nav.map(item => {
          const Icon = item.Icon
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
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
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
