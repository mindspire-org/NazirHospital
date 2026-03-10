import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import {
  LayoutDashboard, ClipboardPlus, ListChecks, FlaskConical, FileText, BarChart3, PieChart,
  Boxes, Truck, History, Undo2, RotateCcw, CalendarCheck, Users, Settings as Cog,
  CalendarDays, UserCog, ScrollText, Receipt, Droplets, PackageOpen, UserPlus, Wallet, Calculator,
  ChevronDown, ChevronRight
} from 'lucide-react'

type Item = { to: string; label: string; end?: boolean; icon: any }
type NavItem = Item | { type: 'group'; label: string; icon: any; items: Item[] }

const staffItems: Item[] = [
  { to: '/lab/staff-management', label: 'Staff Management', icon: Users },
  { to: '/lab/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
  { to: '/lab/staff-settings', label: 'Staff Settings', icon: Cog },
  { to: '/lab/staff-monthly', label: 'Staff Monthly', icon: CalendarDays },
]

const bloodBankItems: Item[] = [
  { to: '/lab/bb/donors', label: 'Donors', icon: UserPlus },
  { to: '/lab/bb/inventory', label: 'Inventory', icon: PackageOpen },
  { to: '/lab/bb/receivers', label: 'Receivers', icon: Droplets },
]

const nav: NavItem[] = [
  { to: '/lab', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/lab/orders', label: 'Token Generation', icon: ClipboardPlus },
  { to: '/lab/tracking', label: 'Sample Tracking', icon: ListChecks },
  { to: '/lab/barcodes', label: 'Barcodes', icon: FileText },
  { to: '/lab/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/lab/tests', label: 'Test Catalog', icon: FlaskConical },
  { to: '/lab/results', label: 'Result Entry', icon: FileText },
  { to: '/lab/report-approval', label: 'Report Approval', icon: FileText },
  { to: '/lab/referrals', label: 'Referrals', icon: ListChecks },
  { to: '/lab/reports', label: 'Reports Generator', icon: BarChart3 },
  { to: '/lab/reports-summary', label: 'Reports', icon: PieChart },
  { to: '/lab/inventory', label: 'Inventory', icon: Boxes },
  { to: '/lab/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/lab/purchase-history', label: 'Purchase History', icon: History },
  { to: '/lab/supplier-returns', label: 'Supplier Returns', icon: Undo2 },
  { to: '/lab/return-history', label: 'Return History', icon: RotateCcw },
  // Blood Bank group
  { type: 'group', label: 'Blood Bank', icon: Droplets, items: bloodBankItems },
  // Staff group
  { type: 'group', label: 'Staff', icon: Users, items: staffItems },
  { to: '/lab/user-management', label: 'User Management', icon: UserCog },
  { to: '/lab/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  { to: '/lab/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/lab/expenses', label: 'Expenses', icon: Receipt },
  { to: '/lab/pay-in-out', label: 'Pay In / Out', icon: Wallet },
  { to: '/lab/manager-cash-count', label: 'Manager Cash Count', icon: Calculator },
  { to: '/lab/income-ledger', label: 'Income Ledger', icon: Receipt },
  { to: '/lab/settings', label: 'Settings', icon: Cog },
]

export const labSidebarNav = nav

export default function Lab_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [role, setRole] = useState<string>('admin')
  const [items, setItems] = useState(nav)
  const [staffOpen, setStaffOpen] = useState(false)
  const [bloodBankOpen, setBloodBankOpen] = useState(false)

  // Check if any staff page is active
  const isStaffActive = staffItems.some(item => location.pathname.startsWith(item.to))
  // Check if any blood bank page is active
  const isBloodBankActive = bloodBankItems.some(item => location.pathname.startsWith(item.to))

  const logout = async () => {
    try { await labApi.logoutUser() } catch {}
    try { localStorage.removeItem('lab.session') } catch {}
    navigate('/lab/login')
  }

  useEffect(()=>{
    try {
      const raw = localStorage.getItem('lab.session') || localStorage.getItem('user')
      if (raw){
        const u = JSON.parse(raw)
        if (u?.role) setRole(String(u.role).toLowerCase())
      }
    } catch {}
  }, [])

  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await labApi.listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const computed = nav
          .filter(item => {
            if ('type' in item && item.type === 'group') return true // Keep groups
            const itemTo = 'to' in item ? item.to : ''
            if (itemTo === '/lab/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
            const perm = map.get(itemTo)
            return perm ? perm.visible !== false : true
          })
          .sort((a,b)=>{
            const aTo = 'to' in a ? a.to : ''
            const bTo = 'to' in b ? b.to : ''
            const oa = map.get(aTo)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(bTo)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => 'to' in n && n.to === aTo)
            const ib = nav.findIndex(n => 'to' in n && n.to === bTo)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch { if (mounted) setItems(nav) }
    })()
    return ()=>{ mounted = false }
  }, [role])
  return (
    <aside
      className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-72'} md:flex-none md:shrink-0 md:sticky md:top-14 md:h-[calc(100dvh-3.5rem)] md:flex-col md:border-r`}
      style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-3'} space-y-1`}>
        {items.map(item => {
          // Staff group
          if ('type' in item && item.type === 'group' && item.label === 'Staff') {
            const GroupIcon = item.icon
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => setStaffOpen(o => !o)}
                  className={`w-full rounded-md px-3 py-2 text-sm font-medium flex items-center justify-between ${isStaffActive ? 'text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                  style={isStaffActive ? { background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className={isStaffActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700'} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (staffOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </button>
                {(staffOpen || isStaffActive) && !collapsed && (
                  <div className="ml-4 space-y-1">
                    {item.items.map(subItem => {
                      const SubIcon = subItem.icon
                      return (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          className={({ isActive }) => {
                            const base = 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                            const active = isActive
                              ? 'text-white'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            return `${base} ${active}`
                          }}
                          style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
                        >
                          {({ isActive }) => (
                            <>
                              <SubIcon className={isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-600'} />
                              <span>{subItem.label}</span>
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Blood Bank group
          if ('type' in item && item.type === 'group' && item.label === 'Blood Bank') {
            const GroupIcon = item.icon
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => setBloodBankOpen(o => !o)}
                  className={`w-full rounded-md px-3 py-2 text-sm font-medium flex items-center justify-between ${isBloodBankActive ? 'text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
                  style={isBloodBankActive ? { background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon className={isBloodBankActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700'} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (bloodBankOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                </button>
                {(bloodBankOpen || isBloodBankActive) && !collapsed && (
                  <div className="ml-4 space-y-1">
                    {item.items.map(subItem => {
                      const SubIcon = subItem.icon
                      return (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          className={({ isActive }) => {
                            const base = 'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                            const active = isActive
                              ? 'text-white'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            return `${base} ${active}`
                          }}
                          style={({ isActive }) => (isActive ? ({ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)' } as any) : undefined)}
                        >
                          {({ isActive }) => (
                            <>
                              <SubIcon className={isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-600'} />
                              <span>{subItem.label}</span>
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }
          
          // Regular item
          const regularItem = item as Item
          const Icon = regularItem.icon
          return (
            <NavLink
              key={regularItem.to}
              to={regularItem.to}
              title={collapsed ? regularItem.label : undefined}
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
              end={regularItem.end}
            >
              {({ isActive }) => (
                <>
                  <Icon className={collapsed ? (isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-slate-700') : (isActive ? 'h-4 w-4 text-white' : 'h-4 w-4 text-slate-700')} />
                  {!collapsed && <span>{regularItem.label}</span>}
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
        >Logout</button>
      </div>
    </aside>
  )
}
