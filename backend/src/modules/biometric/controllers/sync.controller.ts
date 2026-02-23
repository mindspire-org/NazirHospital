import { Request, Response } from 'express'
import { syncOnce } from '../jobs/poller'

export async function syncNow(_req: Request, res: Response){
  const t0 = Date.now()
  try {
    await syncOnce()
    const ms = Date.now() - t0
    res.json({ ok: true, tookMs: ms })
  } catch (e: any) {
    const ms = Date.now() - t0
    res.status(500).json({ ok: false, tookMs: ms, error: String(e?.message || e || 'error') })
  }
}
