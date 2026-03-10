import { Request, Response } from 'express'
import { z } from 'zod'
import { LabOrder } from '../models/Order'

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(['all','paid','receivable']).optional(),
  method: z.string().optional(),
  type: z.enum(['all','income']).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
})

function toDateStart(ymd?: string): Date | undefined {
  const s = String(ymd || '').trim()
  if (!s) return undefined
  const d = new Date(s + 'T00:00:00.000Z')
  if (isNaN(d.getTime())) return undefined
  return d
}

function toDateEnd(ymd?: string): Date | undefined {
  const s = String(ymd || '').trim()
  if (!s) return undefined
  const d = new Date(s + 'T23:59:59.999Z')
  if (isNaN(d.getTime())) return undefined
  return d
}

function money(n: any) {
  const x = Number(n || 0)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.round(x))
}

export async function list(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query)
  const qd = parsed.success ? parsed.data : {}

  const fromD = toDateStart(qd.from)
  const toD = toDateEnd(qd.to)
  const pg = Math.max(1, Number(qd.page || 1))
  const lim = Math.min(200, Math.max(1, Number(qd.limit || 50)))
  const skip = (pg - 1) * lim

  const match: any = {}
  // Corporate-billed Lab orders are tracked in Corporate module.
  // However, if a co-pay is collected (stored as net > 0 on the LabOrder),
  // it should appear in Lab finance. We include:
  // - Non-corporate orders
  // - Corporate orders only when net > 0 (co-pay income)
  match.$or = [
    { corporateId: { $exists: false } },
    { corporateId: { $exists: true }, net: { $gt: 0 } },
  ]
  if (fromD || toD) {
    match.createdAt = {}
    if (fromD) match.createdAt.$gte = fromD
    if (toD) match.createdAt.$lte = toD
  }

  if (qd.q && String(qd.q).trim()) {
    const s = String(qd.q).trim()
    match.$and = Array.isArray(match.$and) ? match.$and : []
    match.$and.push({
      $or: [
        { tokenNo: { $regex: s, $options: 'i' } },
        { 'patient.fullName': { $regex: s, $options: 'i' } },
        { 'patient.mrn': { $regex: s, $options: 'i' } },
        { 'patient.phone': { $regex: s, $options: 'i' } },
      ],
    })
  }

  if (qd.status === 'paid') {
    match.receivableAmount = { $lte: 0 }
  } else if (qd.status === 'receivable') {
    match.receivableAmount = { $gt: 0 }
  }

  const method = String(qd.method || '').trim()

  const pipeline: any[] = [
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $addFields: { performedBy: { $ifNull: ['$createdByUsername', ''] } } },
    {
      $group: {
        _id: '$tokenNo',
        createdAt: { $first: '$createdAt' },
        patient: { $first: '$patient' },
        referringConsultant: { $first: '$referringConsultant' },
        performedBy: { $first: '$performedBy' },
        net: { $sum: '$net' },
        receivedAmount: { $first: '$receivedAmount' },
        receivableAmount: { $first: '$receivableAmount' },
        payments: { $push: '$payments' },
        tests: { $push: '$tests' },
        testsCount: { $sum: { $size: '$tests' } },
      },
    },
    {
      $addFields: {
        paymentsFlat: {
          $reduce: {
            input: '$payments',
            initialValue: [],
            in: { $concatArrays: ['$$value', { $ifNull: ['$$this', []] }] },
          },
        },
        testsFlat: {
          $reduce: {
            input: '$tests',
            initialValue: [],
            in: { $concatArrays: ['$$value', { $ifNull: ['$$this', []] }] },
          },
        },
      },
    },
  ]

  if (method) {
    pipeline.push({ $match: { paymentsFlat: { $elemMatch: { method } } } })
  }

  pipeline.push(
    {
      $project: {
        _id: 0,
        tokenNo: '$_id',
        createdAt: 1,
        patient: 1,
        referringConsultant: 1,
        performedBy: 1,
        status: 1,
        net: 1,
        receivedAmount: 1,
        receivableAmount: 1,
        payments: '$paymentsFlat',
        tests: '$testsFlat',
        testsCount: 1,
      },
    },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: lim }],
        total: [{ $count: 'count' }],
        summary: [
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$net' },
              amountReceived: { $sum: '$receivedAmount' },
              receivableAmount: { $sum: '$receivableAmount' },
              tokens: { $sum: 1 },
              pendingReceivablesCount: {
                $sum: {
                  $cond: [{ $gt: ['$receivableAmount', 0] }, 1, 0],
                },
              },
            },
          },
          { $project: { _id: 0 } },
        ],
        methodBreakdown: [
          { $unwind: { path: '$payments', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ['$payments.method', 'unknown'] },
              amount: { $sum: { $ifNull: ['$payments.amount', 0] } },
            },
          },
          { $project: { _id: 0, method: '$_id', amount: 1 } },
          { $sort: { amount: -1 } },
        ],
      },
    }
  )

  const out = await LabOrder.aggregate(pipeline)
  const first = (out && out[0]) || {}
  const total = Number(first?.total?.[0]?.count || 0)

  const items = Array.isArray(first?.items) ? first.items : []
  const normalized = items.map((t: any) => {
    const payments = Array.isArray(t.payments) ? t.payments : []
    const lastPayment = payments
      .slice()
      .sort((a: any, b: any) => String(b?.at || '').localeCompare(String(a?.at || '')))[0]

    const method = String(lastPayment?.method || payments[0]?.method || '').trim() || undefined

    const tests = Array.isArray(t.tests) ? t.tests : []
    const testsCount = tests.length

    return {
      tokenNo: String(t.tokenNo || ''),
      createdAt: t.createdAt,
      patient: t.patient,
      referringConsultant: t.referringConsultant,
      performedBy: String(t.performedBy || '').trim() || undefined,
      status: t.receivableAmount > 0 ? 'receivable' : 'paid',
      method,
      net: money(t.net),
      receivedAmount: money(t.receivedAmount),
      receivableAmount: money(t.receivableAmount),
      testsCount,
    }
  })

  const summary = first?.summary?.[0] || { totalIncome: 0, amountReceived: 0, receivableAmount: 0, tokens: 0, pendingReceivablesCount: 0 }
  const methodBreakdown = Array.isArray(first?.methodBreakdown) ? first.methodBreakdown : []

  res.json({
    page: pg,
    limit: lim,
    total,
    totalPages: Math.max(1, Math.ceil(total / lim)),
    summary: {
      totalIncome: money(summary.totalIncome),
      amountReceived: money(summary.amountReceived),
      receivableAmount: money(summary.receivableAmount),
      tokens: Number(summary.tokens || 0),
      pendingReceivablesCount: Number(summary.pendingReceivablesCount || 0),
    },
    methodBreakdown: methodBreakdown.map((m: any) => ({ method: String(m.method || 'unknown'), amount: money(m.amount) })),
    items: normalized,
  })
}
