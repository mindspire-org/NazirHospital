import { Request, Response } from 'express'
import { LabPatient } from '../models/Patient'
import { nextGlobalMrn } from '../../../common/mrn'
import { patientFindOrCreateSchema } from '../validators/patient'

function normDigits(s?: string) { return (s || '').replace(/\D+/g, '') }

export async function getByMrn(req: Request, res: Response) {
  const mrn = String((req.query as any).mrn || '').trim()
  if (!mrn) return res.status(400).json({ message: 'Validation failed', issues: [{ path: ['mrn'], message: 'mrn is required' }] })
  const pat = await LabPatient.findOne({ mrn }).lean()
  if (!pat) return res.status(404).json({ error: 'Patient not found' })
  res.json({ patient: pat })
}
function normLower(s?: string) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' ') }


export async function findOrCreate(req: Request, res: Response) {
  const data = patientFindOrCreateSchema.parse(req.body)
  const cnicN = normDigits(data.cnic)
  const phoneN = normDigits(data.phone)
  const nameN = normLower(data.fullName)
  const fatherN = normLower(data.guardianName)

  if (data.selectId) {
    const pat = await LabPatient.findById(data.selectId).lean()
    if (!pat) return res.status(404).json({ error: 'Patient not found' })
    return res.json({ patient: pat })
  }

  if (cnicN) {
    const pat = await LabPatient.findOne({ cnicNormalized: cnicN }).lean()
    if (pat) return res.json({ patient: pat })
  }

  // If client explicitly wants to create a new patient under an existing phone,
  // allow it by skipping phone-first reuse/selection logic.
  if (data.forceCreate) {
    const mrn = await nextGlobalMrn()
    const nowIso = new Date().toISOString()
    const pat = await LabPatient.create({
      mrn,
      fullName: data.fullName,
      fatherName: data.guardianName,
      phoneNormalized: phoneN || undefined,
      cnicNormalized: cnicN || undefined,
      gender: data.gender,
      age: data.age,
      guardianRel: data.guardianRel,
      address: data.address,
      createdAtIso: nowIso,
    })
    return res.status(201).json({ patient: pat })
  }

  // Phone-first (requested behaviour):
  // - If phone exists: ALWAYS reuse an existing patient (never create a new MRN for the same phone).
  // - If multiple patients share same phone: ask for selection.
  // - Only create a new patient when phone is not found.
  if (phoneN) {
    const phoneMatches = await LabPatient.find({ phoneNormalized: phoneN }).lean()
    if (phoneMatches.length === 1) {
      const pm: any = phoneMatches[0]
      const patch: any = {}
      // Only patch CNIC for the same phone (safe). Do not overwrite name/guardian/phone.
      if (cnicN && pm.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
      if (Object.keys(patch).length) {
        const upd = await LabPatient.findByIdAndUpdate(pm._id, { $set: patch }, { new: true })
        return res.json({ patient: upd || pm })
      }
      return res.json({ patient: pm })
    }
    if (phoneMatches.length > 1) {
      const exact = phoneMatches.find(pm => normLower((pm as any).fullName) === nameN && (!fatherN || normLower((pm as any).fatherName) === fatherN))
      if (exact) return res.json({ patient: exact })
      const brief = phoneMatches.map(m => ({ _id: m._id, mrn: m.mrn, fullName: m.fullName, fatherName: (m as any).fatherName, phone: m.phoneNormalized, cnic: m.cnicNormalized }))
      return res.json({ matches: brief, needSelection: true })
    }
    // else: phone not found -> proceed to name/guardian matching and/or create new
  }

  // Exact match on name + guardian: only reuse if phone also matches (never overwrite another patient's phone)
  if (nameN && fatherN) {
    const rxName = new RegExp(`^${nameN.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
    const rxFath = new RegExp(`^${fatherN.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
    const matches = await LabPatient.find({ fullName: rxName, fatherName: rxFath }).lean()
    if (matches.length === 1) {
      const m = matches[0]
      if (phoneN && m.phoneNormalized !== phoneN) {
        // Request has a different phone: do not reuse this patient (would overwrite their phone). Create new.
      } else {
        const patch: any = {}
        if (cnicN && m.cnicNormalized !== cnicN) patch.cnicNormalized = cnicN
        if (Object.keys(patch).length) {
          const upd = await LabPatient.findByIdAndUpdate(m._id, { $set: patch }, { new: true })
          return res.json({ patient: upd || m })
        }
        return res.json({ patient: m })
      }
    } else if (matches.length > 1) {
      const byPhone = phoneN ? matches.filter(m => m.phoneNormalized === phoneN) : matches
      if (byPhone.length === 1) return res.json({ patient: byPhone[0] })
      if (byPhone.length > 1) {
        const brief = byPhone.map(m => ({ _id: m._id, mrn: m.mrn, fullName: m.fullName, fatherName: m.fatherName, phone: m.phoneNormalized, cnic: m.cnicNormalized }))
        return res.json({ matches: brief, needSelection: true })
      }
      const brief = matches.map(m => ({ _id: m._id, mrn: m.mrn, fullName: m.fullName, fatherName: m.fatherName, phone: m.phoneNormalized, cnic: m.cnicNormalized }))
      return res.json({ matches: brief, needSelection: true })
    }
  }

  const mrn = await nextGlobalMrn()
  const nowIso = new Date().toISOString()
  const pat = await LabPatient.create({
    mrn,
    fullName: data.fullName,
    fatherName: data.guardianName,
    phoneNormalized: phoneN || undefined,
    cnicNormalized: cnicN || undefined,
    gender: data.gender,
    age: data.age,
    guardianRel: data.guardianRel,
    address: data.address,
    createdAtIso: nowIso,
  })
  res.status(201).json({ patient: pat })
}

export async function search(req: Request, res: Response) {
  const phone = normDigits(String((req.query as any).phone || ''))
  const name = normLower(String((req.query as any).name || ''))
  const limit = Math.max(1, Math.min(50, Number((req.query as any).limit || 10)))
  const filter: any = {}
  if (phone) filter.phoneNormalized = new RegExp(phone)
  if (name) filter.fullName = new RegExp(name, 'i')
  if (!phone && !name) return res.json({ patients: [] })
  const pats = await LabPatient.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
  res.json({ patients: pats })
}

export async function update(req: Request, res: Response) {
  const { id } = req.params
  const body = (req.body || {}) as any
  const patch: any = {}
  if (typeof body.fullName === 'string') patch.fullName = body.fullName
  if (typeof body.fatherName === 'string') patch.fatherName = body.fatherName
  if (typeof body.gender === 'string') patch.gender = body.gender
  if (typeof body.address === 'string') patch.address = body.address
  if (typeof body.phone === 'string') patch.phoneNormalized = normDigits(body.phone)
  if (typeof body.cnic === 'string') patch.cnicNormalized = normDigits(body.cnic)
  const doc = await LabPatient.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!doc) return res.status(404).json({ error: 'Patient not found' })
  res.json({ patient: doc })
}
