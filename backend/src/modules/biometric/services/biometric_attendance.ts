import { env } from '../../../config/env'
import { BiometricEvent } from '../models/BiometricEvent'
import { BiometricMapping } from '../models/BiometricMapping'
import { HospitalAttendance } from '../../hospital/models/Attendance'
import { HospitalStaff } from '../../hospital/models/Staff'

function dateIsoLocal(d: Date){
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function hhmmLocal(d: Date){
  const hh = String(d.getHours()).padStart(2,'0')
  const mm = String(d.getMinutes()).padStart(2,'0')
  return `${hh}:${mm}`
}

export type ProcessBiometricEventInput = {
  deviceId: string
  enrollId: string
  timestamp: Date
  raw?: any
}

export async function processBiometricEvent(input: ProcessBiometricEventInput){
  const ts = input.timestamp
  console.log('[biometric] Processing event:', { deviceId: input.deviceId, enrollId: input.enrollId, ts: ts?.toISOString() })
  
  if (!input.deviceId || !input.enrollId || !(ts instanceof Date) || Number.isNaN(ts.getTime())) {
    console.log('[biometric] Invalid payload:', { deviceId: input.deviceId, enrollId: input.enrollId, ts })
    return { ok: false as const, reason: 'invalid_payload' as const }
  }

  const date = dateIsoLocal(ts)
  const time = hhmmLocal(ts)
  console.log('[biometric] Parsed date/time:', { date, time })

  const mapping: any = await BiometricMapping.findOne({ deviceId: input.deviceId, enrollId: input.enrollId, active: true }).lean()
  console.log('[biometric] Mapping lookup result:', { found: !!mapping, staffId: mapping?.staffId })
  
  if (!mapping) {
    console.log('[biometric] No mapping found for enrollId:', input.enrollId)
    try {
      await BiometricEvent.create({
        deviceId: input.deviceId,
        enrollId: input.enrollId,
        timestamp: ts,
        date,
        time,
        type: 'unknown_enroll',
        raw: input.raw,
      })
    } catch {}
    return { ok: true as const, mapped: false as const }
  }

  const staffId = String(mapping.staffId)
  console.log('[biometric] Found staffId:', staffId)

  const staff: any = await HospitalStaff.findById(staffId).lean()
  console.log('[biometric] Staff lookup:', { found: !!staff, shiftId: staff?.shiftId })
  
  const staffShiftId = staff?.shiftId ? String(staff.shiftId) : ''

  // Attendance lookup: prefer staff's shiftId, but if not found fallback to any attendance record for that day.
  // This prevents creating separate records when shiftId is missing/mismatched.
  let att: any = null
  let attendanceKey: any = { staffId, date }
  console.log('[biometric] Looking up attendance with key:', attendanceKey)
  
  if (staffShiftId) {
    att = await HospitalAttendance.findOne({ staffId, date, shiftId: staffShiftId }).lean()
    console.log('[biometric] Attendance lookup with shiftId:', { found: !!att, shiftId: staffShiftId })
    if (att) {
      attendanceKey = { staffId, date, shiftId: staffShiftId }
    } else {
      const anyDay: any = await HospitalAttendance.findOne({ staffId, date }).lean()
      console.log('[biometric] Fallback attendance lookup:', { found: !!anyDay })
      if (anyDay) {
        att = anyDay
        attendanceKey = { staffId, date, shiftId: anyDay.shiftId || undefined }
      }
    }
  } else {
    att = await HospitalAttendance.findOne({ staffId, date }).lean()
    console.log('[biometric] Attendance lookup without shiftId:', { found: !!att, existingClockIn: att?.clockIn, existingClockOut: att?.clockOut })
    if (att) attendanceKey = { staffId, date, shiftId: att.shiftId || undefined }
  }

  let eventType: 'check_in'|'check_out' = 'check_in'
  const update: any = { staffId, date, status: 'present' }
  const effectiveShiftId = (att?.shiftId ? String(att.shiftId) : staffShiftId)
  if (effectiveShiftId) update.shiftId = effectiveShiftId
  
  console.log('[biometric] Determining event type:', { hasAtt: !!att, hasClockIn: !!att?.clockIn, hasClockOut: !!att?.clockOut })
  
  if (!att || !att.clockIn) {
    update.clockIn = time
    eventType = 'check_in'
    console.log('[biometric] Will record CHECK_IN at time:', time)
  } else if (!att.clockOut) {
    update.clockOut = time
    eventType = 'check_out'
    console.log('[biometric] Will record CHECK_OUT at time:', time)
  } else {
    // Both already set: ignore extra scans (still record event as duplicate-like)
    console.log('[biometric] Both clockIn and clockOut already exist - ignoring as duplicate')
    try {
      await BiometricEvent.create({
        deviceId: input.deviceId,
        enrollId: input.enrollId,
        staffId,
        timestamp: ts,
        date,
        time,
        type: 'ignored_duplicate',
        raw: input.raw,
      })
    } catch {}
    return { ok: true as const, mapped: true as const, ignored: true as const }
  }

  // Duplicate filtering: do NOT block a legitimate check_out right after check_in.
  // Only ignore repeats of the same computed eventType within the duplicate window.
  const windowMs = Math.max(0, Number(env.BIOMETRIC_DUPLICATE_WINDOW_SEC || 0)) * 1000
  console.log('[biometric] Duplicate window check:', { windowMs, eventType })
  
  if (windowMs > 0) {
    const since = new Date(ts.getTime() - windowMs)
    const recentSameType = await BiometricEvent.findOne({ staffId, date, type: eventType, timestamp: { $gte: since, $lte: ts } })
      .sort({ timestamp: -1 })
      .lean()
    console.log('[biometric] Recent same type check:', { found: !!recentSameType })
    if (recentSameType) {
      console.log('[biometric] Duplicate detected - ignoring')
      try {
        await BiometricEvent.create({
          deviceId: input.deviceId,
          enrollId: input.enrollId,
          staffId,
          timestamp: ts,
          date,
          time,
          type: 'ignored_duplicate',
          raw: input.raw,
        })
      } catch {}
      return { ok: true as const, mapped: true as const, ignored: true as const }
    }
  }

  console.log('[biometric] Updating attendance with:', { attendanceKey, update })
  const updateResult = await HospitalAttendance.findOneAndUpdate(attendanceKey, { $set: update }, { new: true, upsert: true })
  console.log('[biometric] Attendance update result:', { success: !!updateResult, _id: updateResult?._id })

  try {
    const eventRecord = await BiometricEvent.create({
      deviceId: input.deviceId,
      enrollId: input.enrollId,
      staffId,
      timestamp: ts,
      date,
      time,
      type: eventType,
      raw: input.raw,
    })
    console.log('[biometric] Event recorded successfully:', { eventId: eventRecord?._id, type: eventType })
  } catch (e: any) {
    console.error('[biometric] Failed to record event:', e?.message)
  }

  console.log('[biometric] Process completed:', { type: eventType, ok: true })
  return { ok: true as const, mapped: true as const, type: eventType }
}
