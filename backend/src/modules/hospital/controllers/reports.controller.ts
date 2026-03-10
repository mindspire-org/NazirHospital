import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { HospitalUser } from '../models/User'
import { HospitalShift } from '../models/Shift'
import { HospitalToken } from '../models/Token'
import { HospitalErPayment } from '../models/ErPayment'
import { HospitalIpdPayment } from '../models/IpdPayment'
import { HospitalExpense } from '../models/Expense'
import { HospitalIpdBillingItem } from '../models/IpdBillingItem'
import { FinanceJournal } from '../models/FinanceJournal'
import { HospitalDoctor } from '../models/Doctor'
import { HospitalEncounter } from '../models/Encounter'
import { LabPatient } from '../../lab/models/Patient'

function toMin(hhmm: string){
  const [h,m] = String(hhmm || '').split(':').map(x => parseInt(x, 10) || 0)
  return h * 60 + m
}

function shiftWindowForDate(shift: any, baseDateIso: string){
  const startMin = toMin(String(shift?.start || '00:00'))
  const endMin = toMin(String(shift?.end || '00:00'))

  const start = new Date(`${baseDateIso}T00:00:00.000`)
  start.setMinutes(start.getMinutes() + startMin)

  let end = new Date(`${baseDateIso}T00:00:00.000`)
  end.setMinutes(end.getMinutes() + endMin)

  // Overnight shift
  if (endMin <= startMin){
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  }

  return { start, end }
}

function jsonError(res: Response, status: number, message: string){
  return res.status(status).json({ error: message })
}

export async function myActivity(req: Request, res: Response){
  const mode = String((req.query as any)?.mode || 'today') as 'today'|'shift'

  const username = String((req as any).user?.username || '').trim().toLowerCase()
  const userId = String((req as any).user?._id || (req as any).user?.id || '').trim()
  if (!username && !userId) return jsonError(res, 401, 'Unauthorized')

  const todayIso = new Date().toISOString().slice(0,10)

  let rangeStart = new Date(`${todayIso}T00:00:00.000`)
  let rangeEnd = new Date(`${todayIso}T23:59:59.999`)
  let shiftMeta: any = undefined

  if (mode === 'shift'){
    const u: any = userId
      ? await HospitalUser.findById(userId).select('shiftId username').lean()
      : await HospitalUser.findOne({ username }).select('shiftId username').lean()

    if (!u) return jsonError(res, 404, 'User not found')
    if (!u.shiftId) return jsonError(res, 400, 'Shift not assigned')

    const shift: any = await HospitalShift.findById(String(u.shiftId)).lean()
    if (!shift) return jsonError(res, 404, 'Shift not found')

    const w = shiftWindowForDate(shift, todayIso)
    rangeStart = w.start
    rangeEnd = w.end
    shiftMeta = { id: String(shift._id), name: shift.name, start: shift.start, end: shift.end }
  }

  const rangeStartIso = rangeStart.toISOString()
  const rangeEndIso = rangeEnd.toISOString()

  const performedBy = username || undefined
  if (!performedBy) return jsonError(res, 400, 'Username missing in token')

  const [tokens, expenses, payoutJournals, erJournals, ipdJournals] = await Promise.all([
    HospitalToken.find({
      createdByUsername: performedBy,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    })
      .select('dateIso tokenNo fee discount status corporateId createdAt patientName mrn createdByUsername')
      .sort({ createdAt: -1 })
      .lean(),

    HospitalExpense.find({
      createdBy: { $regex: new RegExp(`^${performedBy}$`, 'i') },
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    })
      .select('dateIso amount method ref note category createdAt createdBy')
      .sort({ createdAt: -1 })
      .lean(),

    FinanceJournal.find({
      refType: 'doctor_payout',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      'lines.tags.createdByUsername': performedBy,
    }).select('dateIso memo lines createdAt').sort({ createdAt: -1 }).lean(),

    FinanceJournal.find({
      refType: 'er_billing',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      'lines.tags.createdByUsername': performedBy,
    }).select('refId dateIso memo lines createdAt').sort({ createdAt: -1 }).lean(),

    FinanceJournal.find({
      refType: 'ipd_payment',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
      'lines.tags.createdByUsername': performedBy,
    }).select('refId dateIso memo lines createdAt').sort({ createdAt: -1 }).lean(),
  ])

  const erPaymentIds = Array.from(new Set((erJournals || []).map((j: any) => String(j.refId || '')).filter(Boolean)))
  const ipdPaymentIds = Array.from(new Set((ipdJournals || []).map((j: any) => String(j.refId || '')).filter(Boolean)))

  // Convert string IDs to ObjectIds for MongoDB queries
  const toObjectIds = (ids: string[]) => ids.map(id => {
    try { return new Types.ObjectId(id) } catch { return null }
  }).filter(Boolean) as Types.ObjectId[]

  const [erPayments, ipdPaymentsRaw] = await Promise.all([
    erPaymentIds.length
      ? HospitalErPayment.find({ _id: { $in: toObjectIds(erPaymentIds) } })
          .select('amount method refNo receivedAt createdAt receivedBy notes')
          .sort({ receivedAt: -1 })
          .lean()
      : Promise.resolve([] as any[]),
    ipdPaymentIds.length
      ? HospitalIpdPayment.find({ _id: { $in: toObjectIds(ipdPaymentIds) } })
          .select('amount method refNo receivedAt createdAt receivedBy notes encounterId patientId')
          .sort({ receivedAt: -1 })
          .lean()
      : Promise.resolve([] as any[]),
  ])

  // Calculate pending amounts for IPD payments
  const ipdEncounterIds = Array.from(new Set((ipdPaymentsRaw || []).map((p: any) => String(p.encounterId || '')).filter(Boolean)))
  const ipdBillingItems = ipdEncounterIds.length
    ? await HospitalIpdBillingItem.find({ encounterId: { $in: toObjectIds(ipdEncounterIds) } }).select('encounterId amount').lean()
    : []
  const ipdAllPayments = ipdEncounterIds.length
    ? await HospitalIpdPayment.find({ encounterId: { $in: toObjectIds(ipdEncounterIds) } }).select('encounterId amount').lean()
    : []

  // Calculate totals per encounter
  const chargesByEncounter: Record<string, number> = {}
  const paidByEncounter: Record<string, number> = {}
  for (const item of ipdBillingItems) {
    const id = String(item.encounterId || '')
    if (id) chargesByEncounter[id] = (chargesByEncounter[id] || 0) + Number(item.amount || 0)
  }
  for (const pay of ipdAllPayments) {
    const id = String(pay.encounterId || '')
    if (id) paidByEncounter[id] = (paidByEncounter[id] || 0) + Number(pay.amount || 0)
  }

  // Fetch encounters for IPD payments to get admission info
  const encounters = ipdEncounterIds.length
    ? await HospitalEncounter.find({ _id: { $in: toObjectIds(ipdEncounterIds) } }).select('_id admissionNo patientId').lean()
    : []
  const encounterMap = new Map(encounters.map((e: any) => [String(e._id), e]))

  // Fetch patients directly from payment patientIds
  const paymentPatientIds = Array.from(new Set((ipdPaymentsRaw || []).map((p: any) => String(p.patientId)).filter(Boolean)))
  const patients = paymentPatientIds.length
    ? await LabPatient.find({ _id: { $in: toObjectIds(paymentPatientIds) } }).select('_id fullName mrn').lean()
    : []
  const patientMap = new Map(patients.map((p: any) => [String(p._id), p]))

  const ipdPayments = (ipdPaymentsRaw || []).map((p: any) => {
    const encId = String(p.encounterId || '')
    const totalCharges = chargesByEncounter[encId] || 0
    const totalPaid = paidByEncounter[encId] || 0
    const pending = Math.max(0, totalCharges - totalPaid)
    const encounter = encounterMap.get(encId)
    const patient = patientMap.get(String(p.patientId))
    return {
      ...p,
      pendingAmount: pending,
      performedBy: performedBy,
      admissionNo: encounter?.admissionNo || '-',
      mrn: patient?.mrn || '-',
      patientName: patient?.fullName || '-',
    }
  })

  const tokenCashRows = tokens.filter((t: any) => !t.corporateId && String(t.status || '') !== 'returned')
  const tokenRevenue = tokenCashRows.reduce((s: number, t: any) => s + Number(t.fee || 0), 0)
  const tokenDiscount = tokenCashRows.reduce((s: number, t: any) => s + Number(t.discount || 0), 0)

  const erTotal = (erPayments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const ipdTotal = (ipdPayments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  const expenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  // Get unique doctor IDs from payout journals
  const doctorIds = Array.from(new Set((payoutJournals || []).map((j: any) => {
    const tags = (j.lines || []).find((l: any) => l?.tags)?.tags || {}
    return String(tags.doctorId || j.refId || '')
  }).filter(Boolean)))

  // Fetch doctor names
  const doctors = doctorIds.length
    ? await HospitalDoctor.find({ _id: { $in: doctorIds } }).select('_id name').lean()
    : []
  const doctorMap = new Map(doctors.map((d: any) => [String(d._id), d.name]))

  const payouts = payoutJournals.map((j: any) => {
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + Number(l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + Number(l.debit || 0), 0)
    const tags = (j.lines || []).find((l: any) => l?.tags)?.tags || {}
    const docId = String(tags.doctorId || j.refId || '')
    return {
      id: String(j._id),
      dateIso: j.dateIso,
      amount,
      memo: j.memo,
      createdAt: j.createdAt,
      createdByUsername: (j.lines || []).find((l: any) => l?.tags?.createdByUsername)?.tags?.createdByUsername,
      doctorId: docId,
      doctorName: tags.doctorName || doctorMap.get(docId) || '-',
      method: tags.method || ((j.lines || []).find((l: any) => l.account === 'CASH') ? 'Cash' : ((j.lines || []).find((l: any) => l.account === 'BANK') ? 'Bank' : '-')),
      refNo: j.refNo || j.memo,
    }
  })

  const payoutTotal = payouts.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)

  const inflowTotal = tokenRevenue + erTotal + ipdTotal
  const outflowTotal = expenseTotal + payoutTotal
  const net = inflowTotal - outflowTotal

  res.json({
    mode,
    user: { username: performedBy },
    shift: shiftMeta,
    range: { start: rangeStartIso, end: rangeEndIso },
    summary: {
      tokens: { count: tokens.length, revenue: tokenRevenue, discount: tokenDiscount },
      erPayments: { count: erPayments.length, total: erTotal },
      ipdPayments: { count: ipdPayments.length, total: ipdTotal },
      expenses: { count: expenses.length, total: expenseTotal },
      doctorPayouts: { count: payouts.length, total: payoutTotal },
      inflowTotal,
      outflowTotal,
      net,
    },
    items: {
      tokens,
      erPayments: erPayments || [],
      ipdPayments: ipdPayments || [],
      expenses,
      doctorPayouts: payouts,
    }
  })
}
