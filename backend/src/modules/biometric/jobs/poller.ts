/* eslint-disable @typescript-eslint/no-var-requires */
import { env } from '../../../config/env'
import { BiometricSyncState } from '../models/BiometricSyncState'
import { processBiometricEvent } from '../services/biometric_attendance'

type ZKAttendanceRow = {
  uid?: any
  userId?: any
  id?: any
  userSN?: any
  userSn?: any
  enrollNumber?: any
  sn?: any
  deviceUserId?: any
  timestamp?: any
  time?: any
  recordTime?: any
  checkTime?: any
}

function normalizeAttendanceRows(result: any): ZKAttendanceRow[] {
  if (!result) return []
  if (Array.isArray(result)) return result as any
  if (Array.isArray(result.data)) return result.data as any
  if (Array.isArray(result.items)) return result.items as any
  if (Array.isArray(result.records)) return result.records as any
  if (Array.isArray(result.attendances)) return result.attendances as any
  if (Array.isArray(result.logs)) return result.logs as any
  return []
}

function asDate(v: any): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function getEnrollId(row: ZKAttendanceRow): string {
  const v = (row as any).deviceUserId ?? (row as any).userId ?? (row as any).uid ?? (row as any).id ?? (row as any).userSN ?? (row as any).userSn ?? (row as any).enrollNumber ?? (row as any).sn
  return String(v ?? '').trim()
}

function getTimestamp(row: ZKAttendanceRow): Date | null {
  return asDate((row as any).timestamp ?? (row as any).time ?? (row as any).recordTime ?? (row as any).checkTime)
}

function formatZkErr(e: any): string {
  if (!e) return 'error'
  if (typeof e === 'string') return e
  const msg = String(e?.message || '')
  const err = (e as any)?.err
  const code = err?.code ? String(err.code) : ''
  const errno = (typeof err?.errno !== 'undefined') ? String(err.errno) : ''
  const syscall = err?.syscall ? String(err.syscall) : ''
  const address = err?.address ? String(err.address) : ''
  const port = err?.port ? String(err.port) : ''
  const parts = [msg, code && `code=${code}`, errno && `errno=${errno}`, syscall && `syscall=${syscall}`, address && `address=${address}`, port && `port=${port}`].filter(Boolean)
  if (parts.length) return parts.join(' ')
  try { return JSON.stringify(e) } catch { return String(e) }
}

let intervalHandle: any = null
let running = false
let failureCount = 0
let nextRunAt = 0
let lastLoggedErrorKey = ''
let consecutiveFailures = 0
let pollerPaused = false

export function isPollerPaused(){ return pollerPaused }
export function resetPollerState(){ consecutiveFailures = 0; pollerPaused = false; failureCount = 0; nextRunAt = 0 }

export function startBiometricPoller(){
  if (!env.BIOMETRIC_ENABLED) return
  if (!env.BIOMETRIC_IP) {
    console.warn('[biometric] BIOMETRIC_IP is empty; poller not started')
    return
  }
  if (intervalHandle) return

  const intervalMs = Math.max(1000, Number(env.BIOMETRIC_POLL_INTERVAL_MS || 15000))

  const tick = async () => {
    if (running) return
    if (pollerPaused) {
      console.log('[biometric] poller is paused, skipping tick')
      return
    }
    if (Date.now() < nextRunAt) return
    running = true
    try {
      await syncOnce()
      failureCount = 0
      consecutiveFailures = 0
      nextRunAt = 0
      lastLoggedErrorKey = ''
    } catch (e: any) {
      failureCount = Math.min(10, failureCount + 1)
      consecutiveFailures++
      
      // If too many consecutive failures, pause poller temporarily
      if (consecutiveFailures >= 5) {
        pollerPaused = true
        const pauseMs = 60 * 1000 // Pause for 1 minute
        console.error(`[biometric] Too many consecutive failures (${consecutiveFailures}), pausing poller for ${pauseMs/1000}s`)
        setTimeout(() => {
          pollerPaused = false
          consecutiveFailures = 0
          console.log('[biometric] Resuming poller after pause')
        }, pauseMs)
      }
      
      const base = Math.max(1000, Number(env.BIOMETRIC_POLL_INTERVAL_MS || 15000))
      const backoff = Math.min(5 * 60_000, base * Math.pow(2, failureCount))
      nextRunAt = Date.now() + backoff

      let msg = ''
      if (e && typeof e === 'object') {
        msg = String((e as any).message || '')
        if (!msg) {
          try { msg = JSON.stringify(e) } catch { msg = String(e) }
        }
      } else {
        msg = String(e || 'error')
      }
      const key = `${msg}@@${failureCount}`
      if (lastLoggedErrorKey !== key) {
        lastLoggedErrorKey = key
        console.error(`[biometric] sync error: ${msg} (retry in ${Math.round(backoff/1000)}s)`)
      }
    } finally {
      running = false
    }
  }

  intervalHandle = setInterval(() => {
    tick().catch(() => {})
  }, intervalMs)
  tick().catch(() => {})
  console.log(`[biometric] poller started (${intervalMs}ms)`) 
}

export async function syncOnce(){
  try {
    await _syncOnceInternal()
  } catch (e: any) {
    console.error('[biometric] syncOnce failed:', formatZkErr(e))
    throw e
  }
}

async function _syncOnceInternal(){
  const ZKLib = require('node-zklib')

  const deviceId = String(env.BIOMETRIC_DEVICE_ID || 'ZK-01')
  const ip = String(env.BIOMETRIC_IP)
  const port = Number(env.BIOMETRIC_PORT || 4370)
  const password = Number(env.BIOMETRIC_COMM_PASSWORD || 0)

  const state = await BiometricSyncState.findOne({ deviceId })
    .lean<{ lastTimestamp?: Date | string } | null>()
  let lastTs = state?.lastTimestamp ? new Date(state.lastTimestamp as any) : null
  const now = new Date()
  // If lastTs looks like it's in the future (device time mismatch), ignore it to avoid skipping new scans
  if (lastTs && lastTs.getTime() > now.getTime() + 5 * 60_000) {
    console.warn('[biometric] lastTimestamp is in the future; ignoring stored sync cursor')
    lastTs = null
  }

  const connectAndFetch = async (pwd: number) => {
    let zk: any = null
    let connected = false
    try {
      console.log('[biometric] creating ZKLib instance...')
      const ZKLib = require('node-zklib')
      zk = new ZKLib(ip, port, 10000, 5200, pwd)
      
      console.log('[biometric] creating socket...')
      try {
        await zk.createSocket()
        connected = true
        console.log('[biometric] socket connected successfully')
      } catch (socketErr: any) {
        console.error('[biometric] socket creation failed:', formatZkErr(socketErr))
        throw socketErr
      }
      
      console.log('[biometric] fetching attendances...')
      let rawResult: any
      try {
        rawResult = await zk.getAttendances()
      } catch (attErr: any) {
        console.error('[biometric] getAttendances failed:', formatZkErr(attErr))
        throw attErr
      }
      
      const rows: ZKAttendanceRow[] = normalizeAttendanceRows(rawResult)

      if (!rows.length) {
        console.log('[biometric] no attendance rows returned from device')
      } else {
        const sample = rows[rows.length - 1]
        const sampleEnroll = getEnrollId(sample)
        const sampleTs = getTimestamp(sample)
        const keys = Object.keys(sample as any).slice(0, 12).join(',')
        console.log(`[biometric] downloaded ${rows.length} attendance rows (sample enroll=${sampleEnroll || '?'} ts=${sampleTs ? sampleTs.toISOString() : '?'}, keys=${keys})`)
      }

      const sorted = (Array.isArray(rows) ? rows : []).slice().sort((a, b) => {
        const ta = getTimestamp(a)?.getTime() || 0
        const tb = getTimestamp(b)?.getTime() || 0
        return ta - tb
      })

      let maxTs: Date | null = lastTs

      for (const row of sorted) {
        const enrollId = getEnrollId(row)
        const ts = getTimestamp(row)
        if (!enrollId || !ts) continue
        if (lastTs && ts.getTime() <= lastTs.getTime()) continue

        await processBiometricEvent({ deviceId, enrollId, timestamp: ts, raw: row })

        if (!maxTs || ts.getTime() > maxTs.getTime()) maxTs = ts
      }

      try {
        await BiometricSyncState.findOneAndUpdate(
          { deviceId },
          { $set: { lastTimestamp: maxTs || lastTs || undefined, lastSuccessAt: new Date(), lastError: '' } },
          { upsert: true, new: true }
        )
      } catch {}
    } finally {
      if (zk && connected) {
        console.log('[biometric] disconnecting socket...')
        try {
          await Promise.race([
            zk.disconnect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('disconnect timeout')), 3000))
          ])
          console.log('[biometric] socket disconnected successfully')
        } catch (discErr: any) {
          console.warn('[biometric] socket disconnect failed/timeout:', formatZkErr(discErr))
        }
      }
      // Add delay to ensure device releases connection slot
      console.log('[biometric] waiting 1s before releasing connection...')
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  try {
    await connectAndFetch(password)
  } catch (e: any) {
    // Common scenario: device COMM KEY not set (0) but env has a non-zero password
    // Retry once with 0 to improve out-of-box connectivity.
    const msg = formatZkErr(e)
    console.log('[biometric] first attempt failed:', msg)
    if (password && password !== 0) {
      try {
        await connectAndFetch(0)
        console.warn(`[biometric] connected after retry with COMM_PASSWORD=0 (configured password failed: ${msg})`)
        return
      } catch (e2: any) {
        const msg2 = formatZkErr(e2)
        console.error('[biometric] retry with password=0 also failed:', msg2)
        await BiometricSyncState.findOneAndUpdate(
          { deviceId },
          { $set: { lastErrorAt: new Date(), lastError: msg2 } },
          { upsert: true }
        )
        throw e2
      }
    }

    await BiometricSyncState.findOneAndUpdate(
      { deviceId },
      { $set: { lastErrorAt: new Date(), lastError: msg } },
      { upsert: true }
    )
    throw e
  }
}
