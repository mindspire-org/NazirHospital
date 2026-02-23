import { useState, useEffect } from 'react'
import { X, Bell, CheckCircle, Trash2, Clock } from 'lucide-react'
import { pharmacyApi } from '../../utils/api'

type Notification = {
  _id: string
  type: 'low_stock' | 'expiring_soon' | 'purchase' | 'finance' | 'closing_balance' | 'alert'
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  read: boolean
  createdAt: string
  metadata?: any
}

type Props = {
  open: boolean
  onClose: () => void
  onViewAll: () => void
}

export default function Pharmacy_NotificationPopup({ open, onClose, onViewAll }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res: any = await pharmacyApi.getNotifications()
      const allNotifications = res?.notifications || []
      // Show only unread or latest 5
      const unread = allNotifications.filter((n: Notification) => !n.read)
      const toShow = unread.length > 0 ? unread.slice(0, 5) : allNotifications.slice(0, 5)
      setNotifications(toShow)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await pharmacyApi.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await pharmacyApi.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/20 dark:border-rose-700 dark:text-rose-300'
      case 'warning': return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300'
      case 'success': return 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300'
      default: return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      
      {/* Popup */}
      <div className="fixed right-4 top-16 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border-2 border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`rounded-lg border p-3 ${getSeverityColor(notification.severity)} ${!notification.read ? 'ring-2 ring-indigo-400/50' : ''}`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold truncate">{notification.title}</h4>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        )}
                      </div>
                      <p className="mt-1 text-xs line-clamp-2">{notification.message}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="rounded p-1 hover:bg-white/50 dark:hover:bg-slate-800/50"
                          title="Mark as read"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="rounded p-1 hover:bg-white/50 dark:hover:bg-slate-800/50"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-700">
          <button
            onClick={onViewAll}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-all"
          >
            View All Notifications
          </button>
        </div>
      </div>
    </>
  )
}
