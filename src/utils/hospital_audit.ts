export type AuditAction =
  | 'login'
  | 'logout'
  | 'token_generate'
  | 'token_edit'
  | 'token_return'
  | 'token_delete'
  | 'department_add'
  | 'department_edit'
  | 'department_delete'
  | 'user_add'
  | 'user_edit'
  | 'user_delete'

export interface AuditEntry {
  id: string
  ts: string // ISO timestamp
  user: string
  action: AuditAction
  details?: string
}

const STORAGE_KEY = 'hospital_audit_logs'

export function getAudit(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr as AuditEntry[]
    return []
  } catch {
    return []
  }
}

function saveAudit(list: AuditEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}

export function logAudit(action: AuditAction, details?: string, user = 'admin') {
  const entry: AuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    ts: new Date().toISOString(),
    user,
    action,
    details,
  }
  const list = [entry, ...getAudit()].slice(0, 1000)
  saveAudit(list)
}

export function clearAudit() {
  saveAudit([])
}
