import { Request, Response } from 'express'
import { HospitalStaff } from '../models/Staff'
import { upsertStaffSchema } from '../validators/staff'
import { z } from 'zod'
import { env } from '../../../config/env'
import { BiometricMapping } from '../../biometric/models/BiometricMapping'
import { syncOnce } from '../../biometric/jobs/poller'
import { BiometricSyncState } from '../../biometric/models/BiometricSyncState'

/* eslint-disable @typescript-eslint/no-var-requires */

export async function list(_req: Request, res: Response){
  const rows: any[] = await HospitalStaff.find().sort({ createdAt: -1 }).lean()
  const staffIds = rows.map(x => String((x as any)?._id || '')).filter(Boolean)
  const mappings = staffIds.length
    ? await BiometricMapping.find({ staffId: { $in: staffIds }, active: true }).lean()
    : []
  const byStaffId = new Map<string, any>()
  for (const m of mappings as any[]) {
    const sid = String((m as any).staffId || '')
    if (!sid) continue
    if (!byStaffId.has(sid)) byStaffId.set(sid, m)
  }
  const enriched = rows.map(s => {
    const sid = String((s as any)?._id || '')
    const m = byStaffId.get(sid)
    return {
      ...s,
      biometric: m ? { deviceId: String(m.deviceId || ''), enrollId: String(m.enrollId || '') } : null,
    }
  })
  res.json({ staff: enriched })
}

export async function create(req: Request, res: Response){
  const data = upsertStaffSchema.parse(req.body)
  const row = await HospitalStaff.create(data)
  res.status(201).json({ staff: row })
}

export async function update(req: Request, res: Response){
  const data = upsertStaffSchema.parse(req.body)
  const row = await HospitalStaff.findByIdAndUpdate(req.params.id, data, { new: true })
  if (!row) return res.status(404).json({ error: 'Staff not found' })
  res.json({ staff: row })
}

export async function remove(req: Request, res: Response){
  const row = await HospitalStaff.findByIdAndDelete(req.params.id)
  if (!row) return res.status(404).json({ error: 'Staff not found' })
  res.json({ ok: true })
}

const connectSchema = z.object({
  enrollId: z.string().min(1),
  deviceId: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

export async function connectBiometric(req: Request, res: Response){
  const staffId = String(req.params.id || '')
  const staff = await HospitalStaff.findById(staffId).lean()
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  const data = connectSchema.parse(req.body)
  const deviceId = String(data.deviceId || env.BIOMETRIC_DEVICE_ID || 'ZK-01')

  const patch: any = { staffId, active: true }
  if (typeof data.active === 'boolean') patch.active = data.active

  const doc = await BiometricMapping.findOneAndUpdate(
    { deviceId, enrollId: data.enrollId },
    { $set: patch },
    { new: true, upsert: true }
  )
  res.json({ ok: true, mapping: doc })
}

export async function fetchBiometricNow(_req: Request, res: Response){
  if (!env.BIOMETRIC_ENABLED) return res.status(400).json({ ok: false, message: 'Biometric is disabled' })
  if (!env.BIOMETRIC_IP) return res.status(400).json({ ok: false, message: 'BIOMETRIC_IP is not set' })

  const deviceId = String(env.BIOMETRIC_DEVICE_ID || 'ZK-01')
  const startedAt = new Date().toISOString()
  ;(globalThis as any).__hospitalManualBiometricSync = (globalThis as any).__hospitalManualBiometricSync || { running: false, startedAt: '', finishedAt: '', lastError: '' }
  const state = (globalThis as any).__hospitalManualBiometricSync
  if (state.running) {
    return res.json({ ok: true, started: false, running: true, startedAt: state.startedAt })
  }

  state.running = true
  state.startedAt = startedAt
  state.finishedAt = ''
  state.lastError = ''

  // Fire-and-forget: do NOT block HTTP request on device TCP connection.
  syncOnce()
    .then(() => {
      state.running = false
      state.finishedAt = new Date().toISOString()
      state.lastError = ''
    })
    .catch((e: any) => {
      state.running = false
      state.finishedAt = new Date().toISOString()
      state.lastError = String(e?.message || e || 'error')
    })

  return res.json({ ok: true, started: true, running: true, deviceId, startedAt })
}

export async function biometricStatus(_req: Request, res: Response){
  const deviceId = String(env.BIOMETRIC_DEVICE_ID || 'ZK-01')
  let db: any = null
  try {
    db = await BiometricSyncState.findOne({ deviceId }).lean()
  } catch {}
  const mem = (globalThis as any).__hospitalManualBiometricSync || { running: false, startedAt: '', finishedAt: '', lastError: '' }
  res.json({ ok: true, deviceId, running: !!mem.running, startedAt: mem.startedAt || undefined, finishedAt: mem.finishedAt || undefined, lastError: mem.lastError || undefined, lastSuccessAt: db?.lastSuccessAt, lastTimestamp: db?.lastTimestamp, lastDbErrorAt: db?.lastErrorAt, lastDbError: db?.lastError })
}

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

export async function listBiometricDeviceUsers(_req: Request, res: Response){
  if (!env.BIOMETRIC_ENABLED) return res.status(400).json({ ok: false, message: 'Biometric is disabled' })
  if (!env.BIOMETRIC_IP) return res.status(400).json({ ok: false, message: 'BIOMETRIC_IP is not set' })

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

    res.json({ ok: true, deviceId, users, total: users.length })
  } catch (e: any) {
    const msg = e?.message || String(e) || 'Unknown error'
    console.error('[biometric] listBiometricDeviceUsers failed:', msg)
    return res.status(503).json({ ok: false, message: 'Biometric device unreachable', error: msg, ip, port })
  } finally {
    try { await zk.disconnect() } catch {}
  }
}
