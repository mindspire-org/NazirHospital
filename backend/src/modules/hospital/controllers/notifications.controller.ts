import { Request, Response } from 'express'
import { HospitalNotification } from '../models/Notification'
import { notifyDoctor, registerDoctorStream } from '../services/notifications'

function handleError(res: Response, e: any){
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: 'Internal Server Error' })
}

export async function list(req: Request, res: Response){
  try{
    const q = req.query as any
    const doctorId = String(q.doctorId || '')
    if (!doctorId) return res.status(400).json({ error: 'doctorId required' })
    const rows = await HospitalNotification.find({ doctorId }).sort({ createdAt: -1 }).limit(200)
    res.json({ notifications: rows })
  }catch(e){ return handleError(res, e) }
}

export async function update(req: Request, res: Response){
  try{
    const { id } = req.params as any
    const { read } = req.body as any
    const row = await HospitalNotification.findByIdAndUpdate(String(id), { $set: { read: !!read } }, { new: true })
    if (!row) return res.status(404).json({ error: 'Notification not found' })
    res.json({ notification: row })
  }catch(e){ return handleError(res, e) }
}

export async function stream(req: Request, res: Response){
  try{
    const q = req.query as any
    const doctorId = String(q.doctorId || '')
    if (!doctorId) return res.status(400).json({ error: 'doctorId required' })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    ;(res as any).flushHeaders?.()

    const cleanup = registerDoctorStream(doctorId, res)

    // Initial event to confirm connection
    res.write(`event: connected\n`)
    res.write(`data: {"ok":true}\n\n`)

    req.on('close', () => {
      cleanup()
      try { res.end() } catch {}
    })
  }catch(e){ return handleError(res, e) }
}
