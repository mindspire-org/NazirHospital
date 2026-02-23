export type DoctorNotification = { id: string; doctorId: string; message: string; createdAt: string; read?: boolean }

const KEY = 'doctor.notifications'

export function readDoctorNotifications(): DoctorNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) as DoctorNotification[] : []
  } catch { return [] }
}

export function sendDoctorNotification(doctorId: string, message: string) {
  const n: DoctorNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    doctorId,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }
  const list = [n, ...readDoctorNotifications()].slice(0, 1000)
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
  return n
}
