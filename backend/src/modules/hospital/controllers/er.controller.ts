import { Request, Response } from 'express'
import { HospitalEncounter } from '../models/Encounter'
import { HospitalErCharge } from '../models/ErCharge'
import { createErChargeSchema } from '../validators/er'

async function getEREncounter(encounterId: string){
  const enc = await HospitalEncounter.findById(encounterId)
  if (!enc) throw { status: 404, error: 'Encounter not found' }
  if (String((enc as any).type) !== 'ER') throw { status: 400, error: 'Encounter is not ER' }
  return enc
}

function handleError(res: Response, e: any){
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

export async function listCharges(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const q = req.query as any
    const limit = Math.max(1, Math.min(500, parseInt(String(q.limit || '200')) || 200))
    const rows = await HospitalErCharge.find({ encounterId: enc._id }).sort({ date: -1, createdAt: -1 }).limit(limit).lean()
    res.json({ charges: rows })
  }catch(e){ return handleError(res, e) }
}

export async function createCharge(req: Request, res: Response){
  try{
    const { encounterId } = req.params as any
    const enc = await getEREncounter(String(encounterId))
    const data = createErChargeSchema.parse(req.body)
    const amount = data.amount ?? ((data.qty || 0) * (data.unitPrice || 0))
    const row = await HospitalErCharge.create({ ...data, amount, encounterId: enc._id, patientId: (enc as any).patientId })
    res.status(201).json({ charge: row })
  }catch(e){ return handleError(res, e) }
}

export async function removeCharge(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const row = await HospitalErCharge.findByIdAndDelete(String(id))
    if (!row) return res.status(404).json({ error: 'Charge not found' })
    res.json({ ok: true })
  }catch(e){ return handleError(res, e) }
}
