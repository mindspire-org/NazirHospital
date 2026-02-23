/* eslint-disable @typescript-eslint/no-var-requires */
import { Request, Response } from 'express'
import { env } from '../../../config/env'

type ZKUserRow = {
  userId?: any
  uid?: any
  id?: any
  userSN?: any
  userSn?: any
  deviceUserId?: any
  name?: any
  username?: any
}

function normalizeUserRows(result: any): ZKUserRow[] {
  if (!result) return []
  if (Array.isArray(result)) return result as any
  if (Array.isArray(result.data)) return result.data as any
  if (Array.isArray(result.users)) return result.users as any
  if (Array.isArray(result.items)) return result.items as any
  return []
}

function getEnrollId(row: ZKUserRow): string {
  const v = (row as any).deviceUserId ?? (row as any).userId ?? (row as any).uid ?? (row as any).id ?? (row as any).userSN ?? (row as any).userSn
  return String(v ?? '').trim()
}

function getName(row: ZKUserRow): string {
  const v = (row as any).name ?? (row as any).username
  return String(v ?? '').trim()
}

export async function listDeviceUsers(_req: Request, res: Response) {
  if (!env.BIOMETRIC_ENABLED) return res.status(400).json({ message: 'Biometric is disabled' })
  if (!env.BIOMETRIC_IP) return res.status(400).json({ message: 'BIOMETRIC_IP is not set' })

  const ZKLib = require('node-zklib')
  const deviceId = String(env.BIOMETRIC_DEVICE_ID || 'ZK-01')
  const ip = String(env.BIOMETRIC_IP)
  const port = Number(env.BIOMETRIC_PORT || 4370)
  const password = Number(env.BIOMETRIC_COMM_PASSWORD || 0)

  const zk = new ZKLib(ip, port, 10000, 5200, password)
  try {
    await zk.createSocket()
    const raw: any = await zk.getUsers()
    const rows = normalizeUserRows(raw)

    const users = rows
      .map(r => ({ enrollId: getEnrollId(r), name: getName(r) }))
      .filter(x => !!x.enrollId)
      .sort((a, b) => Number(a.enrollId) - Number(b.enrollId))

    res.json({ deviceId, users, total: users.length })
  } catch (e: any) {
    const msg = e?.message || String(e) || 'Unknown error'
    console.error('[biometric] listDeviceUsers failed:', msg)
    return res.status(503).json({ message: 'Biometric device unreachable', error: msg, ip, port })
  } finally {
    try { await zk.disconnect() } catch {}
  }
}
