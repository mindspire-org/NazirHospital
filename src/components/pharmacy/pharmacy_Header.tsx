import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Bell } from 'lucide-react'
import { pharmacyApi } from '../../utils/api'
import { useEffect, useState } from 'react'
import Pharmacy_NotificationPopup from './pharmacy_NotificationPopup'

type Props = { onToggleSidebar?: () => void; onToggleTheme?: () => void; theme?: 'light'|'dark'; variant?: 'default' | 'navy' }

export default function Pharmacy_Header({ onToggleSidebar, onToggleTheme, theme, variant = 'default' }: Props) {
  const navigate = useNavigate()
  const [pharmacyName, setPharmacyName] = useState('Pharmacy')
  const [notificationCount, setNotificationCount] = useState(0)
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [displayName, setDisplayName] = useState<string>('Admin')
  const showThemeToggle = !!onToggleTheme && (theme === 'light' || theme === 'dark')

  useEffect(() => {
    let mounted = true
    pharmacyApi.getSettings().then(s => {
      if (mounted) setPharmacyName(s.pharmacyName || 'Pharmacy')
    }).catch(() => {})

    // Load display name from localStorage (best-effort)
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('pharmacy.user')
      if (raw) {
        const u = JSON.parse(raw)
        setDisplayName(u?.username || u?.name || u?.role || 'Admin')
      }
    } catch {}
    
    // Fetch notification count
    const fetchNotifications = async () => {
      try {
        const res: any = await pharmacyApi.getNotifications()
        if (mounted) setNotificationCount(Number(res?.unreadCount || 0))
      } catch {}
    }
    fetchNotifications()
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => { 
      mounted = false
      clearInterval(interval)
    }
  }, [])
  
  async function handleLogout(){
    try {
      await pharmacyApi.logoutUser(displayName)
      await pharmacyApi.createAuditLog({
        actor: displayName || 'system',
        action: 'Logout',
        label: 'LOGOUT',
        method: 'POST',
        path: '/pharmacy/logout',
        at: new Date().toISOString(),
        detail: 'User logout',
      })
    } catch {}
    try { localStorage.removeItem('user'); localStorage.removeItem('pharmacy.user'); localStorage.removeItem('pharmacy.token') } catch {}
    navigate('/pharmacy/login')
  }
  const isNavy = variant === 'navy'
  const headerCls = isNavy
    ? 'h-14 w-full'
    : 'sticky top-0 z-10 h-16 w-full border-b border-slate-200 bg-white/90 backdrop-blur'
  const innerCls = isNavy
    ? 'flex h-full w-full items-center gap-3 px-2 sm:px-3 text-white'
    : 'flex h-full items-center gap-3 px-4 sm:px-6'
  const btnCls = isNavy
    ? 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10'
    : 'mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50'
  const pillCls = isNavy ? 'ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/90' : 'ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
  const metaTextCls = isNavy ? 'hidden items-center gap-2 text-white/80 sm:flex' : 'hidden items-center gap-2 text-slate-600 sm:flex'
  const iconBtnCls = isNavy
    ? 'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10 transition-all'
    : 'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-all'
  const chipWrapCls = isNavy
    ? 'hidden sm:flex items-center rounded-full border border-white/15 bg-white/5 shadow-sm backdrop-blur overflow-hidden'
    : 'hidden sm:flex items-center rounded-full border border-slate-200 bg-white/70 shadow-sm backdrop-blur overflow-hidden'
  const chipBtnCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition'
  const chipDivCls = isNavy ? 'h-6 w-px bg-white/15' : 'h-6 w-px bg-slate-200'
  const chipTextCls = isNavy ? 'px-3 py-2 text-white capitalize' : 'px-3 py-2 text-slate-700 capitalize'
  const chipLogoutCls = isNavy
    ? 'inline-flex items-center gap-2 px-3 py-2 text-white hover:bg-white/10 transition'
    : 'inline-flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition'
  const mobileBtnCls = isNavy
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 sm:hidden'
    : 'inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 sm:hidden'
  const brandNameCls = isNavy ? 'text-xs font-medium text-white/80' : 'text-xs font-medium text-slate-500'
  const brandTitleCls = isNavy
    ? 'text-sm font-bold text-white'
    : 'text-sm font-bold bg-linear-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent'
  const mobileTitleCls = isNavy ? 'font-semibold text-white sm:hidden' : 'font-semibold text-slate-900 sm:hidden'

  return (
    <header className={headerCls}>
      <div className={innerCls}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={btnCls}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/pharmacy" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-5 w-5'><path d='M4.5 12a5.5 5.5 0 0 1 9.9-3.3l.4.5 3 3a5.5 5.5 0 0 1-7.8 7.8l-3-3-.5-.4A5.48 5.48 0 0 1 4.5 12Zm4.9-3.6L7.1 10l6.9 6.9 2.3-2.3-6.9-6.9Z'/></svg>
          </div>
          <div className="hidden sm:block">
            <div className={brandNameCls}>{pharmacyName}</div>
            <div className={brandTitleCls}>HealthSpire</div>
          </div>
          <div className={mobileTitleCls}>{pharmacyName}</div>
          <span className={pillCls}>Online</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 text-sm">
          {/* Notification Bell */}
          <button
            type="button"
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            className={iconBtnCls}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          <div className={metaTextCls}>
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className='h-4 w-4'><path d='M6.75 3A2.75 2.75 0 0 0 4 5.75v12.5A2.75 2.75 0 0 0 6.75 21h10.5A2.75 2.75 0 0 0 20 18.25V5.75A2.75 2.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5c.69 0 1.25.56 1.25 1.25v12.5c0 .69-.56 1.25-1.25 1.25H6.75c-.69 0-1.25-.56-1.25-1.25V5.75c0-.69.56-1.25 1.25-1.25Z'/></svg>
            <span>{new Date().toLocaleDateString()}</span>
            <span className="opacity-60">{new Date().toLocaleTimeString()}</span>
          </div>

          {showThemeToggle ? (
            <button
              type="button"
              onClick={() => onToggleTheme?.()}
              className={mobileBtnCls}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <span className="text-xs font-semibold">T</span>
            </button>
          ) : null}

          <div className={chipWrapCls}>
            {showThemeToggle ? (
              <button
                type="button"
                onClick={() => onToggleTheme?.()}
                className={chipBtnCls}
                title="Toggle theme"
              >
                <span className="text-sm font-medium">Theme</span>
              </button>
            ) : null}

            {showThemeToggle ? <div className={chipDivCls} /> : null}

            <div className={chipTextCls}>
              <span className="text-sm font-medium">{displayName}</span>
            </div>

            <div className={chipDivCls} />

            <button
              type="button"
              onClick={handleLogout}
              className={chipLogoutCls}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={mobileBtnCls}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Notification Popup */}
      <Pharmacy_NotificationPopup
        open={showNotificationPopup}
        onClose={() => setShowNotificationPopup(false)}
        onViewAll={() => {
          setShowNotificationPopup(false)
          navigate('/pharmacy/notifications')
        }}
      />
    </header>
  )
}

