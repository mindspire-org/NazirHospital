export async function get<T = any>(url: string, config?: { params?: Record<string, any> }): Promise<T> {
  try {
    const fullUrl = appendParams(url, config?.params)
    const res = await fetch(fullUrl, { credentials: 'include' })
    return (await res.json()) as T
  } catch {
    return {} as T
  }
}

export async function post<T = any>(url: string, body: any): Promise<T> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    return (await res.json()) as T
  } catch {
    return {} as T
  }
}

export const api = {
  async get<T = any>(url: string, config?: { params?: Record<string, any> }): Promise<{ data: T }> {
    const data = await get<T>(url, config)
    return { data }
  },
  async post<T = any>(url: string, body: any): Promise<{ data: T }> {
    const data = await post<T>(url, body)
    return { data }
  },
}

function appendParams(url: string, params?: Record<string, any>) {
  if (!params || Object.keys(params).length === 0) return url
  const u = new URL(url, window.location.origin)
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    u.searchParams.set(k, String(v))
  }
  // Preserve relative vs absolute if input was relative
  if (/^https?:\/\//i.test(url)) return u.toString()
  return u.pathname + (u.search || '')
}
