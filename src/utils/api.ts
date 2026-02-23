const rawBase = (import.meta as any).env?.VITE_API_URL as string | undefined
const baseURL = rawBase
  ? (/^https?:/i.test(rawBase) ? rawBase : `http://127.0.0.1:4000${rawBase}`)
  : 'http://127.0.0.1:4000/api'

function getToken(path?: string) {
  try {
    if (path) {
      if (path.startsWith('/reception')) return localStorage.getItem('reception.token') || localStorage.getItem('token') || ''
      if (path.startsWith('/hospital')) return localStorage.getItem('hospital.token') || localStorage.getItem('token') || ''
      if (path.startsWith('/diagnostic')) return localStorage.getItem('diagnostic.token') || localStorage.getItem('token') || ''
      if (path.startsWith('/lab')) return localStorage.getItem('lab.token') || localStorage.getItem('aesthetic.token') || localStorage.getItem('token') || ''
      if (path.startsWith('/aesthetic')) return localStorage.getItem('aesthetic.token') || localStorage.getItem('token') || ''
      if (path.startsWith('/pharmacy')) return localStorage.getItem('pharmacy.token') || localStorage.getItem('token') || ''
    }
    // Fallback legacy token key
    return localStorage.getItem('token') || ''
  } catch { return '' }
}

function getAdminKey() {
  try {
    const raw = localStorage.getItem('hospital_backup_settings')
    if (!raw) return ''
    const s = JSON.parse(raw)
    return s?.adminKey || ''
  } catch { return '' }
}

export const adminApi = {
  exportAll: async () => api('/admin/backup/export', { headers: { 'x-admin-key': getAdminKey() } }),
  restoreAll: async (data: any) => api('/admin/backup/restore', { method: 'POST', body: JSON.stringify({ ...data, confirm: 'RESTORE' }), headers: { 'x-admin-key': getAdminKey() } }),
  purgeAll: async () => api('/admin/backup/purge', { method: 'POST', body: JSON.stringify({ confirm: 'PURGE' }), headers: { 'x-admin-key': getAdminKey() } }),
}

export const diagnosticApi = {
  // Tests (Catalog for Diagnostics)
  listTests: (params?: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/diagnostic/tests${s ? `?${s}` : ''}`)
  },



  // Cash Movements (Pay In/Out)
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.type) qs.set('type', params.type)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/cash-movements${s ? `?${s}` : ''}`)
  },
  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-movements', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashMovement: (id: string) => api(`/lab/cash-movements/${id}`, { method: 'DELETE' }),
  cashMovementSummary: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT' }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.type) qs.set('type', params.type)
    const s = qs.toString()
    return api(`/lab/cash-movements/summary${s ? `?${s}` : ''}`)
  },

  // Manager Cash Count
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/cash-counts${s ? `?${s}` : ''}`)
  },
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/lab/cash-counts/${id}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    const s = qs.toString()
    return api(`/lab/cash-counts/summary${s ? `?${s}` : ''}`)
  },


  createTest: (data: { name: string; price?: number }) => api('/diagnostic/tests', { method: 'POST', body: JSON.stringify(data) }),
  updateTest: (id: string, data: { name?: string; price?: number }) => api(`/diagnostic/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTest: (id: string) => api(`/diagnostic/tests/${id}`, { method: 'DELETE' }),

  // Orders (Samples)
  listOrders: (params?: { q?: string; status?: 'received' | 'completed' | 'returned'; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.status) qs.set('status', params.status)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/diagnostic/orders${s ? `?${s}` : ''}`)
  },
  createOrder: (data: { patientId: string; patient: { mrn?: string; fullName: string; phone?: string; age?: string; gender?: string; address?: string; guardianRelation?: string; guardianName?: string; cnic?: string }; tests: string[]; subtotal?: number; discount?: number; net?: number; referringConsultant?: string; tokenNo?: string; corporateId?: string; corporatePreAuthNo?: string; corporateCoPayPercent?: number; corporateCoverageCap?: number }) =>
    api('/diagnostic/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: { tests?: string[]; patient?: { mrn?: string; fullName?: string; phone?: string; age?: string; gender?: string; address?: string; guardianRelation?: string; guardianName?: string; cnic?: string }; subtotal?: number; discount?: number; net?: number }) =>
    api(`/diagnostic/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateOrderTrack: (id: string, data: { sampleTime?: string; reportingTime?: string; status?: 'received' | 'completed' | 'returned'; referringConsultant?: string }) =>
    api(`/diagnostic/orders/${id}/track`, { method: 'PUT', body: JSON.stringify(data) }),
  // Per-test item operations
  updateOrderItemTrack: (id: string, testId: string, data: { sampleTime?: string; reportingTime?: string; status?: 'received' | 'completed' | 'returned'; referringConsultant?: string }) =>
    api(`/diagnostic/orders/${id}/items/${encodeURIComponent(testId)}/track`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrderItem: (id: string, testId: string) =>
    api(`/diagnostic/orders/${id}/items/${encodeURIComponent(testId)}`, { method: 'DELETE' }),
  deleteOrder: (id: string) => api(`/diagnostic/orders/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => api('/diagnostic/settings'),
  updateSettings: (data: { diagnosticName?: string; phone?: string; address?: string; email?: string; reportFooter?: string; logoDataUrl?: string; department?: string; consultantName?: string; consultantDegrees?: string; consultantTitle?: string; consultants?: Array<{ name?: string; degrees?: string; title?: string }>; templateMappings?: Array<{ testId: string; testName?: string; templateKey: string }> }) =>
    api('/diagnostic/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Results
  listResults: (params?: { orderId?: string; testId?: string; status?: 'draft' | 'final'; q?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.orderId) qs.set('orderId', params.orderId)
    if (params?.testId) qs.set('testId', params.testId)
    if (params?.status) qs.set('status', params.status)
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/diagnostic/results${s ? `?${s}` : ''}`)
  },
  getResult: (id: string) => api(`/diagnostic/results/${id}`),
  createResult: (data: { orderId: string; testId: string; testName: string; tokenNo?: string; patient?: any; formData?: any; images?: string[]; status?: 'draft' | 'final'; reportedBy?: string; reportedAt?: string; templateVersion?: string; notes?: string }) =>
    api('/diagnostic/results', { method: 'POST', body: JSON.stringify(data) }),
  updateResult: (id: string, data: { formData?: any; images?: string[]; status?: 'draft' | 'final'; reportedBy?: string; reportedAt?: string; notes?: string; patient?: any }) =>
    api(`/diagnostic/results/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteResult: (id: string) => api(`/diagnostic/results/${id}`, { method: 'DELETE' }),
  // Audit Logs
  listAuditLogs: (params?: { search?: string; action?: string; subjectType?: string; subjectId?: string; actorUsername?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.action) qs.set('action', params.action)
    if (params?.subjectType) qs.set('subjectType', params.subjectType)
    if (params?.subjectId) qs.set('subjectId', params.subjectId)
    if (params?.actorUsername) qs.set('actorUsername', params.actorUsername)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/diagnostic/audit-logs${s ? `?${s}` : ''}`)
  },
  createAuditLog: (data: { action: string; subjectType?: string; subjectId?: string; message?: string; data?: any }) => api('/diagnostic/audit-logs', { method: 'POST', body: JSON.stringify(data) }),
  // Auth
  login: (username: string, password: string) => api('/diagnostic/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/diagnostic/logout', { method: 'POST' }),

  // Users
  listUsers: () => api('/diagnostic/users'),
  createUser: (data: any) => api('/diagnostic/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/diagnostic/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/diagnostic/users/${id}`, { method: 'DELETE' }),

  // Sidebar Roles & Permissions (Diagnostic)
  listSidebarRoles: () => api('/diagnostic/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/diagnostic/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/diagnostic/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/diagnostic/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/diagnostic/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/diagnostic/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/diagnostic/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),
}

export const receptionApi = {
  // Auth
  login: (username: string, password: string) => api('/reception/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/reception/logout', { method: 'POST' }),

  // Users
  listUsers: () => api('/reception/users'),
  createUser: (data: { username: string; role: string; password: string }) =>
    api('/reception/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { username?: string; role?: string; password?: string }) =>
    api(`/reception/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/reception/users/${id}`, { method: 'DELETE' }),

  // Sidebar Roles & Permissions
  listSidebarRoles: () => api('/reception/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/reception/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/reception/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/reception/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/reception/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/reception/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/reception/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),
}

export const corporateApi = {
  listCompanies: (params?: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/corporate/companies${s ? `?${s}` : ''}`)
  },
  createCompany: (data: { name: string; code?: string; contactName?: string; phone?: string; email?: string; address?: string; terms?: string; billingCycle?: string; active?: boolean }) =>
    api('/corporate/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: { name?: string; code?: string; contactName?: string; phone?: string; email?: string; address?: string; terms?: string; billingCycle?: string; active?: boolean }) =>
    api(`/corporate/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => api(`/corporate/companies/${id}`, { method: 'DELETE' }),
  listRateRules: (params?: { companyId?: string; scope?: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.companyId) qs.set('companyId', params.companyId)
    if (params?.scope) qs.set('scope', params.scope)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/corporate/rate-rules${s ? `?${s}` : ''}`)
  },
  createRateRule: (data: { companyId: string; scope: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; ruleType: 'default' | 'department' | 'doctor' | 'test' | 'testGroup' | 'procedure' | 'service' | 'bedCategory'; refId?: string; visitType?: 'new' | 'followup' | 'any'; mode: 'fixedPrice' | 'percentDiscount' | 'fixedDiscount'; value: number; priority?: number; effectiveFrom?: string; effectiveTo?: string; active?: boolean }) =>
    api('/corporate/rate-rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRateRule: (id: string, data: Partial<{ companyId: string; scope: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; ruleType: 'default' | 'department' | 'doctor' | 'test' | 'testGroup' | 'procedure' | 'service' | 'bedCategory'; refId?: string; visitType?: 'new' | 'followup' | 'any'; mode: 'fixedPrice' | 'percentDiscount' | 'fixedDiscount'; value: number; priority?: number; effectiveFrom?: string; effectiveTo?: string; active?: boolean }>) =>
    api(`/corporate/rate-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRateRule: (id: string) => api(`/corporate/rate-rules/${id}`, { method: 'DELETE' }),
  reportsOutstanding: (params?: { companyId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.companyId) qs.set('companyId', params.companyId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/corporate/reports/outstanding${s ? `?${s}` : ''}`)
  },
  reportsAging: (params?: { companyId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.companyId) qs.set('companyId', params.companyId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/corporate/reports/aging${s ? `?${s}` : ''}`)
  },
  // Transactions
  listTransactions: (params?: { companyId?: string; serviceType?: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; refType?: 'opd_token' | 'lab_order' | 'diag_order' | 'ipd_billing_item'; refId?: string; status?: 'accrued' | 'claimed' | 'paid' | 'reversed' | 'rejected'; patientMrn?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.companyId) qs.set('companyId', params.companyId)
    if (params?.serviceType) qs.set('serviceType', params.serviceType)
    if (params?.refType) qs.set('refType', params.refType)
    if (params?.refId) qs.set('refId', params.refId)
    if (params?.status) qs.set('status', params.status)
    if (params?.patientMrn) qs.set('patientMrn', params.patientMrn)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/corporate/transactions${s ? `?${s}` : ''}`)
  },
  // Claims
  listClaims: (params?: { companyId?: string; status?: 'open' | 'locked' | 'exported' | 'partially-paid' | 'paid' | 'rejected'; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.companyId) qs.set('companyId', params.companyId)
    if (params?.status) qs.set('status', params.status)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/corporate/claims${s ? `?${s}` : ''}`)
  },
  getClaim: (id: string) => api(`/corporate/claims/${id}`),
  generateClaim: (data: { companyId: string; fromDate?: string; toDate?: string; patientMrn?: string; departmentId?: string; serviceType?: 'OPD' | 'LAB' | 'DIAG' | 'IPD'; refType?: 'opd_token' | 'lab_order' | 'diag_order' | 'ipd_billing_item' }) =>
    api('/corporate/claims/generate', { method: 'POST', body: JSON.stringify(data) }),
  lockClaim: (id: string) => api(`/corporate/claims/${id}/lock`, { method: 'POST' }),
  unlockClaim: (id: string) => api(`/corporate/claims/${id}/unlock`, { method: 'POST' }),
  // Some backends expose different routes for deletion. Try multiple patterns.
  deleteClaim: async (id: string) => {
    const attempts: Array<{ path: string; init?: RequestInit }> = [
      { path: `/corporate/claims/${id}`, init: { method: 'DELETE' } },
      { path: `/corporate/claims/${id}/delete`, init: { method: 'POST' } },
      { path: `/corporate/claims/delete`, init: { method: 'POST', body: JSON.stringify({ id }) } },
      { path: `/corporate/claim/${id}`, init: { method: 'DELETE' } },
      { path: `/corporate/claim/${id}/delete`, init: { method: 'POST' } },
      { path: `/corporate/claim/delete`, init: { method: 'POST', body: JSON.stringify({ id }) } },
      { path: `/corporate/claims/${id}`, init: { method: 'POST', headers: { 'X-HTTP-Method-Override': 'DELETE' } } },
      { path: `/corporate/claims/${id}/remove`, init: { method: 'POST' } },
      { path: `/corporate/claims/remove`, init: { method: 'POST', body: JSON.stringify({ id }) } },
    ]
    let lastErr: any
    for (const a of attempts) {
      try { return await api(a.path, a.init) } catch (e) { lastErr = e }
    }
    throw lastErr || new Error('Failed to delete claim')
  },
  exportClaimUrl: (id: string) => `${(import.meta as any).env?.VITE_API_URL || ((typeof window !== 'undefined' && (window.location?.protocol === 'file:' || /Electron/i.test(navigator.userAgent || ''))) ? 'http://127.0.0.1:4000/api' : 'http://127.0.0.1:4000/api')}/corporate/claims/${encodeURIComponent(id)}/export`,
  // Payments
  listPayments: (params?: { companyId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.companyId) qs.set('companyId', params.companyId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/corporate/payments${s ? `?${s}` : ''}`)
  },
  getPayment: (id: string) => api(`/corporate/payments/${id}`),
  createPayment: (data: { companyId: string; dateIso: string; amount: number; refNo?: string; notes?: string; allocations?: Array<{ transactionId: string; amount: number }> }) => api('/corporate/payments', { method: 'POST', body: JSON.stringify(data) }),
}

export async function api(path: string, init?: RequestInit) {
  const token = getToken(path)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${baseURL}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    // Auto-persist Hospital JWT on login, and clear on logout
    try {
      if (path.startsWith('/reception') && /\/login$/.test(path) && (data as any)?.token) {
        localStorage.setItem('reception.token', (data as any).token)
        localStorage.setItem('token', (data as any).token)
      }
      if (path.startsWith('/reception') && /\/logout$/.test(path)) {
        localStorage.removeItem('reception.token')
      }
      if (path.startsWith('/hospital') && /\/users\/login$/.test(path) && (data as any)?.token) {
        localStorage.setItem('hospital.token', (data as any).token)
        localStorage.setItem('token', (data as any).token)
      }
      if (path.startsWith('/hospital') && /\/users\/logout$/.test(path)) {
        localStorage.removeItem('hospital.token')
      }
    } catch { }
    return data
  }
  return res.text()
}
type CacheEntry = { at: number; data: any }
const __apiCache: Map<string, CacheEntry> = new Map()

async function cachedApi(path: string, init?: RequestInit, opts?: { ttlMs?: number; cacheKey?: string; forceRefresh?: boolean }) {
  const method = (init?.method || 'GET').toUpperCase()
  const isGet = method === 'GET'
  const ttl = Math.max(0, opts?.ttlMs ?? 60_000)
  const token = getToken(path)
  const key = opts?.cacheKey || `${token || ''}::${path}`

  if (!isGet) {
    return api(path, init)
  }

  if (!opts?.forceRefresh && ttl > 0) {
    const hit = __apiCache.get(key)
    if (hit && (Date.now() - hit.at) < ttl) {
      return hit.data
    }
  }

  const data = await api(path, init)
  if (ttl > 0) __apiCache.set(key, { at: Date.now(), data })
  return data
}

export const pharmacyApi = {
  // Settings
  getSettings: () => api('/pharmacy/settings'),
  updateSettings: (data: any) => api('/pharmacy/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Suppliers
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') {
      return api(`/pharmacy/suppliers?q=${encodeURIComponent(params)}`)
    }
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/suppliers${s ? `?${s}` : ''}`)
  },
  listAllSuppliers: (q?: string) => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    qs.set('limit', '500')
    const s = qs.toString()
    return api(`/pharmacy/suppliers${s ? `?${s}` : ''}`)
  },
  createSupplier: (data: any) => api('/pharmacy/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/pharmacy/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/pharmacy/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) => api(`/pharmacy/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/pharmacy/suppliers/${id}/purchases`),

  // Companies
  listCompanies: (params?: { q?: string; distributorId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.distributorId) qs.set('distributorId', params.distributorId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/companies${s ? `?${s}` : ''}`)
  },
  listAllCompanies: (params?: { q?: string; distributorId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.distributorId) qs.set('distributorId', params.distributorId)
    qs.set('limit', '500')
    const s = qs.toString()
    return api(`/pharmacy/companies${s ? `?${s}` : ''}`)
  },
  createCompany: (data: { name: string; distributorId?: string; distributorName?: string; status?: 'Active' | 'Inactive' }) =>
    api('/pharmacy/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: Partial<{ name: string; distributorId?: string; distributorName?: string; status?: 'Active' | 'Inactive' }>) =>
    api(`/pharmacy/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => api(`/pharmacy/companies/${id}`, { method: 'DELETE' }),
  listSupplierCompanies: (supplierId: string) => api(`/pharmacy/suppliers/${supplierId}/companies`),
  assignSupplierCompanies: (supplierId: string, data: { companyIds?: string[]; unassignIds?: string[] }) =>
    api(`/pharmacy/suppliers/${supplierId}/companies`, { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  listCustomers: (params?: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/customers${s ? `?${s}` : ''}`)
  },
  createCustomer: (data: any) => api('/pharmacy/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => api(`/pharmacy/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => api(`/pharmacy/customers/${id}`, { method: 'DELETE' }),

  // Expenses
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; user?: string; page?: number; limit?: number; }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.minAmount != null) qs.set('minAmount', String(params.minAmount))
    if (params?.search) qs.set('search', params.search)
    if (params?.type) qs.set('type', params.type)
    if (params?.user) qs.set('user', params.user)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/expenses${s ? `?${s}` : ''}`)
  },
  createExpense: (data: any) => api('/pharmacy/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/pharmacy/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/pharmacy/expenses/summary${s ? `?${s}` : ''}`)
  },

  // Cash Movements (Pay In/Out)
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.type) qs.set('type', params.type)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/cash-movements${s ? `?${s}` : ''}`)
  },
  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/pharmacy/cash-movements', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashMovement: (id: string) => api(`/pharmacy/cash-movements/${id}`, { method: 'DELETE' }),
  cashMovementSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/pharmacy/cash-movements/summary${s ? `?${s}` : ''}`)
  },

  // Manager Cash Count
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/cash-counts${s ? `?${s}` : ''}`)
  },
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/pharmacy/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/pharmacy/cash-counts/${id}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    const s = qs.toString()
    return api(`/pharmacy/cash-counts/summary${s ? `?${s}` : ''}`)
  },

  // Medicines (suggestions for POS / inventory) — backed by inventory search
  searchMedicines: async (q?: string, limit?: number) => {
    const qs = new URLSearchParams()
    if (q) qs.set('search', q)
    qs.set('limit', String(limit || 20))
    const res: any = await api(`/pharmacy/inventory${qs.toString() ? `?${qs}` : ''}`)
    const items: any[] = res?.items ?? res ?? []
    return { suggestions: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  // Preload medicines list (for autocomplete warmup)
  getAllMedicines: async () => {
    const qs = new URLSearchParams(); qs.set('limit', '2000')
    const res: any = await api(`/pharmacy/inventory?${qs}`)
    const items: any[] = res?.items ?? res ?? []
    return { medicines: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  createMedicine: (data: any) => api('/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),

  // Shifts
  listShifts: () => api('/pharmacy/shifts'),
  createShift: (data: any) => api('/pharmacy/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/pharmacy/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/pharmacy/shifts/${id}`, { method: 'DELETE' }),

  // Staff
  listStaff: (params?: { q?: string; shiftId?: string; page?: number; limit?: number } | string) => {
    if (typeof params === 'string') {
      return api(`/pharmacy/staff?q=${encodeURIComponent(params)}`)
    }
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/staff${s ? `?${s}` : ''}`)
  },
  createStaff: (data: any) => api('/pharmacy/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/pharmacy/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/pharmacy/staff/${id}`, { method: 'DELETE' }),

  // Attendance
  listAttendance: (params?: { date?: string; shiftId?: string; staffId?: string; from?: string; to?: string; page?: number; limit?: number; }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/attendance${s ? `?${s}` : ''}`)
  },
  upsertAttendance: (data: any) => api('/pharmacy/attendance', { method: 'POST', body: JSON.stringify(data) }),

  // Staff Earnings
  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/staff-earnings${s ? `?${s}` : ''}`)
  },
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/pharmacy/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/pharmacy/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/pharmacy/staff-earnings/${id}`, { method: 'DELETE' }),

  // Sales / POS
  listSales: (params?: { bill?: string; customer?: string; customerId?: string; payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; medicine?: string; user?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.bill) qs.set('bill', params.bill)
    if (params?.customer) qs.set('customer', params.customer)
    if (params?.customerId) qs.set('customerId', params.customerId)
    if (params?.payment) qs.set('payment', params.payment)
    if (params?.medicine) qs.set('medicine', params.medicine)
    if (params?.user) qs.set('user', params.user)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/sales${s ? `?${s}` : ''}`)
  },
  createSale: (data: any) => api('/pharmacy/sales', { method: 'POST', body: JSON.stringify(data) }),
  salesSummary: (params?: { payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.payment) qs.set('payment', params.payment)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/pharmacy/sales/summary${s ? `?${s}` : ''}`)
  },

  // Hold Sales (server-side held bills)
  listHoldSales: () => api('/pharmacy/hold-sales'),
  getHoldSale: (id: string) => api(`/pharmacy/hold-sales/${encodeURIComponent(id)}`),
  createHoldSale: (data: { billDiscountPct?: number; lines: Array<{ medicineId: string; name: string; unitPrice: number; qty: number; discountRs?: number }> }) =>
    api('/pharmacy/hold-sales', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoldSale: (id: string) => api(`/pharmacy/hold-sales/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Purchases
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/purchases${s ? `?${s}` : ''}`)
  },
  createPurchase: (data: any) => api('/pharmacy/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/pharmacy/purchases/${id}`, { method: 'DELETE' }),
  purchasesSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/pharmacy/purchases/summary${s ? `?${s}` : ''}`)
  },

  // Returns
  listReturns: (params?: { type?: 'Customer' | 'Supplier'; from?: string; to?: string; search?: string; party?: string; reference?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.party) qs.set('party', params.party)
    if (params?.reference) qs.set('reference', params.reference)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/returns${s ? `?${s}` : ''}`)
  },
  createReturn: (data: any) => api('/pharmacy/returns', { method: 'POST', body: JSON.stringify(data) }),

  // Audit Logs
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.action) qs.set('action', params.action)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/audit-logs${s ? `?${s}` : ''}`)
  },
  createAuditLog: (data: any) => api('/pharmacy/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number; severity?: 'info' | 'warning' | 'critical' | 'success'; read?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.read != null) qs.set('read', String(params.read))
    const s = qs.toString()
    return api(`/pharmacy/notifications${s ? `?${s}` : ''}`)
  },
  markNotificationRead: (id: string) => api(`/pharmacy/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => api('/pharmacy/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => api(`/pharmacy/notifications/${id}`, { method: 'DELETE' }),
  generateNotifications: () => api('/pharmacy/notifications/generate', { method: 'POST' }),

  // Users
  listUsers: () => api('/pharmacy/users'),
  createUser: (data: any) => api('/pharmacy/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/pharmacy/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/pharmacy/users/${id}`, { method: 'DELETE' }),
  loginUser: (username: string, password: string) => api('/pharmacy/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutUser: (username?: string) => api('/pharmacy/users/logout', { method: 'POST', body: JSON.stringify({ username }) }),

  // Sidebar Roles & Permissions
  listSidebarRoles: () => api('/pharmacy/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/pharmacy/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/pharmacy/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/pharmacy/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/pharmacy/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/pharmacy/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/pharmacy/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // Purchase Drafts (Pending Review)
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/purchase-drafts${s ? `?${s}` : ''}`)
  },
  listPurchaseDraftLines: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/purchase-drafts/lines${s ? `?${s}` : ''}`)
  },
  createPurchaseDraft: (data: any) => api('/pharmacy/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  getPurchaseDraft: (id: string) => api(`/pharmacy/purchase-drafts/${id}`),
  updatePurchaseDraft: (id: string, data: any) => api(`/pharmacy/purchase-drafts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/pharmacy/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/pharmacy/purchase-drafts/${id}`, { method: 'DELETE' }),

  // Inventory operations
  manualReceipt: (data: any) => api('/pharmacy/inventory/manual-receipt', { method: 'POST', body: JSON.stringify(data) }),
  adjustInventory: (data: any) => api('/pharmacy/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
  listInventory: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/inventory${s ? `?${s}` : ''}`)
  },
  listInventoryFiltered: (params: { status: 'low' | 'out' | 'expiring'; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/inventory/filter${s ? `?${s}` : ''}`)
  },
  inventorySummary: (params?: { search?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/pharmacy/inventory/summary${s ? `?${s}` : ''}`)
  },
  deleteInventoryItem: (key: string) => api(`/pharmacy/inventory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(`/pharmacy/inventory/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) }),
  listInventoryCached: (params?: { search?: string; page?: number; limit?: number }, opts?: { ttlMs?: number; forceRefresh?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return cachedApi(`/pharmacy/inventory${s ? `?${s}` : ''}`, undefined, { ttlMs: opts?.ttlMs, forceRefresh: opts?.forceRefresh })
  },
  listInventoryFilteredCached: (params: { status: 'low' | 'out' | 'expiring'; search?: string; page?: number; limit?: number }, opts?: { ttlMs?: number; forceRefresh?: boolean }) => {
    const qs = new URLSearchParams()
    qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return cachedApi(`/pharmacy/inventory/filter${s ? `?${s}` : ''}`, undefined, { ttlMs: opts?.ttlMs, forceRefresh: opts?.forceRefresh })
  },
  inventorySummaryCached: (params?: { search?: string; limit?: number }, opts?: { ttlMs?: number; forceRefresh?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return cachedApi(`/pharmacy/inventory/summary${s ? `?${s}` : ''}`, undefined, { ttlMs: opts?.ttlMs, forceRefresh: opts?.forceRefresh })
  },
  purchasesSummaryCached: (params?: { from?: string; to?: string }, opts?: { ttlMs?: number; forceRefresh?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return cachedApi(`/pharmacy/purchases/summary${s ? `?${s}` : ''}`, undefined, { ttlMs: opts?.ttlMs, forceRefresh: opts?.forceRefresh })
  },
  salesSummaryCached: (params?: { payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; from?: string; to?: string }, opts?: { ttlMs?: number; forceRefresh?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.payment) qs.set('payment', params.payment)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return cachedApi(`/pharmacy/sales/summary${s ? `?${s}` : ''}`, undefined, { ttlMs: opts?.ttlMs, forceRefresh: opts?.forceRefresh })
  },
  listSalesCached: (params?: { bill?: string; customer?: string; customerId?: string; payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; medicine?: string; from?: string; to?: string; page?: number; limit?: number }, opts?: { ttlMs?: number; forceRefresh?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.bill) qs.set('bill', params.bill)
    if (params?.customer) qs.set('customer', params.customer)
    if (params?.customerId) qs.set('customerId', params.customerId)
    if (params?.payment) qs.set('payment', params.payment)
    if (params?.medicine) qs.set('medicine', params.medicine)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return cachedApi(`/pharmacy/sales${s ? `?${s}` : ''}`, undefined, { ttlMs: opts?.ttlMs, forceRefresh: opts?.forceRefresh })
  },
}

export const aestheticApi = {
  // Settings
  getSettings: () => api('/aesthetic/settings'),
  updateSettings: (data: any) => api('/aesthetic/settings', { method: 'PUT', body: JSON.stringify(data) }),
  login: (username: string, password: string) => api('/aesthetic/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => api('/aesthetic/logout', { method: 'POST' }),

  // Staff
  listStaff: (params?: { shiftId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/staff${s ? `?${s}` : ''}`)
  },
  createStaff: (data: any) => api('/aesthetic/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/aesthetic/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/aesthetic/staff/${id}`, { method: 'DELETE' }),

  // Shifts
  listShifts: () => api('/aesthetic/shifts'),
  createShift: (data: any) => api('/aesthetic/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/aesthetic/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/aesthetic/shifts/${id}`, { method: 'DELETE' }),

  // Attendance
  listAttendance: (params?: { date?: string; from?: string; to?: string; shiftId?: string; staffId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/attendance${s ? `?${s}` : ''}`)
  },
  upsertAttendance: (data: any) => api('/aesthetic/attendance', { method: 'POST', body: JSON.stringify(data) }),

  // Staff Earnings
  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/staff-earnings${s ? `?${s}` : ''}`)
  },
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/aesthetic/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/aesthetic/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/aesthetic/staff-earnings/${id}`, { method: 'DELETE' }),

  // Suppliers
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') {
      return api(`/aesthetic/suppliers?q=${encodeURIComponent(params)}`)
    }
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/suppliers${s ? `?${s}` : ''}`)
  },
  createSupplier: (data: any) => api('/aesthetic/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/aesthetic/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/aesthetic/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) => api(`/aesthetic/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/aesthetic/suppliers/${id}/purchases`),

  // Expenses
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; page?: number; limit?: number; }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.minAmount != null) qs.set('minAmount', String(params.minAmount))
    if (params?.search) qs.set('search', params.search)
    if (params?.type) qs.set('type', params.type)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/expenses${s ? `?${s}` : ''}`)
  },
  createExpense: (data: any) => api('/aesthetic/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/aesthetic/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/aesthetic/expenses/summary${s ? `?${s}` : ''}`)
  },

  // Purchases
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/purchases${s ? `?${s}` : ''}`)
  },
  createPurchase: (data: any) => api('/aesthetic/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/aesthetic/purchases/${id}`, { method: 'DELETE' }),
  purchasesSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/aesthetic/purchases/summary${s ? `?${s}` : ''}`)
  },

  // Returns (Supplier)
  listReturns: (params?: { type?: 'Customer' | 'Supplier'; from?: string; to?: string; search?: string; party?: string; reference?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.party) qs.set('party', params.party)
    if (params?.reference) qs.set('reference', params.reference)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/returns${s ? `?${s}` : ''}`)
  },
  createReturn: (data: any) => api('/aesthetic/returns', { method: 'POST', body: JSON.stringify(data) }),

  // Audit Logs
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.action) qs.set('action', params.action)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/audit-logs${s ? `?${s}` : ''}`)
  },
  createAuditLog: (data: any) => api('/aesthetic/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  listUsers: () => api('/aesthetic/users'),
  createUser: (data: any) => api('/aesthetic/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/aesthetic/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/aesthetic/users/${id}`, { method: 'DELETE' }),

  // Doctors
  // Doctor Schedules
  listDoctorSchedules: (params?: { doctorId?: string; date?: string }) => {
    const qs = new URLSearchParams()
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.date) qs.set('date', params.date)
    const s = qs.toString()
    return api(`/aesthetic/doctor-schedules${s ? `?${s}` : ''}`)
  },
  applyDoctorWeeklyPattern: (data: { doctorId: string; anchorDate?: string; weeks?: number; days: Array<{ day: number; enabled: boolean; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }> }) =>
    api('/aesthetic/doctor-schedules/weekly-pattern', { method: 'POST', body: JSON.stringify(data) }),
  createDoctorSchedule: (data: { doctorId: string; dateIso: string; startTime: string; endTime: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }) =>
    api('/aesthetic/doctor-schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctorSchedule: (id: string, data: { dateIso?: string; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }) =>
    api(`/aesthetic/doctor-schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctorSchedule: (id: string) => api(`/aesthetic/doctor-schedules/${id}`, { method: 'DELETE' }),

  // Appointments
  listAppointments: (params?: { date?: string; doctorId?: string; scheduleId?: string; status?: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show' }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.scheduleId) qs.set('scheduleId', params.scheduleId)
    if (params?.status) qs.set('status', params.status)
    const s = qs.toString()
    return api(`/aesthetic/appointments${s ? `?${s}` : ''}`)
  },
  createAppointment: (data: { doctorId: string; scheduleId: string; apptStart?: string; slotNo?: number; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api('/aesthetic/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: { doctorId?: string; scheduleId?: string; apptStart?: string; slotNo?: number; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api(`/aesthetic/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: string, status: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show') =>
    api(`/aesthetic/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAppointment: (id: string) => api(`/aesthetic/appointments/${id}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string) => api(`/aesthetic/appointments/${id}/convert-to-token`, { method: 'POST' }),

  // Sidebar Roles & Permissions (Aesthetic)
  listSidebarRoles: () => api('/aesthetic/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/aesthetic/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/aesthetic/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/aesthetic/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/aesthetic/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/aesthetic/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/aesthetic/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // Purchase Drafts (Pending Review)
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/purchase-drafts${s ? `?${s}` : ''}`)
  },
  createPurchaseDraft: (data: any) => api('/aesthetic/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/aesthetic/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/aesthetic/purchase-drafts/${id}`, { method: 'DELETE' }),

  // Inventory
  listInventory: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/inventory${s ? `?${s}` : ''}`)
  },
  inventorySummary: (params?: { search?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/inventory/summary${s ? `?${s}` : ''}`)
  },
  deleteInventoryItem: (key: string) => api(`/aesthetic/inventory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(`/aesthetic/inventory/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Convenience helpers for UI suggestions
  searchMedicines: async (q?: string, limit?: number) => {
    const qs = new URLSearchParams()
    if (q) qs.set('search', q)
    qs.set('limit', String(limit || 20))
    const res: any = await api(`/aesthetic/inventory${qs.toString() ? `?${qs}` : ''}`)
    const items: any[] = res?.items ?? res ?? []
    return { suggestions: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },
  getAllMedicines: async () => {
    const qs = new URLSearchParams(); qs.set('limit', '2000')
    const res: any = await api(`/aesthetic/inventory?${qs}`)
    const items: any[] = res?.items ?? res ?? []
    return { medicines: items.map((it: any) => ({ id: String(it._id || it.key || it.name || ''), name: String(it.name || '') })) }
  },

  // Notifications
  getNotifications: (params?: { page?: number; limit?: number; severity?: 'info' | 'warning' | 'critical' | 'success'; read?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.read != null) qs.set('read', String(params.read))
    const s = qs.toString()
    return api(`/aesthetic/notifications${s ? `?${s}` : ''}`)
  },
  markNotificationRead: (id: string) => api(`/aesthetic/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => api('/aesthetic/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: string) => api(`/aesthetic/notifications/${id}`, { method: 'DELETE' }),
  generateNotifications: () => api('/aesthetic/notifications/generate', { method: 'POST' }),

  // Sales (Aesthetic has no POS; backend returns zeros)
  listSales: (params?: { from?: string; to?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/sales${s ? `?${s}` : ''}`)
  },
  salesSummary: (params?: { payment?: 'Any' | 'Cash' | 'Card' | 'Credit'; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.payment) qs.set('payment', params.payment)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/aesthetic/sales/summary${s ? `?${s}` : ''}`)
  },

  // Consent Templates
  listConsentTemplates: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/consent-templates${s ? `?${s}` : ''}`)
  },
  createConsentTemplate: (data: { name: string; body: string; version?: number; active?: boolean; fields?: any[] }) =>
    api('/aesthetic/consent-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateConsentTemplate: (id: string, patch: Partial<{ name: string; body: string; version: number; active: boolean; fields: any[] }>) =>
    api(`/aesthetic/consent-templates/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteConsentTemplate: (id: string) => api(`/aesthetic/consent-templates/${id}`, { method: 'DELETE' }),

  // Consents
  listConsents: (params?: { templateId?: string; patientMrn?: string; labPatientId?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.templateId) qs.set('templateId', params.templateId)
    if (params?.patientMrn) qs.set('patientMrn', params.patientMrn)
    if (params?.labPatientId) qs.set('labPatientId', params.labPatientId)
    if (params?.search) qs.set('search', params.search)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/consents${s ? `?${s}` : ''}`)
  },
  createConsent: (data: { templateId: string; templateName?: string; templateVersion?: number; patientMrn?: string; labPatientId?: string; patientName?: string; answers?: any; signatureDataUrl?: string; attachments?: string[]; signedAt: string; actor?: string }) =>
    api('/aesthetic/consents', { method: 'POST', body: JSON.stringify(data) }),

  // Procedure Catalog
  listProcedureCatalog: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/procedure-catalog${s ? `?${s}` : ''}`)
  },
  createProcedureCatalog: (data: { name: string; basePrice?: number; defaultDoctorId?: string; defaultConsentTemplateId?: string; package?: { sessionsCount?: number; intervalDays?: number }; active?: boolean }) =>
    api('/aesthetic/procedure-catalog', { method: 'POST', body: JSON.stringify(data) }),
  updateProcedureCatalog: (id: string, patch: Partial<{ name: string; basePrice: number; defaultDoctorId: string; defaultConsentTemplateId: string; package: { sessionsCount?: number; intervalDays?: number }; active: boolean }>) =>
    api(`/aesthetic/procedure-catalog/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteProcedureCatalog: (id: string) => api(`/aesthetic/procedure-catalog/${id}`, { method: 'DELETE' }),

  // Procedure Sessions
  listProcedureSessions: (params?: { search?: string; labPatientId?: string; patientMrn?: string; phone?: string; procedureId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.labPatientId) qs.set('labPatientId', params.labPatientId)
    if (params?.patientMrn) qs.set('patientMrn', params.patientMrn)
    if (params?.phone) qs.set('phone', params.phone)
    if (params?.procedureId) qs.set('procedureId', params.procedureId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/procedure-sessions${s ? `?${s}` : ''}`)
  },
  createProcedureSession: (data: { labPatientId?: string; patientMrn?: string; patientName?: string; phone?: string; procedureId: string; procedureName?: string; date: string; sessionNo?: number; doctorId?: string; price?: number; discount?: number; paid?: number; status?: 'planned' | 'done' | 'cancelled'; nextVisitDate?: string; notes?: string; beforeImages?: string[]; afterImages?: string[]; consentIds?: string[] }) =>
    api('/aesthetic/procedure-sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateProcedureSession: (id: string, patch: Partial<{ labPatientId: string; patientMrn: string; patientName: string; phone: string; procedureId: string; procedureName: string; date: string; sessionNo: number; doctorId: string; price: number; discount: number; paid: number; status: 'planned' | 'done' | 'cancelled'; nextVisitDate: string; notes: string; beforeImages: string[]; afterImages: string[]; consentIds: string[] }>) =>
    api(`/aesthetic/procedure-sessions/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteProcedureSession: (id: string) => api(`/aesthetic/procedure-sessions/${id}`, { method: 'DELETE' }),

  completeProcedure: (data: { patientMrn: string; procedureId: string }) =>
    api('/aesthetic/procedure-sessions/complete-procedure', { method: 'POST', body: JSON.stringify(data) }),

  // Procedure Session Payments & Next Visit
  addProcedureSessionPayment: (id: string, data: { amount: number; method?: string; dateIso?: string; note?: string }) =>
    api(`/aesthetic/procedure-sessions/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  getProcedureSessionPayments: (id: string) => api(`/aesthetic/procedure-sessions/${id}/payments`),
  setProcedureSessionNextVisit: (id: string, nextVisitDate: string) =>
    api(`/aesthetic/procedure-sessions/${id}/next-visit`, { method: 'PUT', body: JSON.stringify({ nextVisitDate }) }),

  // Tokens (OPD)
  listTokens: (params?: { from?: string; to?: string; doctorId?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/tokens${s ? `?${s}` : ''}`)
  },
  createToken: (data: { date?: string; patientName?: string; phone?: string; mrNumber?: string; age?: string; gender?: string; address?: string; guardianRelation?: string; guardianName?: string; cnic?: string; doctorId?: string; apptDate?: string; scheduleId?: string; apptStart?: string; fee?: number; discount?: number; payable?: number; status?: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled'; procedureSessionId?: string; depositToday?: number; method?: string; note?: string }) =>
    api('/aesthetic/tokens', { method: 'POST', body: JSON.stringify(data) }),
  updateToken: (id: string, patch: any) =>
    api(`/aesthetic/tokens/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  updateTokenStatus: (id: string, status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled') =>
    api(`/aesthetic/tokens/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteToken: (id: string) => api(`/aesthetic/tokens/${id}`, { method: 'DELETE' }),
  nextTokenNumber: (date?: string) => {
    const qs = new URLSearchParams(); if (date) qs.set('date', date)
    const s = qs.toString()
    return api(`/aesthetic/tokens/next-number${s ? `?${s}` : ''}`)
  },

  // Doctors (Aesthetic)
  listDoctors: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/aesthetic/doctors${s ? `?${s}` : ''}`)
  },
  createDoctor: (data: { name: string; specialty?: string; qualification?: string; phone?: string; fee?: number; shares?: number; active?: boolean }) =>
    api('/aesthetic/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id: string, patch: Partial<{ name: string; specialty: string; qualification: string; phone: string; fee: number; shares: number; active: boolean }>) =>
    api(`/aesthetic/doctors/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteDoctor: (id: string) => api(`/aesthetic/doctors/${id}`, { method: 'DELETE' }),
}

export const labApi = {
  // Auth (if backend supports lab-specific auth)
  login: (username: string, password: string) => api('/lab/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  // Newer backends: Lab user collection auth lives under /lab/users/login
  loginUser: (username: string, password: string) => api('/lab/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutUser: () => api('/lab/users/logout', { method: 'POST' }),
  logout: () => api('/lab/logout', { method: 'POST' }),
  // Purchase Drafts (Pending Review)
  listPurchaseDrafts: (params?: { from?: string; to?: string; search?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/purchase-drafts${s ? `?${s}` : ''}`)
  },
  createPurchaseDraft: (data: any) => api('/lab/purchase-drafts', { method: 'POST', body: JSON.stringify(data) }),
  approvePurchaseDraft: (id: string) => api(`/lab/purchase-drafts/${id}/approve`, { method: 'POST' }),
  deletePurchaseDraft: (id: string) => api(`/lab/purchase-drafts/${id}`, { method: 'DELETE' }),

  // Inventory
  listInventory: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/inventory${s ? `?${s}` : ''}`)
  },
  inventorySummary: (params?: { search?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/inventory/summary${s ? `?${s}` : ''}`)
  },
  deleteInventoryItem: (key: string) => api(`/lab/inventory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
  updateInventoryItem: (key: string, data: any) => api(`/lab/inventory/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(data) }),
  // Purchases
  listPurchases: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/purchases${s ? `?${s}` : ''}`)
  },
  createPurchase: (data: any) => api('/lab/purchases', { method: 'POST', body: JSON.stringify(data) }),
  deletePurchase: (id: string) => api(`/lab/purchases/${id}`, { method: 'DELETE' }),

  // Returns
  listReturns: (params?: { type?: 'Customer' | 'Supplier'; from?: string; to?: string; search?: string; party?: string; reference?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.party) qs.set('party', params.party)
    if (params?.reference) qs.set('reference', params.reference)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/returns${s ? `?${s}` : ''}`)
  },
  createReturn: (data: any) => api('/lab/returns', { method: 'POST', body: JSON.stringify(data) }),
  undoReturn: (data: { reference: string; testId?: string; testName?: string; note?: string }) => api('/lab/returns/undo', { method: 'POST', body: JSON.stringify(data) }),

  // Suppliers
  listSuppliers: (params?: string | { q?: string; page?: number; limit?: number }) => {
    if (typeof params === 'string') {
      return api(`/lab/suppliers?q=${encodeURIComponent(params)}`)
    }
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/suppliers${s ? `?${s}` : ''}`)
  },
  createSupplier: (data: any) => api('/lab/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => api(`/lab/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => api(`/lab/suppliers/${id}`, { method: 'DELETE' }),
  recordSupplierPayment: (id: string, data: { amount: number; purchaseId?: string; method?: string; note?: string; date?: string }) => api(`/lab/suppliers/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
  listSupplierPurchases: (id: string) => api(`/lab/suppliers/${id}/purchases`),

  // Shifts
  listShifts: () => api('/lab/shifts'),
  createShift: (data: any) => api('/lab/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/lab/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/lab/shifts/${id}`, { method: 'DELETE' }),

  // Staff
  listStaff: (params?: { q?: string; shiftId?: string; page?: number; limit?: number } | string) => {
    if (typeof params === 'string') {
      return api(`/lab/staff?q=${encodeURIComponent(params)}`)
    }
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/staff${s ? `?${s}` : ''}`)
  },
  createStaff: (data: any) => api('/lab/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/lab/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/lab/staff/${id}`, { method: 'DELETE' }),

  // Attendance
  listAttendance: (params?: { date?: string; shiftId?: string; staffId?: string; from?: string; to?: string; page?: number; limit?: number; }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/attendance${s ? `?${s}` : ''}`)
  },
  upsertAttendance: (data: any) => api('/lab/attendance', { method: 'POST', body: JSON.stringify(data) }),

  // Staff Earnings
  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/staff-earnings${s ? `?${s}` : ''}`)
  },
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/lab/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/lab/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/lab/staff-earnings/${id}`, { method: 'DELETE' }),

  // Expenses
  listExpenses: (params?: { from?: string; to?: string; minAmount?: number; search?: string; type?: string; page?: number; limit?: number; }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.minAmount != null) qs.set('minAmount', String(params.minAmount))
    if (params?.search) qs.set('search', params.search)
    if (params?.type) qs.set('type', params.type)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/expenses${s ? `?${s}` : ''}`)
  },
  createExpense: (data: any) => api('/lab/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/lab/expenses/${id}`, { method: 'DELETE' }),
  expensesSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/lab/expenses/summary${s ? `?${s}` : ''}`)
  },

  // Cash Movements (Pay In/Out)
  listCashMovements: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT'; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.type) qs.set('type', params.type)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/cash-movements${s ? `?${s}` : ''}`)
  },
  createCashMovement: (data: { date: string; type: 'IN' | 'OUT'; category?: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-movements', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashMovement: (id: string) => api(`/lab/cash-movements/${id}`, { method: 'DELETE' }),
  cashMovementSummary: (params?: { from?: string; to?: string; type?: 'IN' | 'OUT' }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.type) qs.set('type', params.type)
    const s = qs.toString()
    return api(`/lab/cash-movements/summary${s ? `?${s}` : ''}`)
  },

  // Manager Cash Count
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/cash-counts${s ? `?${s}` : ''}`)
  },
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/lab/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/lab/cash-counts/${id}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    const s = qs.toString()
    return api(`/lab/cash-counts/summary${s ? `?${s}` : ''}`)
  },

  // Users
  listUsers: () => api('/lab/users'),
  createUser: (data: any) => api('/lab/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => api(`/lab/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => api(`/lab/users/${id}`, { method: 'DELETE' }),

  // Sidebar Roles & Permissions
  listSidebarRoles: () => api('/lab/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/lab/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/lab/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/lab/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/lab/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/lab/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/lab/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // Audit Logs
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.action) qs.set('action', params.action)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/audit-logs${s ? `?${s}` : ''}`)
  },
  createAuditLog: (data: any) => api('/lab/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getSettings: () => api('/lab/settings'),
  updateSettings: (data: any) => api('/lab/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Patients
  findOrCreatePatient: (data: { fullName: string; guardianName?: string; phone?: string; cnic?: string; gender?: string; address?: string; age?: string; guardianRel?: string; selectId?: string; forceCreate?: boolean }) =>
    api('/lab/patients/find-or-create', { method: 'POST', body: JSON.stringify(data) }),
  getPatientByMrn: (mrn: string) => api(`/lab/patients/by-mrn?mrn=${encodeURIComponent(mrn)}`),
  searchPatients: (params?: { phone?: string; name?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.phone) qs.set('phone', params.phone)
    if (params?.name) qs.set('name', params.name)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/patients/search${s ? `?${s}` : ''}`)
  },
  updatePatient: (id: string, data: { fullName?: string; fatherName?: string; phone?: string; cnic?: string; gender?: string; address?: string }) =>
    api(`/lab/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Tests (Catalog)
  listTests: (params?: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/tests${s ? `?${s}` : ''}`)
  },
  createTest: (data: any) => api('/lab/tests', { method: 'POST', body: JSON.stringify(data) }),
  updateTest: (id: string, data: any) => api(`/lab/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTest: (id: string) => api(`/lab/tests/${id}`, { method: 'DELETE' }),

  // Orders (Sample Intake)
  listOrders: (params?: { q?: string; status?: 'received' | 'completed'; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.status) qs.set('status', params.status)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/orders${s ? `?${s}` : ''}`)
  },
  createOrder: (data: any) => api('/lab/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderTrack: (id: string, data: { sampleTime?: string; reportingTime?: string; status?: 'received' | 'completed'; referringConsultant?: string }) =>
    api(`/lab/orders/${id}/track`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id: string) => api(`/lab/orders/${id}`, { method: 'DELETE' }),

  // Appointments (Lab)
  listAppointments: (params?: { date?: string; from?: string; to?: string; status?: 'booked' | 'confirmed' | 'cancelled' | 'converted'; q?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.status) qs.set('status', params.status)
    if (params?.q) qs.set('q', params.q)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/appointments${s ? `?${s}` : ''}`)
  },
  createAppointment: (data: { dateIso: string; time?: string; tests: string[]; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api('/lab/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: { dateIso?: string; time?: string; tests?: string[]; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api(`/lab/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: string, status: 'booked' | 'confirmed' | 'cancelled') =>
    api(`/lab/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAppointment: (id: string) => api(`/lab/appointments/${id}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string) => api(`/lab/appointments/${id}/convert-to-token`, { method: 'POST' }),

  // Results
  listResults: (params?: { orderId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.orderId) qs.set('orderId', params.orderId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/results${s ? `?${s}` : ''}`)
  },
  getResult: (id: string) => api(`/lab/results/${id}`),
  createResult: (data: any) => api('/lab/results', { method: 'POST', body: JSON.stringify(data) }),
  updateResult: (id: string, data: { rows?: any[]; interpretation?: string; reportStatus?: 'pending' | 'approved'; approvedAt?: string | Date; approvedBy?: string } | any) =>
    api(`/lab/results/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  // Dashboard
  dashboardSummary: () => api('/lab/dashboard/summary'),
  // Reports
  reportsSummary: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/lab/reports/summary${s ? `?${s}` : ''}`)
  },

  // Blood Bank — Donors
  listBBDonors: (params?: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/bb/donors${s ? `?${s}` : ''}`)
  },
  createBBDonor: (data: any) => api('/lab/bb/donors', { method: 'POST', body: JSON.stringify(data) }),
  updateBBDonor: (id: string, data: any) => api(`/lab/bb/donors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBBDonor: (id: string) => api(`/lab/bb/donors/${id}`, { method: 'DELETE' }),

  // Blood Bank — Receivers
  listBBReceivers: (params?: { q?: string; status?: 'URGENT' | 'PENDING' | 'DISPENSED' | 'APPROVED'; type?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.status) qs.set('status', params.status)
    if (params?.type) qs.set('type', params.type)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/bb/receivers${s ? `?${s}` : ''}`)
  },
  createBBReceiver: (data: any) => api('/lab/bb/receivers', { method: 'POST', body: JSON.stringify(data) }),
  updateBBReceiver: (id: string, data: any) => api(`/lab/bb/receivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBBReceiver: (id: string) => api(`/lab/bb/receivers/${id}`, { method: 'DELETE' }),

  // Blood Bank — Inventory (Bags)
  listBBInventory: (params?: { q?: string; status?: 'Available' | 'Quarantined' | 'Used' | 'Expired'; type?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.status) qs.set('status', params.status)
    if (params?.type) qs.set('type', params.type)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/lab/bb/inventory${s ? `?${s}` : ''}`)
  },
  bbInventorySummary: () => api('/lab/bb/inventory/summary'),
  createBBBag: (data: any) => api('/lab/bb/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateBBBag: (id: string, data: any) => api(`/lab/bb/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBBBag: (id: string) => api(`/lab/bb/inventory/${id}`, { method: 'DELETE' }),
}

export const hospitalApi = {
  // Settings
  getSettings: () => api('/hospital/settings'),
  updateSettings: (data: any) => api('/hospital/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // FBR
  getFbrSettings: () => api('/hospital/fbr/settings'),
  updateFbrSettings: (data: any) => api('/hospital/fbr/settings', { method: 'PUT', body: JSON.stringify(data) }),
  listFbrLogs: (params?: { q?: string; from?: string; to?: string; module?: string; status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', String(params.q))
    if (params?.from) qs.set('from', String(params.from))
    if (params?.to) qs.set('to', String(params.to))
    if (params?.module) qs.set('module', String(params.module))
    if (params?.status) qs.set('status', String(params.status))
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/fbr/logs${s ? `?${s}` : ''}`)
  },
  retryFbrLog: (id: string) => api(`/hospital/fbr/logs/${encodeURIComponent(String(id))}/retry`, { method: 'POST' }),
  summaryFbr: (params?: { invoiceType?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.invoiceType) qs.set('invoiceType', String(params.invoiceType))
    if (params?.from) qs.set('from', String(params.from))
    if (params?.to) qs.set('to', String(params.to))
    const s = qs.toString()
    return api(`/hospital/fbr/summary${s ? `?${s}` : ''}`)
  },

  // Store Management
  storeListCategories: (params?: { q?: string; active?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.active != null) qs.set('active', String(params.active))
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/categories${s ? `?${s}` : ''}`)
  },
  storeCreateCategory: (data: { name: string; description?: string; active?: boolean }) =>
    api('/hospital/store/categories', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateCategory: (id: string, data: any) => api(`/hospital/store/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteCategory: (id: string) => api(`/hospital/store/categories/${id}`, { method: 'DELETE' }),

  storeListUnits: (params?: { q?: string; active?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.active != null) qs.set('active', String(params.active))
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/units${s ? `?${s}` : ''}`)
  },
  storeCreateUnit: (data: { name: string; abbr?: string; active?: boolean }) =>
    api('/hospital/store/units', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateUnit: (id: string, data: any) => api(`/hospital/store/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteUnit: (id: string) => api(`/hospital/store/units/${id}`, { method: 'DELETE' }),

  storeListLocations: (params?: { q?: string; active?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.active != null) qs.set('active', String(params.active))
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/locations${s ? `?${s}` : ''}`)
  },
  storeCreateLocation: (data: { name: string; description?: string; active?: boolean }) =>
    api('/hospital/store/locations', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateLocation: (id: string, data: any) => api(`/hospital/store/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteLocation: (id: string) => api(`/hospital/store/locations/${id}`, { method: 'DELETE' }),

  storeListItems: (params?: { q?: string; categoryId?: string; active?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.categoryId) qs.set('categoryId', params.categoryId)
    if (params?.active != null) qs.set('active', String(params.active))
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/items${s ? `?${s}` : ''}`)
  },
  storeCreateItem: (data: any) => api('/hospital/store/items', { method: 'POST', body: JSON.stringify(data) }),
  storeUpdateItem: (id: string, data: any) => api(`/hospital/store/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  storeDeleteItem: (id: string) => api(`/hospital/store/items/${id}`, { method: 'DELETE' }),

  storeLots: (params?: { itemId?: string; locationId?: string; expFrom?: string; expTo?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.itemId) qs.set('itemId', params.itemId)
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.expFrom) qs.set('expFrom', params.expFrom)
    if (params?.expTo) qs.set('expTo', params.expTo)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/lots${s ? `?${s}` : ''}`)
  },
  storeStock: (params?: { locationId?: string; itemId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.itemId) qs.set('itemId', params.itemId)
    const s = qs.toString()
    return api(`/hospital/store/stock${s ? `?${s}` : ''}`)
  },

  storeTxns: (params?: { type?: 'RECEIVE' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT'; itemId?: string; locationId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.itemId) qs.set('itemId', params.itemId)
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/txns${s ? `?${s}` : ''}`)
  },
  storeReceive: (data: any) => api('/hospital/store/receive', { method: 'POST', body: JSON.stringify(data) }),
  storeIssue: (data: any) => api('/hospital/store/issue', { method: 'POST', body: JSON.stringify(data) }),
  storeTransfer: (data: any) => api('/hospital/store/transfer', { method: 'POST', body: JSON.stringify(data) }),
  storeAdjust: (data: any) => api('/hospital/store/adjust', { method: 'POST', body: JSON.stringify(data) }),

  storeWorth: (params?: { locationId?: string; asOf?: string }) => {
    const qs = new URLSearchParams()
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.asOf) qs.set('asOf', params.asOf)
    const s = qs.toString()
    return api(`/hospital/store/reports/worth${s ? `?${s}` : ''}`)
  },
  storeLowStock: (params?: { q?: string; onlyLow?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.onlyLow != null) qs.set('onlyLow', String(params.onlyLow))
    const s = qs.toString()
    return api(`/hospital/store/reports/low-stock${s ? `?${s}` : ''}`)
  },
  storeExpiring: (params: { to: string; from?: string; locationId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.from) qs.set('from', params.from)
    qs.set('to', params.to)
    return api(`/hospital/store/reports/expiring?${qs.toString()}`)
  },
  storeLedger: (params?: { itemId?: string; locationId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.itemId) qs.set('itemId', params.itemId)
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/store/reports/ledger${s ? `?${s}` : ''}`)
  },
  // Patients lookup
  searchPatientsByPhone: (phone: string) => api(`/hospital/patients/search?phone=${encodeURIComponent(phone || '')}`),
  searchPatients: (params?: { mrn?: string; name?: string; fatherName?: string; phone?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.mrn) qs.set('mrn', params.mrn)
    if (params?.name) qs.set('name', params.name)
    if (params?.fatherName) qs.set('fatherName', params.fatherName)
    if (params?.phone) qs.set('phone', params.phone)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/patients/search${s ? `?${s}` : ''}`)
  },
  // Masters
  listDepartments: () => api('/hospital/departments'),
  createDepartment: (data: { name: string; description?: string; opdBaseFee: number; opdFollowupFee?: number; followupWindowDays?: number; doctorPrices?: Array<{ doctorId: string; price: number }> }) =>
    api('/hospital/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: string, data: { name: string; description?: string; opdBaseFee: number; opdFollowupFee?: number; followupWindowDays?: number; doctorPrices?: Array<{ doctorId: string; price: number }> }) =>
    api(`/hospital/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: string) => api(`/hospital/departments/${id}`, { method: 'DELETE' }),

  listDoctors: (params?: { q?: string; departmentId?: string; active?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.departmentId) qs.set('departmentId', params.departmentId)
    if (params?.active != null) qs.set('active', String(params.active))
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/doctors${s ? `?${s}` : ''}`)
  },
  createDoctor: (data: { name: string; departmentIds?: string[]; primaryDepartmentId?: string; opdBaseFee?: number; opdFollowupFee?: number; followupWindowDays?: number; username?: string; password?: string; phone?: string; specialization?: string; qualification?: string; cnic?: string; pmdcNo?: string; shares?: number; active?: boolean }) =>
    api('/hospital/doctors', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctor: (id: string, data: { name: string; departmentIds?: string[]; primaryDepartmentId?: string; opdBaseFee?: number; opdFollowupFee?: number; followupWindowDays?: number; username?: string; password?: string; phone?: string; specialization?: string; qualification?: string; cnic?: string; pmdcNo?: string; shares?: number; active?: boolean }) =>
    api(`/hospital/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctor: (id: string) => api(`/hospital/doctors/${id}`, { method: 'DELETE' }),

  // Doctor Schedules
  listDoctorSchedules: (params?: { doctorId?: string; departmentId?: string; date?: string }) => {
    const qs = new URLSearchParams()
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.departmentId) qs.set('departmentId', params.departmentId)
    if (params?.date) qs.set('date', params.date)
    const s = qs.toString()
    return api(`/hospital/doctor-schedules${s ? `?${s}` : ''}`)
  },
  applyDoctorWeeklyPattern: (data: { doctorId: string; departmentId?: string; anchorDate?: string; weeks?: number; days: Array<{ day: number; enabled: boolean; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }> }) =>
    api('/hospital/doctor-schedules/weekly-pattern', { method: 'POST', body: JSON.stringify(data) }),
  updateDoctorSchedule: (id: string, data: { departmentId?: string; dateIso?: string; startTime?: string; endTime?: string; slotMinutes?: number; fee?: number; followupFee?: number; notes?: string }) =>
    api(`/hospital/doctor-schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDoctorSchedule: (id: string) => api(`/hospital/doctor-schedules/${id}`, { method: 'DELETE' }),

  // Users (Hospital App Users)
  listHospitalUsers: () => api('/hospital/users'),
  createHospitalUser: (data: { username: string; role: string; fullName?: string; phone?: string; email?: string; password?: string; active?: boolean }) =>
    api('/hospital/users', { method: 'POST', body: JSON.stringify(data) }),
  updateHospitalUser: (id: string, data: { username?: string; role?: string; fullName?: string; phone?: string; email?: string; password?: string; active?: boolean }) =>
    api(`/hospital/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHospitalUser: (id: string) => api(`/hospital/users/${id}`, { method: 'DELETE' }),
  loginHospitalUser: (username: string, password?: string) =>
    api('/hospital/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logoutHospitalUser: (username?: string) =>
    api('/hospital/users/logout', { method: 'POST', body: JSON.stringify({ username }) }),

  // Sidebar Roles & Permissions (Hospital)
  listSidebarRoles: () => api('/hospital/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/hospital/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/hospital/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/hospital/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/hospital/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/hospital/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/hospital/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // OPD
  quoteOPDPrice: (params: { departmentId: string; doctorId?: string; visitType?: 'new' | 'followup'; corporateId?: string }) => {
    const qs = new URLSearchParams()
    qs.set('departmentId', params.departmentId)
    if (params.doctorId) qs.set('doctorId', params.doctorId)
    if (params.visitType) qs.set('visitType', params.visitType)
    if (params.corporateId) qs.set('corporateId', params.corporateId)
    return api(`/hospital/opd/quote-price?${qs.toString()}`)
  },
  createOPDEncounter: (data: { patientId: string; departmentId: string; doctorId?: string; visitType: 'new' | 'followup'; paymentRef?: string }) =>
    api('/hospital/opd/encounters', { method: 'POST', body: JSON.stringify(data) }),

  // Tokens (OPD)
  createOpdToken: (data: any) =>
    api('/hospital/tokens/opd', { method: 'POST', body: JSON.stringify(data) }),
  getToken: (id: string) => api(`/hospital/tokens/${id}`),
  listTokens: (params?: { date?: string; from?: string; to?: string; status?: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled'; doctorId?: string; departmentId?: string; scheduleId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.status) qs.set('status', params.status)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.departmentId) qs.set('departmentId', params.departmentId)
    if (params?.scheduleId) qs.set('scheduleId', params.scheduleId)
    const s = qs.toString()
    return api(`/hospital/tokens${s ? `?${s}` : ''}`)
  },

  // ER Charges
  listErCharges: (encounterId: string, params?: { limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/charges${s ? `?${s}` : ''}`)
  },
  createErCharge: (encounterId: string, data: { type?: 'service'|'procedure'|'other'; description: string; qty?: number; unitPrice?: number; amount?: number; date?: string|Date; refId?: string; billedBy?: string }) =>
    api(`/hospital/er/encounters/${encodeURIComponent(encounterId)}/charges`, { method: 'POST', body: JSON.stringify(data) }),
  deleteErCharge: (id: string) => api(`/hospital/er/charges/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updateTokenStatus: (id: string, status: 'queued' | 'in-progress' | 'completed' | 'returned' | 'cancelled') =>
    api(`/hospital/tokens/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateToken: (id: string, data: { discount?: number; doctorId?: string; departmentId?: string; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; guardianRel?: string; guardianName?: string; cnic?: string; address?: string; age?: string; overrideFee?: number }) =>
    api(`/hospital/tokens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Appointments (Hospital)
  listAppointments: (params?: { date?: string; doctorId?: string; scheduleId?: string; status?: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show'; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.scheduleId) qs.set('scheduleId', params.scheduleId)
    if (params?.status) qs.set('status', params.status)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/appointments${s ? `?${s}` : ''}`)
  },
  createAppointment: (data: { doctorId: string; departmentId?: string; scheduleId: string; apptStart?: string; slotNo?: number; patientId?: string; mrn?: string; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api('/hospital/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: { doctorId?: string; scheduleId?: string; apptStart?: string; slotNo?: number; patientName?: string; phone?: string; gender?: string; age?: string; notes?: string }) =>
    api(`/hospital/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateAppointmentStatus: (id: string, status: 'booked' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show') =>
    api(`/hospital/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteAppointment: (id: string) => api(`/hospital/appointments/${id}`, { method: 'DELETE' }),
  convertAppointmentToToken: (id: string) => api(`/hospital/appointments/${id}/convert-to-token`, { method: 'POST' }),

  // Staff
  listStaff: () => api('/hospital/staff'),
  listShifts: () => api('/hospital/shifts'),
  fetchBiometricNow: () => api('/hospital/staff/biometric/fetch', { method: 'POST' }),
  biometricStatus: () => api('/hospital/staff/biometric/status'),
  listBiometricDeviceUsers: () => api('/hospital/staff/biometric/device-users'),
  connectStaffBiometric: (id: string, data: any) => api(`/hospital/staff/${id}/biometric/connect`, { method: 'POST', body: JSON.stringify(data) }),
  createShift: (data: any) => api('/hospital/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) => api(`/hospital/shifts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShift: (id: string) => api(`/hospital/shifts/${id}`, { method: 'DELETE' }),
  listAttendance: (params?: { date?: string; from?: string; to?: string; shiftId?: string; staffId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.shiftId) qs.set('shiftId', params.shiftId)
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/attendance${s ? `?${s}` : ''}`)
  },
  upsertAttendance: (data: any) => api('/hospital/attendance', { method: 'POST', body: JSON.stringify(data) }),
  createStaff: (data: any) => api('/hospital/staff', { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, data: any) => api(`/hospital/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaff: (id: string) => api(`/hospital/staff/${id}`, { method: 'DELETE' }),

  // Staff Earnings
  listStaffEarnings: (params?: { staffId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.staffId) qs.set('staffId', params.staffId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/staff-earnings${s ? `?${s}` : ''}`)
  },
  createStaffEarning: (data: { staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }) =>
    api('/hospital/staff-earnings', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffEarning: (id: string, data: Partial<{ staffId: string; date: string; category: 'Bonus' | 'Award' | 'LumpSum' | 'RevenueShare'; amount?: number; rate?: number; base?: number; notes?: string }>) =>
    api(`/hospital/staff-earnings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStaffEarning: (id: string) => api(`/hospital/staff-earnings/${id}`, { method: 'DELETE' }),

  // Expenses
  listExpenses: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/expenses${s ? `?${s}` : ''}`)
  },
  createExpense: (data: { dateIso: string; departmentId?: string; category: string; amount: number; note?: string; method?: string; ref?: string }) =>
    api('/hospital/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => api(`/hospital/expenses/${id}`, { method: 'DELETE' }),

  // Bed Management
  listFloors: () => api('/hospital/floors'),
  createFloor: (data: { name: string; number?: string }) => api('/hospital/floors', { method: 'POST', body: JSON.stringify(data) }),
  updateFloor: (id: string, data: { name?: string; number?: string }) => api(`/hospital/floors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFloor: (id: string) => api(`/hospital/floors/${id}`, { method: 'DELETE' }),
  listRooms: (floorId?: string) => api(`/hospital/rooms${floorId ? `?floorId=${encodeURIComponent(floorId)}` : ''}`),
  createRoom: (data: { name: string; floorId: string }) => api('/hospital/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoom: (id: string, data: { name?: string; floorId?: string }) => api(`/hospital/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoom: (id: string) => api(`/hospital/rooms/${id}`, { method: 'DELETE' }),
  listWards: (floorId?: string) => api(`/hospital/wards${floorId ? `?floorId=${encodeURIComponent(floorId)}` : ''}`),
  createWard: (data: { name: string; floorId: string }) => api('/hospital/wards', { method: 'POST', body: JSON.stringify(data) }),
  updateWard: (id: string, data: { name?: string; floorId?: string }) => api(`/hospital/wards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWard: (id: string) => api(`/hospital/wards/${id}`, { method: 'DELETE' }),
  listBeds: (params?: { floorId?: string; locationType?: 'room' | 'ward'; locationId?: string; status?: 'available' | 'occupied' }) => {
    const qs = new URLSearchParams()
    if (params?.floorId) qs.set('floorId', params.floorId)
    if (params?.locationType) qs.set('locationType', params.locationType)
    if (params?.locationId) qs.set('locationId', params.locationId)
    if (params?.status) qs.set('status', params.status)
    const s = qs.toString()
    return api(`/hospital/beds${s ? `?${s}` : ''}`)
  },
  addBeds: (data: { floorId: string; locationType: 'room' | 'ward'; locationId: string; labels: string[]; charges?: number; category?: string }) =>
    api('/hospital/beds', { method: 'POST', body: JSON.stringify(data) }),
  updateBedStatus: (id: string, data: { status: 'available' | 'occupied'; encounterId?: string }) =>
    api(`/hospital/beds/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateBed: (id: string, data: { label?: string; charges?: number; category?: string }) =>
    api(`/hospital/beds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBed: (id: string) => api(`/hospital/beds/${id}`, { method: 'DELETE' }),

  // IPD
  admitIPD: (data: { patientId: string; departmentId: string; doctorId?: string; wardId?: string; bedId?: string; deposit?: number }) =>
    api('/hospital/ipd/admissions', { method: 'POST', body: JSON.stringify(data) }),
  dischargeIPD: (id: string, data?: { dischargeSummary?: string; endAt?: string }) =>
    api(`/hospital/ipd/admissions/${id}/discharge`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
  listIPDAdmissions: (params?: { status?: 'admitted' | 'discharged'; doctorId?: string; departmentId?: string; patientId?: string; from?: string; to?: string; q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.departmentId) qs.set('departmentId', params.departmentId)
    if (params?.patientId) qs.set('patientId', params.patientId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions${s ? `?${s}` : ''}`)
  },
  transferIPDBed: (id: string, data: { newBedId: string }) =>
    api(`/hospital/ipd/admissions/${id}/transfer-bed`, { method: 'PATCH', body: JSON.stringify(data) }),
  admitFromOpdToken: (data: { tokenId: string; bedId?: string; deposit?: number; departmentId?: string; doctorId?: string; markTokenCompleted?: boolean }) =>
    api('/hospital/ipd/admissions/from-token', { method: 'POST', body: JSON.stringify(data) }),

  // IPD Referrals
  listIpdReferrals: (params?: { status?: 'New' | 'Accepted' | 'Rejected' | 'Admitted'; q?: string; from?: string; to?: string; departmentId?: string; doctorId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.departmentId) qs.set('departmentId', params.departmentId)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/referrals${s ? `?${s}` : ''}`)
  },
  createIpdReferral: (data: { patientId: string; referralDate?: string; referralTime?: string; reasonOfReferral?: string; provisionalDiagnosis?: string; vitals?: { bp?: string; pulse?: number; temperature?: number; rr?: number }; referredTo?: { departmentId?: string; doctorId?: string }; condition?: { stability?: 'Stable' | 'Unstable'; consciousness?: 'Conscious' | 'Unconscious' }; remarks?: string; signStamp?: string }) =>
    api('/hospital/ipd/referrals', { method: 'POST', body: JSON.stringify(data) }),
  getIpdReferralById: (id: string) => api(`/hospital/ipd/referrals/${id}`),
  updateIpdReferral: (id: string, data: any) => api(`/hospital/ipd/referrals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateIpdReferralStatus: (id: string, action: 'accept' | 'reject' | 'reopen', note?: string) =>
    api(`/hospital/ipd/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action, note }) }),
  admitFromReferral: (id: string, data: { departmentId: string; doctorId?: string; wardId?: string; bedId?: string; deposit?: number; tokenFee?: number }) =>
    api(`/hospital/ipd/referrals/${id}/admit`, { method: 'POST', body: JSON.stringify(data) }),

  // IPD: Admission detail
  getIPDAdmissionById: (id: string) => api(`/hospital/ipd/admissions/${id}`),

  // IPD: Discharge Documents
  getIpdDischargeSummary: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`),
  upsertIpdDischargeSummary: (encounterId: string, data: { diagnosis?: string; courseInHospital?: string; procedures?: string[]; conditionAtDischarge?: string; medications?: string[]; advice?: string; followUpDate?: string; notes?: string; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`, { method: 'PUT', body: JSON.stringify(data) }),
  getIpdDeathCertificate: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`),
  upsertIpdDeathCertificate: (encounterId: string, data: {
    // Existing simple
    dateOfDeath?: string; timeOfDeath?: string; causeOfDeath?: string; placeOfDeath?: string; notes?: string; createdBy?: string;
    // New structured
    dcNo?: string; mrNumber?: string; relative?: string; ageSex?: string; address?: string;
    presentingComplaints?: string; diagnosis?: string; primaryCause?: string; secondaryCause?: string;
    receiverName?: string; receiverRelation?: string; receiverIdCard?: string; receiverDate?: string; receiverTime?: string;
    staffName?: string; staffSignDate?: string; staffSignTime?: string; doctorName?: string; doctorSignDate?: string; doctorSignTime?: string;
  }) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`, { method: 'PUT', body: JSON.stringify(data) }),
  // IPD Birth Certificate
  getIpdBirthCertificate: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate`),
  upsertIpdBirthCertificate: (encounterId: string, data: any) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate`, { method: 'PUT', body: JSON.stringify(data) }),
  // Birth Certificate (Standalone)
  createBirthCertificate: (data: any) =>
    api(`/hospital/ipd/forms/birth-certificates`, { method: 'POST', body: JSON.stringify(data) }),
  getBirthCertificateById: (id: string) =>
    api(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}`),
  updateBirthCertificateById: (id: string, data: any) =>
    api(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBirthCertificateById: (id: string) =>
    api(`/hospital/ipd/forms/birth-certificates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // IPD Received Death
  getIpdReceivedDeath: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death`),
  upsertIpdReceivedDeath: (encounterId: string, data: {
    srNo?: string; patientCnic?: string; relative?: string; ageSex?: string;
    emergencyReportedDate?: string; emergencyReportedTime?: string;
    receiving?: { pulse?: string; bloodPressure?: string; respiratoryRate?: string; pupils?: string; cornealReflex?: string; ecg?: string };
    diagnosis?: string; attendantName?: string; attendantRelative?: string; attendantRelation?: string; attendantAddress?: string; attendantCnic?: string;
    deathDeclaredBy?: string; chargeNurseName?: string; doctorName?: string; createdBy?: string;
  }) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death`, { method: 'PUT', body: JSON.stringify(data) }),
  // IPD Short Stay
  getIpdShortStay: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`),
  upsertIpdShortStay: (encounterId: string, data: { admittedAt?: string; dischargedAt?: string; data?: any; notes?: string; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`, { method: 'PUT', body: JSON.stringify(data) }),
  getIpdFinalInvoice: (encounterId: string) =>
    api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/final-invoice`),

  // IPD Forms Lists (for standalone pages)
  listIpdReceivedDeaths: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/forms/received-deaths${s ? `?${s}` : ''}`)
  },
  listIpdDeathCertificates: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/forms/death-certificates${s ? `?${s}` : ''}`)
  },
  listIpdBirthCertificates: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/forms/birth-certificates${s ? `?${s}` : ''}`)
  },
  listIpdShortStays: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/forms/short-stays${s ? `?${s}` : ''}`)
  },
  listIpdDischargeSummaries: (params?: { q?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/forms/discharge-summaries${s ? `?${s}` : ''}`)
  },

  // IPD Forms Deletes (by encounter)
  deleteIpdReceivedDeath: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/received-death`, { method: 'DELETE' }),
  deleteIpdDeathCertificate: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/death-certificate`, { method: 'DELETE' }),
  deleteIpdBirthCertificate: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/birth-certificate`, { method: 'DELETE' }),
  deleteIpdShortStay: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/short-stay`, { method: 'DELETE' }),
  deleteIpdDischargeSummary: (encounterId: string) => api(`/hospital/ipd/admissions/${encodeURIComponent(encounterId)}/discharge-summary`, { method: 'DELETE' }),

  // IPD Records: Vitals
  listIpdVitals: (encounterId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/vitals${s ? `?${s}` : ''}`)
  },
  createIpdVital: (encounterId: string, data: { recordedAt?: string; bp?: string; hr?: number; rr?: number; temp?: number; spo2?: number; height?: number; weight?: number; painScale?: number; recordedBy?: string; note?: string; shift?: 'morning' | 'evening' | 'night'; bsr?: number; intakeIV?: string; urine?: string; nurseSign?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/vitals`, { method: 'POST', body: JSON.stringify(data) }),

  // IPD Records: Notes
  listIpdNotes: (encounterId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/notes${s ? `?${s}` : ''}`)
  },
  createIpdNote: (encounterId: string, data: { noteType: 'nursing' | 'progress' | 'discharge'; text: string; attachments?: string[]; createdBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  // IPD Records: Clinical Notes (Unified)
  listIpdClinicalNotes: (encounterId: string, params?: { type?: 'preop' | 'operation' | 'postop' | 'consultant' | 'anes-pre' | 'anes-intra' | 'anes-recovery' | 'anes-post-recovery' | 'anes-adverse'; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/clinical-notes${s ? `?${s}` : ''}`)
  },
  createIpdClinicalNote: (encounterId: string, data: { type: 'preop' | 'operation' | 'postop' | 'consultant' | 'anes-pre' | 'anes-intra' | 'anes-recovery' | 'anes-post-recovery' | 'anes-adverse'; recordedAt?: string; createdBy?: string; createdByRole?: string; doctorName?: string; sign?: string; data: any }) =>
    api(`/hospital/ipd/admissions/${encounterId}/clinical-notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdClinicalNote: (id: string, data: any) =>
    api(`/hospital/ipd/clinical-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdClinicalNote: (id: string) =>
    api(`/hospital/ipd/clinical-notes/${id}`, { method: 'DELETE' }),

  // IPD Records: Doctor Visits
  listIpdDoctorVisits: (encounterId: string, params?: { page?: number; limit?: number; category?: 'visit' | 'progress' }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.category) qs.set('category', params.category)
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/doctor-visits${s ? `?${s}` : ''}`)
  },
  createIpdDoctorVisit: (encounterId: string, data: { doctorId?: string; when?: string; category?: 'visit' | 'progress'; subjective?: string; objective?: string; assessment?: string; plan?: string; diagnosisCodes?: string[]; nextReviewAt?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/doctor-visits`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdDoctorVisit: (id: string, data: { doctorId?: string; when?: string; category?: 'visit' | 'progress'; subjective?: string; objective?: string; assessment?: string; plan?: string; diagnosisCodes?: string[]; nextReviewAt?: string; done?: boolean }) =>
    api(`/hospital/ipd/doctor-visits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdDoctorVisit: (id: string) =>
    api(`/hospital/ipd/doctor-visits/${id}`, { method: 'DELETE' }),

  // IPD Records: Medication Orders
  listIpdMedOrders: (encounterId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/med-orders${s ? `?${s}` : ''}`)
  },
  createIpdMedOrder: (encounterId: string, data: { drugId?: string; drugName?: string; dose?: string; route?: string; frequency?: string; duration?: string; startAt?: string; endAt?: string; prn?: boolean; status?: 'active' | 'stopped'; prescribedBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/med-orders`, { method: 'POST', body: JSON.stringify(data) }),

  // IPD Records: MAR (admins) - list/create are order-scoped
  listIpdMedAdmins: (orderId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/med-orders/${orderId}/admins${s ? `?${s}` : ''}`)
  },
  createIpdMedAdmin: (orderId: string, data: { givenAt?: string; doseGiven?: string; byUser?: string; status?: 'given' | 'missed' | 'held'; remarks?: string }) =>
    api(`/hospital/ipd/med-orders/${orderId}/admins`, { method: 'POST', body: JSON.stringify(data) }),

  // IPD Records: Lab Links
  listIpdLabLinks: (encounterId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/lab-links${s ? `?${s}` : ''}`)
  },
  createIpdLabLink: (encounterId: string, data: { externalLabOrderId?: string; testIds?: string[]; status?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/lab-links`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdLabLink: (id: string, data: { externalLabOrderId?: string; testIds?: string[]; status?: string }) =>
    api(`/hospital/ipd/lab-links/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdLabLink: (id: string) =>
    api(`/hospital/ipd/lab-links/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // IPD Records: Billing Items
  listIpdBillingItems: (encounterId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/billing/items${s ? `?${s}` : ''}`)
  },
  createIpdBillingItem: (encounterId: string, data: { type: 'bed' | 'procedure' | 'medication' | 'service'; description: string; qty?: number; unitPrice?: number; amount?: number; date?: string; refId?: string; billedBy?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/billing/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdBillingItem: (id: string, data: { type?: 'bed' | 'procedure' | 'medication' | 'service'; description?: string; qty?: number; unitPrice?: number; amount?: number; date?: string; refId?: string; billedBy?: string }) =>
    api(`/hospital/ipd/billing/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdBillingItem: (id: string) =>
    api(`/hospital/ipd/billing/items/${id}`, { method: 'DELETE' }),

  // IPD Records: Payments
  listIpdPayments: (encounterId: string, params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/ipd/admissions/${encounterId}/billing/payments${s ? `?${s}` : ''}`)
  },
  createIpdPayment: (encounterId: string, data: { amount: number; method?: string; refNo?: string; receivedBy?: string; receivedAt?: string; notes?: string }) =>
    api(`/hospital/ipd/admissions/${encounterId}/billing/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateIpdPayment: (id: string, data: { amount?: number; method?: string; refNo?: string; receivedBy?: string; receivedAt?: string; notes?: string }) =>
    api(`/hospital/ipd/billing/payments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIpdPayment: (id: string) =>
    api(`/hospital/ipd/billing/payments/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Prescriptions
  createPrescription: (data: { encounterId: string; prescriptionMode?: 'electronic' | 'manual'; manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }; items?: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string }>; labTests?: string[]; labNotes?: string; diagnosticTests?: string[]; diagnosticNotes?: string; primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; treatmentHistory?: string; allergyHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; createdBy?: string; vitals?: { pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number } }) =>
    api('/hospital/opd/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
  listPrescriptions: (params?: { doctorId?: string; patientMrn?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.patientMrn) qs.set('patientMrn', params.patientMrn)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/opd/prescriptions${s ? `?${s}` : ''}`)
  },
  getPrescription: (id: string) => api(`/hospital/opd/prescriptions/${id}`),
  updatePrescription: (id: string, data: { prescriptionMode?: 'electronic' | 'manual'; manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }; items?: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string }>; labTests?: string[]; labNotes?: string; diagnosticTests?: string[]; diagnosticNotes?: string; primaryComplaint?: string; primaryComplaintHistory?: string; familyHistory?: string; treatmentHistory?: string; allergyHistory?: string; history?: string; examFindings?: string; diagnosis?: string; advice?: string; vitals?: { pulse?: number; temperatureC?: number; bloodPressureSys?: number; bloodPressureDia?: number; respiratoryRate?: number; bloodSugar?: number; weightKg?: number; heightCm?: number; bmi?: number; bsa?: number; spo2?: number } }) =>
    api(`/hospital/opd/prescriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrescription: (id: string) => api(`/hospital/opd/prescriptions/${id}`, { method: 'DELETE' }),

  // Referrals (OPD)
  createReferral: (data: { type: 'lab' | 'pharmacy' | 'diagnostic'; encounterId: string; doctorId: string; prescriptionId?: string; tests?: string[]; notes?: string }) =>
    api('/hospital/opd/referrals', { method: 'POST', body: JSON.stringify(data) }),
  listReferrals: (params?: { type?: 'lab' | 'pharmacy' | 'diagnostic'; status?: 'pending' | 'completed' | 'cancelled'; doctorId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.status) qs.set('status', params.status)
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/opd/referrals${s ? `?${s}` : ''}`)
  },
  updateReferralStatus: (id: string, status: 'pending' | 'completed' | 'cancelled') =>
    api(`/hospital/opd/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteReferral: (id: string) => api(`/hospital/opd/referrals/${id}`, { method: 'DELETE' }),

  // Notifications (Doctor portal)
  listNotifications: (doctorId: string) =>
    api(`/hospital/notifications?doctorId=${encodeURIComponent(doctorId)}`),
  updateNotification: (id: string, read: boolean) =>
    api(`/hospital/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read }) }),
  // Audit Logs
  listHospitalAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.action) qs.set('action', params.action)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/audit-logs${s ? `?${s}` : ''}`)
  },
  createHospitalAuditLog: (data: { actor?: string; action: string; label?: string; method?: string; path?: string; at: string; detail?: string }) =>
    api('/hospital/audit-logs', { method: 'POST', body: JSON.stringify(data) }),

  // Equipment Management
  listEquipment: (params?: { q?: string; category?: string; status?: 'Working' | 'UnderMaintenance' | 'NotWorking' | 'Condemned' | 'Spare'; departmentId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.category) qs.set('category', params.category)
    if (params?.status) qs.set('status', params.status)
    if (params?.departmentId) qs.set('departmentId', params.departmentId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/equipment${s ? `?${s}` : ''}`)
  },
  createEquipment: (data: any) => api('/hospital/equipment', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id: string, data: any) => api(`/hospital/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEquipment: (id: string) => api(`/hospital/equipment/${id}`, { method: 'DELETE' }),

  listEquipmentPPM: (params?: { equipmentId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.equipmentId) qs.set('equipmentId', params.equipmentId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/equipment/ppm${s ? `?${s}` : ''}`)
  },
  createEquipmentPPM: (data: { equipmentId: string; performedAt: string; nextDue?: string; doneBy?: string; vendorId?: string; notes?: string; partsUsed?: Array<{ partName?: string; qty?: number; cost?: number }>; cost?: number }) =>
    api('/hospital/equipment/ppm', { method: 'POST', body: JSON.stringify(data) }),

  listEquipmentCalibrations: (params?: { equipmentId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.equipmentId) qs.set('equipmentId', params.equipmentId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/equipment/calibrations${s ? `?${s}` : ''}`)
  },
  createEquipmentCalibration: (data: { equipmentId: string; performedAt: string; nextDue?: string; labName?: string; certificateNo?: string; result?: string; validFrom?: string; validTo?: string; notes?: string; cost?: number }) =>
    api('/hospital/equipment/calibrations', { method: 'POST', body: JSON.stringify(data) }),

  listEquipmentDuePPM: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/equipment/due/ppm${s ? `?${s}` : ''}`)
  },
  listEquipmentDueCalibration: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/equipment/due/calibration${s ? `?${s}` : ''}`)
  },

  // Equipment: Breakdowns
  listEquipmentBreakdowns: (params?: { equipmentId?: string; status?: 'Open' | 'Closed'; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.equipmentId) qs.set('equipmentId', params.equipmentId)
    if (params?.status) qs.set('status', params.status)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/equipment/breakdowns${s ? `?${s}` : ''}`)
  },
  createEquipmentBreakdown: (data: { equipmentId: string; reportedAt: string; restoredAt?: string; description?: string; rootCause?: string; correctiveAction?: string; vendorId?: string; severity?: 'low' | 'medium' | 'high'; status?: 'Open' | 'Closed'; cost?: number }) =>
    api('/hospital/equipment/breakdowns', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipmentBreakdown: (id: string, data: Partial<{ reportedAt: string; restoredAt?: string; description?: string; rootCause?: string; correctiveAction?: string; vendorId?: string; severity?: 'low' | 'medium' | 'high'; status?: 'Open' | 'Closed'; cost?: number }>) =>
    api(`/hospital/equipment/breakdowns/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Equipment: Condemnations
  listEquipmentCondemnations: (params?: { equipmentId?: string; status?: 'Proposed' | 'Approved' | 'Disposed'; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.equipmentId) qs.set('equipmentId', params.equipmentId)
    if (params?.status) qs.set('status', params.status)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/equipment/condemnations${s ? `?${s}` : ''}`)
  },
  createEquipmentCondemnation: (data: { equipmentId: string; proposedAt?: string; reason?: string; approvedBy?: string; approvedAt?: string; status?: 'Proposed' | 'Approved' | 'Disposed'; disposalMethod?: string; disposalDate?: string; notes?: string }) =>
    api('/hospital/equipment/condemnations', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipmentCondemnation: (id: string, data: Partial<{ proposedAt?: string; reason?: string; approvedBy?: string; approvedAt?: string; status?: 'Proposed' | 'Approved' | 'Disposed'; disposalMethod?: string; disposalDate?: string; notes?: string }>) =>
    api(`/hospital/equipment/condemnations/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Equipment: KPIs
  equipmentKpis: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/equipment/kpis${s ? `?${s}` : ''}`)
  },
}

export const financeApi = {
  manualDoctorEarning: (data: { doctorId: string; departmentId?: string; amount: number; revenueAccount?: 'OPD_REVENUE' | 'PROCEDURE_REVENUE' | 'IPD_REVENUE'; paidMethod?: 'Cash' | 'Bank' | 'AR'; memo?: string; sharePercent?: number; patientName?: string; mrn?: string }) =>
    api('/hospital/finance/manual-doctor-earning', { method: 'POST', body: JSON.stringify(data) }),
  doctorPayout: (data: { doctorId: string; amount: number; method?: 'Cash' | 'Bank'; memo?: string }) =>
    api('/hospital/finance/doctor-payout', { method: 'POST', body: JSON.stringify(data) }),
  doctorBalance: (doctorId: string) =>
    api(`/hospital/finance/doctor/${encodeURIComponent(doctorId)}/balance`),
  doctorPayouts: (doctorId: string, limit?: number) =>
    api(`/hospital/finance/doctor/${encodeURIComponent(doctorId)}/payouts${limit ? `?limit=${limit}` : ''}`),
  doctorAccruals: (doctorId: string, from: string, to: string) =>
    api(`/hospital/finance/doctor/${encodeURIComponent(doctorId)}/accruals?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  doctorEarnings: (params?: { doctorId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/finance/earnings${s ? `?${s}` : ''}`)
  },
  reverseJournal: (journalId: string, memo?: string) =>
    api(`/hospital/finance/journal/${encodeURIComponent(journalId)}/reverse`, { method: 'POST', body: JSON.stringify({ memo }) }),

  // Cash Sessions
  currentCashSession: () => api('/hospital/finance/cash-sessions/current'),
  openCashSession: (data: { openingFloat?: number; counterId?: string; shiftId?: string; shiftName?: string; note?: string }) =>
    api('/hospital/finance/cash-sessions/open', { method: 'POST', body: JSON.stringify(data) }),
  closeCashSession: (id: string, data: { countedCash: number; note?: string }) =>
    api(`/hospital/finance/cash-sessions/${encodeURIComponent(id)}/close`, { method: 'POST', body: JSON.stringify(data) }),
  listCashSessions: (params?: { from?: string; to?: string; userId?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.userId) qs.set('userId', params.userId)
    const s = qs.toString()
    return api(`/hospital/finance/cash-sessions${s ? `?${s}` : ''}`)
  },

  // Manager Cash Count (Hospital)
  listCashCounts: (params?: { from?: string; to?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/finance/cash-counts${s ? `?${s}` : ''}`)
  },
  createCashCount: (data: { date: string; amount: number; receiver?: string; handoverBy?: string; note?: string }) =>
    api('/hospital/finance/cash-counts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCashCount: (id: string) => api(`/hospital/finance/cash-counts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  cashCountSummary: (params?: { from?: string; to?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.search) qs.set('search', params.search)
    const s = qs.toString()
    return api(`/hospital/finance/cash-counts/summary${s ? `?${s}` : ''}`)
  },

  // Vendors
  vendors: (params?: { q?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/finance/vendors${s ? `?${s}` : ''}`)
  },
  createVendor: (data: { name: string; phone?: string; address?: string }) => api('/hospital/finance/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id: string, data: { name?: string; phone?: string; address?: string }) => api(`/hospital/finance/vendors/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id: string) => api(`/hospital/finance/vendors/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Trial Balance / Balance Sheet / Ledger
  trialBalance: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/finance/trial-balance${s ? `?${s}` : ''}`)
  },
  balanceSheet: (asOf?: string) => api(`/hospital/finance/balance-sheet${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ''}`),
  ledger: (params: { account: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    qs.set('account', params.account)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    return api(`/hospital/finance/ledger?${qs.toString()}`)
  },

  // Vouchers
  vouchers: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/finance/vouchers${s ? `?${s}` : ''}`)
  },
  createVoucher: (data: { dateIso?: string; type?: 'receipt' | 'payment' | 'journal'; memo?: string; lines: Array<{ account: string; debit?: number; credit?: number; tags?: any }> }) => api('/hospital/finance/vouchers', { method: 'POST', body: JSON.stringify(data) }),

  // Recurring
  recurringList: () => api('/hospital/finance/recurring'),
  recurringCreate: (data: { name: string; memo?: string; amount: number; accountDebit: string; accountCredit: string; vendorId?: string; frequency?: 'daily' | 'weekly' | 'monthly'; startDate: string; endDate?: string; nextRun?: string; active?: boolean }) => api('/hospital/finance/recurring', { method: 'POST', body: JSON.stringify(data) }),
  recurringUpdate: (id: string, data: Partial<{ name: string; memo?: string; amount: number; accountDebit: string; accountCredit: string; vendorId?: string; frequency?: 'daily' | 'weekly' | 'monthly'; startDate: string; endDate?: string; nextRun?: string; active?: boolean }>) => api(`/hospital/finance/recurring/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  recurringDelete: (id: string) => api(`/hospital/finance/recurring/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  recurringRun: (id: string) => api(`/hospital/finance/recurring/${encodeURIComponent(id)}/run`, { method: 'POST' }),

  // Combined cash/bank summary
  combinedCashBank: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/hospital/finance/combined-cash-bank${s ? `?${s}` : ''}`)
  },

  // Finance Module: Users
  listUsers: () => api('/hospital/finance/users'),
  createUser: (data: { username: string; role: string; password: string }) =>
    api('/hospital/finance/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { username?: string; role?: string; password?: string }) =>
    api(`/hospital/finance/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    api(`/hospital/finance/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // Finance Module: Auth
  login: (username: string, password: string) =>
    api('/hospital/finance/users/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () =>
    api('/hospital/finance/users/logout', { method: 'POST' }),

  // Finance Module: Sidebar Roles & Permissions
  listSidebarRoles: () => api('/hospital/finance/sidebar-roles'),
  createSidebarRole: (role: string, permissions?: Array<{ path: string; label: string; visible?: boolean; order?: number }>) =>
    api('/hospital/finance/sidebar-roles', { method: 'POST', body: JSON.stringify({ role, permissions }) }),
  deleteSidebarRole: (role: string) => api(`/hospital/finance/sidebar-roles/${encodeURIComponent(role)}`, { method: 'DELETE' }),
  listSidebarPermissions: (role?: string) => role
    ? api(`/hospital/finance/sidebar-permissions?role=${encodeURIComponent(role)}`)
    : api('/hospital/finance/sidebar-permissions'),
  updateSidebarPermissions: (role: string, data: { permissions: Array<{ path: string; label: string; visible: boolean; order: number }> }) =>
    api(`/hospital/finance/sidebar-permissions/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetSidebarPermissions: (role: string) =>
    api(`/hospital/finance/sidebar-permissions/${encodeURIComponent(role)}/reset`, { method: 'POST' }),

  // Finance: Audit Logs
  listAuditLogs: (params?: { search?: string; action?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.action) qs.set('action', params.action)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.page != null) qs.set('page', String(params.page))
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return api(`/hospital/finance/audit-logs${s ? `?${s}` : ''}`)
  },
  createAuditLog: (data: { actor?: string; action: string; label?: string; method?: string; path?: string; at: string; detail?: string }) =>
    api('/hospital/finance/audit-logs', { method: 'POST', body: JSON.stringify(data) }),
}

export const aestheticFinanceApi = {
  manualDoctorEarning: (data: { doctorId: string; amount: number; revenueAccount?: 'OPD_REVENUE' | 'PROCEDURE_REVENUE' | 'IPD_REVENUE'; paidMethod?: 'Cash' | 'Bank' | 'AR'; memo?: string; patientName?: string; mrn?: string }) =>
    api('/aesthetic/finance/manual-doctor-earning', { method: 'POST', body: JSON.stringify(data) }),
  doctorPayout: (data: { doctorId: string; amount: number; method?: 'Cash' | 'Bank'; memo?: string }) =>
    api('/aesthetic/finance/doctor-payout', { method: 'POST', body: JSON.stringify(data) }),
  doctorBalance: (doctorId: string) =>
    api(`/aesthetic/finance/doctor/${encodeURIComponent(doctorId)}/balance`),
  doctorPayouts: (doctorId: string, limit?: number) =>
    api(`/aesthetic/finance/doctor/${encodeURIComponent(doctorId)}/payouts${limit ? `?limit=${limit}` : ''}`),
  doctorEarnings: (params?: { doctorId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.doctorId) qs.set('doctorId', params.doctorId)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const s = qs.toString()
    return api(`/aesthetic/finance/earnings${s ? `?${s}` : ''}`)
  },
  reverseJournal: (journalId: string, memo?: string) =>
    api(`/aesthetic/finance/journal/${encodeURIComponent(journalId)}/reverse`, { method: 'POST', body: JSON.stringify({ memo }) }),
  payablesSummary: () => api('/aesthetic/finance/payables-summary'),
  listRecentPayouts: (limit?: number) => api(`/aesthetic/finance/payouts${limit ? `?limit=${limit}` : ''}`),
}
