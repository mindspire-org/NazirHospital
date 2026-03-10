import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalErVital } from '../models/ErVital'
import { HospitalErMedicationOrder } from '../models/ErMedicationOrder'
import { HospitalErClinicalNote } from '../models/ErClinicalNote'

async function getEREncounter(encounterId: string){
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) throw { status: 404, error: 'Encounter not found' }
  if (enc.type !== 'ER') throw { status: 400, error: 'Encounter is not ER' }
  return enc
}

function handleError(res: Response, e: any){
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

// Vitals
export async function createVital(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErVital.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ vital: row })
  }catch(e){ return handleError(res, e) }
}

export async function listVitals(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErVital.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErVital.find({ encounterId: enc._id }).sort({ recordedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ vitals: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateVital(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErVital.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Vital not found' })
    res.json({ vital: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeVital(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErVital.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Vital not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}

// Medication Orders
export async function createMedicationOrder(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErMedicationOrder.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ order: row })
  }catch(e){ return handleError(res, e) }
}

export async function listMedicationOrders(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const total = await HospitalErMedicationOrder.countDocuments({ encounterId: enc._id })
    const rows = await HospitalErMedicationOrder.find({ encounterId: enc._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ orders: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateMedicationOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErMedicationOrder.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Medication order not found' })
    res.json({ order: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeMedicationOrder(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErMedicationOrder.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Medication order not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}

// Clinical Notes
export async function createClinicalNote(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = req.body
    const row = await HospitalErClinicalNote.create({ ...data, encounterId: enc._id, patientId: enc.patientId })
    res.status(201).json({ note: row })
  }catch(e){ return handleError(res, e) }
}

export async function listClinicalNotes(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const page = Math.max(1, parseInt(String(q.page || '1')) || 1)
    const limit = Math.max(1, Math.min(200, parseInt(String(q.limit || '50')) || 50))
    const crit: any = { encounterId: enc._id }
    if (q.type) crit.type = String(q.type)
    const total = await HospitalErClinicalNote.countDocuments(crit)
    const rows = await HospitalErClinicalNote.find(crit).sort({ recordedAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
    res.json({ notes: rows, total, page, limit })
  }catch(e){ return handleError(res, e) }
}

export async function updateClinicalNote(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const data = req.body
    const row = await HospitalErClinicalNote.findByIdAndUpdate(String(id), { $set: data }, { new: true })
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ note: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeClinicalNote(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErClinicalNote.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Clinical note not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}
