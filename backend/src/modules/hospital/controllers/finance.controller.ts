import { Request, Response } from 'express'
import { z } from 'zod'
import { FinanceJournal } from '../models/FinanceJournal'
import { createDoctorPayout, manualDoctorEarning, computeDoctorBalance, reverseJournalById } from './finance_ledger'
import { HospitalCashSession } from '../models/CashSession'

const manualDoctorEarningSchema = z.object({
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  amount: z.number().positive(),
  revenueAccount: z.enum(['OPD_REVENUE','PROCEDURE_REVENUE','IPD_REVENUE']).optional(),
  paidMethod: z.enum(['Cash','Bank','AR']).optional(),
  memo: z.string().optional(),
  sharePercent: z.number().min(0).max(100).optional(),
  patientName: z.string().optional(),
  mrn: z.string().optional(),
})

const doctorPayoutSchema = z.object({
  doctorId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['Cash','Bank']).default('Cash'),
  memo: z.string().optional(),
})

export async function postManualDoctorEarning(req: Request, res: Response){
  const data = manualDoctorEarningSchema.parse(req.body)
  const j = await manualDoctorEarning(data)
  res.status(201).json({ journal: j })
}

export async function reverseJournal(req: Request, res: Response){
  const id = String(req.params.id)
  const memo = String((req.body as any)?.memo || '')
  const r = await reverseJournalById(id, memo)
  if (!r) return res.status(404).json({ error: 'Journal not found' })
  res.json({ reversed: r })
}

export async function listDoctorEarnings(req: Request, res: Response){
  const doctorId = (req.query as any)?.doctorId ? String((req.query as any).doctorId) : undefined
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  const M = require('mongoose')
  const matchDate = (from && to) ? { dateIso: { $gte: from, $lte: to } } : {}
  const matchDoctor = doctorId ? { 'lines.tags.doctorId': new M.Types.ObjectId(doctorId) } : {}
  const rows = await FinanceJournal.aggregate([
    { $match: { ...matchDate, refType: { $in: ['opd_token','manual_doctor_earning'] } } },
    { $addFields: { allLines: '$lines' } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', ...(doctorId? matchDoctor : {}) } },
    { $lookup: {
        from: 'hospital_finance_journals',
        let: { origId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$refId', { $toString: '$$origId' }] } } },
        ],
        as: 'reversals'
      }
    },
    { $addFields: { _revCount: { $size: '$reversals' } } },
    { $match: { _revCount: { $eq: 0 } } },
    { $addFields: { _tidStr: { $toString: '$lines.tags.tokenId' } } },
    { $lookup: {
        from: 'hospital_finance_journals',
        let: { tidStr: '$_tidStr' },
        pipeline: [
          { $match: { $expr: { $and: [ { $eq: ['$refType','opd_token_reversal'] }, { $eq: ['$refId','$$tidStr'] } ] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'revForToken'
      }
    },
    { $addFields: { _lastRev: { $arrayElemAt: ['$revForToken', 0] } } },
    { $addFields: { _keep: { $or: [ { $eq: ['$_lastRev', null] }, { $gt: ['$createdAt', '$_lastRev.createdAt'] } ] } } },
    { $match: { _keep: { $eq: true } } },
    { $lookup: {
        from: 'hospital_tokens',
        let: { tidStr: '$_tidStr' },
        pipeline: [
          { $match: { $expr: { $eq: [ { $toString: '$_id' }, '$$tidStr' ] } } },
          { $project: { patientName: 1, mrn: 1, tokenNo: 1, fee: 1, discount: 1 } }
        ],
        as: 'tok'
      }
    },
    { $addFields: { token: { $arrayElemAt: ['$tok', 0] } } },
    { $addFields: {
        revenueLine: {
          $arrayElemAt: [
            { $filter: { input: '$allLines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE','IPD_REVENUE','PROCEDURE_REVENUE']] } } },
            0
          ]
        }
      }
    },
    { $project: { 
        _id: 1, dateIso: 1, refType: 1, refId: 1, memo: 1, line: '$lines', revenueAccount: '$revenueLine.account',
        patientName: { $ifNull: ['$token.patientName', '$lines.tags.patientName'] },
        mrn: { $ifNull: ['$token.mrn', '$lines.tags.mrn'] },
        tokenNo: '$token.tokenNo',
        fee: '$token.fee',
        discount: '$token.discount'
      } 
    },
    { $sort: { dateIso: -1, _id: -1 } },
    { $limit: 500 },
  ])
  const items = rows.map((r: any) => {
    const doctorAmount = Number(r.line?.credit || 0)
    const isOpd = r.refType === 'opd_token'
    const fee = Number(r?.fee ?? 0)
    const discount = Number(r?.discount ?? 0)
    const gross = (Number.isFinite(fee) ? fee : 0) + (Number.isFinite(discount) ? discount : 0)
    const sharePercent = (isOpd && fee > 0) ? ((doctorAmount / fee) * 100) : null
    return ({
      id: String(r._id),
      dateIso: r.dateIso,
      doctorId: r.line?.tags?.doctorId ? String(r.line.tags.doctorId) : undefined,
      departmentId: r.line?.tags?.departmentId ? String(r.line.tags.departmentId) : undefined,
      tokenId: r.line?.tags?.tokenId ? String(r.line.tags.tokenId) : undefined,
      type: r.refType === 'opd_token' ? 'OPD' : (r.revenueAccount === 'PROCEDURE_REVENUE' ? 'Procedure' : (r.revenueAccount === 'IPD_REVENUE' ? 'IPD' : 'OPD')),
      amount: doctorAmount,
      memo: r.memo,
      patientName: r.patientName,
      mrn: r.mrn,
      tokenNo: r.tokenNo,
      fee: Number.isFinite(fee) ? fee : undefined,
      discount: Number.isFinite(discount) ? discount : undefined,
      gross: Number.isFinite(gross) ? gross : undefined,
      sharePercent: sharePercent != null ? sharePercent : null,
    })
  })
  res.json({ earnings: items })
}

export async function postDoctorPayout(req: Request, res: Response){
  const data = doctorPayoutSchema.parse(req.body)
  let sessionId: string | undefined = undefined
  try{
    if (data.method === 'Cash'){
      const userId = String((req as any).user?._id || (req as any).user?.id || (req as any).user?.email || '')
      if (userId){
        const sess: any = await HospitalCashSession.findOne({ status: 'open', userId }).sort({ createdAt: -1 }).lean()
        if (sess) sessionId = String(sess._id)
      }
    }
  } catch {}
  const j: any = await createDoctorPayout(data.doctorId, data.amount, data.method, data.memo, sessionId)
  // Best-effort tagging of createdBy for reporting
  try {
    const createdByUserId = String((req as any).user?._id || (req as any).user?.id || '')
    const createdByUsername = String((req as any).user?.username || '')
    if (j?._id && (createdByUserId || createdByUsername)){
      const tagsPatch: any = {}
      if (createdByUserId) tagsPatch['lines.$[].tags.createdByUserId'] = createdByUserId
      if (createdByUsername) tagsPatch['lines.$[].tags.createdByUsername'] = createdByUsername
      // Use updateOne with $set on array elements (Mongo supports $[])
      await FinanceJournal.updateOne({ _id: j._id }, { $set: tagsPatch })
    }
  } catch {}
  res.status(201).json({ journal: j })
}

export async function getDoctorBalance(req: Request, res: Response){
  const id = String(req.params.id)
  const balance = await computeDoctorBalance(id)
  res.json({ doctorId: id, payable: balance })
}

export async function listDoctorPayouts(req: Request, res: Response){
  const id = String(req.params.id)
  const limit = Math.min(parseInt(String((req.query as any)?.limit || '20')) || 20, 100)
  const rows = await FinanceJournal.find({ refType: 'doctor_payout', refId: id }).sort({ createdAt: -1 }).limit(limit).lean()
  const items = rows.map((j: any) => {
    const createdByUsername = (j.lines || []).find((l: any) => l?.tags?.createdByUsername)?.tags?.createdByUsername
    const createdByUserId = (j.lines || []).find((l: any) => l?.tags?.createdByUserId)?.tags?.createdByUserId
    const cash = (j.lines || [])
      .filter((l: any) => l.account === 'CASH' || l.account === 'BANK')
      .reduce((s: number, l: any) => s + (l.credit || 0), 0)
    const amount = cash || (j.lines || [])
      .filter((l: any) => l.account === 'DOCTOR_PAYABLE')
      .reduce((s: number, l: any) => s + (l.debit || 0), 0)
    return { id: String(j._id), refId: j.refId, dateIso: j.dateIso, memo: j.memo, amount, createdByUsername, createdByUserId }
  })
  res.json({ payouts: items })
}

export async function listAllTransactions(req: Request, res: Response){
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  const type = String((req.query as any)?.type || 'All')
  const method = String((req.query as any)?.method || '')
  const q = String((req.query as any)?.q || '')
  const page = Math.max(1, parseInt(String((req.query as any)?.page || '1')))
  const limit = Math.min(200, Math.max(1, parseInt(String((req.query as any)?.limit || '50'))))
  const skip = (page - 1) * limit

  const M = require('mongoose')
  const matchStage: any = {}
  
  if (from && to) {
    matchStage.dateIso = { $gte: from, $lte: to }
  } else if (from) {
    matchStage.dateIso = { $gte: from }
  } else if (to) {
    matchStage.dateIso = { $lte: to }
  }

  // Type filter
  if (type !== 'All') {
    const refTypeMap: any = {
      'OPD': 'opd_token',
      'IPD': 'ipd_billing',
      'ER': 'er_billing',
      'Expense': 'expense',
      'Doctor Payout': 'doctor_payout',
      'Manual Earning': 'manual_doctor_earning',
      'Token Return': 'opd_token_reversal',
    }
    if (refTypeMap[type]) {
      matchStage.refType = refTypeMap[type]
    }
  }

  // Method filter - look in lines.tags.method or derive from accounts
  const pipeline: any[] = [{ $match: matchStage }]

  // Add computed fields for easier filtering/sorting
  pipeline.push({
    $addFields: {
      // Compute total amount (revenue side) - look for credit in CASH/BANK lines as that's the received amount
      totalAmount: {
        $sum: {
          $map: {
            input: '$lines',
            as: 'line',
            in: { $cond: [{ $in: ['$$line.account', ['CASH', 'BANK']] }, '$$line.credit', 0] }
          }
        }
      },
      // Extract fee from revenue lines. For normal sales journals, revenue is recorded as CREDIT.
      // For reversal journals, the revenue line will be a DEBIT.
      feeFromRevenueCredit: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE', 'IPD_REVENUE', 'ER_REVENUE', 'PROCEDURE_REVENUE']] } } },
          0
        ]
      },
      feeFromRevenueDebit: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $in: ['$$l.account', ['OPD_REVENUE', 'IPD_REVENUE', 'ER_REVENUE', 'PROCEDURE_REVENUE']] } } },
          0
        ]
      },
      // Extract discount from DISCOUNT line
      discountLine: {
        $arrayElemAt: [
          { $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'DISCOUNT'] } } },
          0
        ]
      },
      // Determine if cash or bank from lines
      paymentMethod: {
        $let: {
          vars: {
            cashLine: { $arrayElemAt: [{ $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'CASH'] } } }, 0] },
            bankLine: { $arrayElemAt: [{ $filter: { input: '$lines', as: 'l', cond: { $eq: ['$$l.account', 'BANK'] } } }, 0] },
          },
          in: {
            $cond: [
              { $gt: ['$$cashLine.credit', 0] },
              'cash',
              { $cond: [{ $gt: ['$$bankLine.credit', 0] }, 'bank', 'other'] }
            ]
          }
        }
      },
      // Extract patient info from tags - try multiple locations
      patientName: { 
        $ifNull: [
          { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.patientName', null] } } }, as: 'x', in: '$$x.tags.patientName' } }, 0] },
          { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.patientName', null] } } }, as: 'x', in: '$$x.tags.patientName' } }, 0] }
        ]
      },
      mrn: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.mrn', null] } } }, as: 'x', in: '$$x.tags.mrn' } }, 0] },
      doctorId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.doctorId', null] } } }, as: 'x', in: '$$x.tags.doctorId' } }, 0] },
      departmentId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.departmentId', null] } } }, as: 'x', in: '$$x.tags.departmentId' } }, 0] },
      tokenId: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.tokenId', null] } } }, as: 'x', in: '$$x.tags.tokenId' } }, 0] },
      tokenNoFromTags: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.tokenNo', null] } } }, as: 'x', in: '$$x.tags.tokenNo' } }, 0] },
      createdByUsername: { $arrayElemAt: [{ $map: { input: { $filter: { input: '$lines', as: 'l', cond: { $ne: ['$$l.tags.createdByUsername', null] } } }, as: 'x', in: '$$x.tags.createdByUsername' } }, 0] },
    }
  })

  // Method filter in pipeline
  if (method && method !== 'all') {
    pipeline.push({
      $match: {
        $or: [
          { paymentMethod: method },
          { 'lines.tags.method': method }
        ]
      }
    })
  }

  // Text search filter
  if (q) {
    const qLower = q.toLowerCase()
    pipeline.push({
      $match: {
        $or: [
          { memo: { $regex: q, $options: 'i' } },
          { patientName: { $regex: q, $options: 'i' } },
          { mrn: { $regex: q, $options: 'i' } },
          { refId: { $regex: q, $options: 'i' } }
        ]
      }
    })
  }

  // Lookup for doctor name
  pipeline.push({
    $lookup: {
      from: 'hospital_doctors',
      let: { docId: '$doctorId' },
      pipeline: [{ $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$docId' }] } } }, { $project: { name: 1 } }],
      as: 'doctor'
    }
  })

  // Lookup for department name
  pipeline.push({
    $lookup: {
      from: 'hospital_departments',
      let: { depId: '$departmentId' },
      pipeline: [{ $match: { $expr: { $eq: ['$_id', { $toObjectId: '$$depId' }] } } }, { $project: { name: 1 } }],
      as: 'department'
    }
  })

  // Lookup for token to get fee/discount info
  pipeline.push({
    $lookup: {
      from: 'hospital_tokens',
      let: { tid: '$tokenId' },
      pipeline: [
        { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$tid'] } } },
        { $project: { fee: 1, discount: 1, status: 1, tokenNo: 1 } }
      ],
      as: 'token'
    }
  })

  // Count total
  const countPipeline = [...pipeline, { $count: 'total' }]
  const countResult = await FinanceJournal.aggregate(countPipeline)
  const total = countResult[0]?.total || 0

  // Add pagination and final projection
  pipeline.push(
    { $sort: { dateIso: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        id: { $toString: '$_id' },
        dateIso: 1,
        createdAt: 1,
        refType: 1,
        refId: 1,
        memo: 1,
        totalAmount: 1,
        paymentMethod: 1,
        patientName: 1,
        mrn: 1,
        doctorId: 1,
        doctorName: { $arrayElemAt: ['$doctor.name', 0] },
        departmentId: 1,
        departmentName: { $arrayElemAt: ['$department.name', 0] },
        tokenId: 1,
        token: { $arrayElemAt: ['$token', 0] },
        tokenNoFromTags: 1,
        createdByUsername: 1,
        // Extract fee from revenue line (credit for normal, debit for reversals)
        fee: {
          $ifNull: [
            '$feeFromRevenueCredit.credit',
            { $ifNull: ['$feeFromRevenueDebit.debit', '$totalAmount'] }
          ]
        },
        // Extract discount
        discount: { $ifNull: ['$discountLine.debit', 0] },
        type: {
          $switch: {
            branches: [
              { case: { $eq: ['$refType', 'opd_token'] }, then: 'OPD' },
              { case: { $eq: ['$refType', 'opd_token_reversal'] }, then: 'Token Return' },
              { case: { $eq: ['$refType', 'ipd_billing'] }, then: 'IPD' },
              { case: { $eq: ['$refType', 'er_billing'] }, then: 'ER' },
              { case: { $eq: ['$refType', 'expense'] }, then: 'Expense' },
              { case: { $eq: ['$refType', 'doctor_payout'] }, then: 'Doctor Payout' },
              { case: { $eq: ['$refType', 'manual_doctor_earning'] }, then: 'Manual Earning' },
            ],
            default: 'Other'
          }
        },
        status: { $ifNull: ['$token.status', { $cond: [{ $eq: ['$refType', 'expense'] }, 'completed', 'completed'] }] },
        isReturned: { $eq: ['$token.status', 'returned'] },
      }
    }
  )

  const rows = await FinanceJournal.aggregate(pipeline)
  
  // Post-process to calculate final fields
  const items = rows.map((r: any) => ({
    ...r,
    // Use token fee if available (from token lookup), otherwise use fee from revenue line
    fee: r.token?.fee || r.fee || 0,
    tokenDiscount: r.token?.discount || r.discount || 0,
    // Use tokenNo from token lookup, or from tags, or extract from memo
    tokenNo: r.token?.tokenNo || r.tokenNoFromTags || (r.memo?.match(/#(\d+)/)?.[1]),
    // Determine if token was returned
    isReturned: r.refType === 'opd_token_reversal' || r.token?.status === 'returned' || r.isReturned,
    // Calculate net (after discount if applicable)
    netAmount: (r.token?.fee || r.fee || 0) - (r.token?.discount || r.discount || 0),
    // Ensure status is a string
    status: r.token?.status || (r.refType === 'opd_token_reversal' ? 'returned' : 'completed'),
    // Pass through createdByUsername
    createdByUsername: r.createdByUsername,
  }))

  res.json({
    transactions: items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalRevenue: items.filter((x: any) => ['OPD', 'IPD', 'ER'].includes(x.type)).reduce((s: number, x: any) => s + (x.fee || 0), 0),
      totalDiscount: items.reduce((s: number, x: any) => s + (x.tokenDiscount || 0), 0),
      totalExpenses: items.filter((x: any) => x.type === 'Expense').reduce((s: number, x: any) => s + (x.totalAmount || 0), 0),
      netIncome: 0, // calculated below
    }
  })
}

export async function doctorAccruals(req: Request, res: Response){
  const id = String(req.params.id)
  const from = String((req.query as any)?.from || '')
  const to = String((req.query as any)?.to || '')
  if (!from || !to) return res.status(400).json({ error: 'from and to (YYYY-MM-DD) required' })
  const rows = await FinanceJournal.aggregate([
    { $match: { dateIso: { $gte: from, $lte: to } } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': 'DOCTOR_PAYABLE', 'lines.tags.doctorId': { $exists: true } } },
    { $group: {
      _id: '$lines.tags.doctorId',
      accruals: { $sum: { $ifNull: ['$lines.credit', 0] } },
      debits: { $sum: { $ifNull: ['$lines.debit', 0] } },
    }},
    { $project: { _id: 0, accruals: 1, debits: 1 } }
  ])
  const accruals = Number(rows?.[0]?.accruals || 0)
  const debits = Number(rows?.[0]?.debits || 0)
  const suggested = Math.max(accruals - debits, 0)
  res.json({ doctorId: id, from, to, accruals, debits, suggested })
}

// Get company-wise Accounts Receivable breakdown
export async function getCorporateARBreakdown(req: Request, res: Response){
  try {
    const from = String((req.query as any)?.from || '')
    const to = String((req.query as any)?.to || '')
    
    // Aggregate all CORPORATE_AR lines grouped by company
    const pipeline: any[] = [
      { $unwind: '$lines' },
      { $match: { 'lines.account': 'CORPORATE_AR', 'lines.tags.corporateId': { $exists: true } } },
      { $group: {
        _id: '$lines.tags.corporateId',
        totalDebit: { $sum: { $ifNull: ['$lines.debit', 0] } },
        totalCredit: { $sum: { $ifNull: ['$lines.credit', 0] } },
      }},
      { $project: { 
        _id: 0, 
        companyId: '$_id', 
        balance: { $subtract: ['$totalDebit', '$totalCredit'] }
      }},
      { $match: { balance: { $gt: 0 } } },
      { $sort: { balance: -1 } }
    ]
    
    // Add date filter if provided
    if (from && to) {
      pipeline.unshift({ $match: { dateIso: { $gte: from, $lte: to } } })
    }
    
    const rows = await FinanceJournal.aggregate(pipeline)
    
    // Get company names
    const M = require('mongoose')
    const companyIds = rows.map((r: any) => r.companyId).filter(Boolean)
    let companies: any[] = []
    if (companyIds.length > 0) {
      try {
        const { CorporateCompany } = await import('../../corporate/models/Company')
        companies = await CorporateCompany.find({ 
          _id: { $in: companyIds.map((id: string) => new M.Types.ObjectId(id)) } 
        }).select('_id name').lean()
      } catch {}
    }
    
    const companyMap: Record<string, string> = {}
    for (const c of companies) companyMap[String(c._id)] = c.name
    
    const items = rows.map((r: any) => ({
      companyId: r.companyId,
      companyName: companyMap[r.companyId] || 'Unknown Company',
      balance: Math.max(0, r.balance)
    })).filter((r: any) => r.balance > 0)
    
    const totalAR = items.reduce((s: number, r: any) => s + r.balance, 0)
    
    res.json({ items, totalAR, count: items.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch AR breakdown' })
  }
}
