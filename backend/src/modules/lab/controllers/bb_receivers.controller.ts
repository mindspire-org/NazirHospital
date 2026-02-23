import { Request, Response } from 'express'
import { LabBBReceiver } from '../models/BBReceiver'
import { LabBBBag } from '../models/BBBag'
import { bbReceiverCreateSchema, bbReceiverQuerySchema, bbReceiverUpdateSchema } from '../validators/bb_receiver'

export async function list(req: Request, res: Response){
  const parsed = bbReceiverQuerySchema.safeParse(req.query)
  const { q, status, type, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q) {
    const rx = new RegExp(q, 'i')
    filter.$or = [ { name: rx }, { cnic: rx }, { mrNumber: rx }, { pid: rx }, { ward: rx } ]
  }
  if (status) filter.status = status
  if (type) filter.type = type
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabBBReceiver.countDocuments(filter)
  const items = await LabBBReceiver.find(filter).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = bbReceiverCreateSchema.parse(req.body)
  const code = (data as any).code || `RCV-${Date.now().toString().slice(-5)}`
  const doc = await LabBBReceiver.create({ code, status: 'PENDING', ...data })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const data = bbReceiverUpdateSchema.parse(req.body)

  // If status is transitioning to DISPENSED, ensure inventory is available and consume it atomically
  if (data.status === 'APPROVED') {
    const prev: any = await LabBBReceiver.findById(id).lean()
    if (!prev) return res.status(404).json({ error: 'Receiver not found' })
    if (prev.status !== 'APPROVED') {
      const units = Number((data as any).units ?? prev.units)
      const type = String((((data as any).type ?? prev.type) || ''))
      if (!type || !units || units < 1) return res.status(400).json({ error: 'Blood type and units are required to approve' })
      const avail = await LabBBBag.find({ bloodType: type, status: 'Available' }).sort({ expiryDate: 1 }).limit(units).lean()
      if (!avail || avail.length < units) return res.status(400).json({ error: `Not enough available units for ${type}` })
      const now = new Date().toISOString()
      await LabBBBag.updateMany(
        { _id: { $in: avail.map((b: any) => b._id) } },
        { $set: { status: 'Quarantined', reservedByReceiverId: id, reservedByReceiverCode: (prev as any).code || '', reservedAt: now } }
      )
    }
  }

  // Release reservations if leaving APPROVED to a non-dispensed state
  if (data.status && data.status !== 'APPROVED' && data.status !== 'DISPENSED') {
    const prev: any = await LabBBReceiver.findById(id).lean()
    if (prev && prev.status === 'APPROVED') {
      await LabBBBag.updateMany(
        { reservedByReceiverId: id, status: 'Quarantined' },
        { $set: { status: 'Available' }, $unset: { reservedByReceiverId: '', reservedByReceiverCode: '', reservedAt: '' } as any }
      )
    }
  }

  if (data.status === 'DISPENSED') {
    const prev: any = await LabBBReceiver.findById(id).lean()
    if (!prev) {
      return res.status(404).json({ error: 'Receiver not found' })
    }
    if (prev && prev.status !== 'DISPENSED') {
      const units = Number((data as any).units ?? prev.units)
      const type = String((((data as any).type ?? prev.type) || ''))
      if (!type || !units || units < 1) {
        return res.status(400).json({ error: 'Blood type and units are required to dispense' })
      }
      // Prefer reserved bags if previously approved
      let bags: any[] = []
      if (prev.status === 'APPROVED') {
        const reserved = await LabBBBag.find({ reservedByReceiverId: id, status: 'Quarantined' }).sort({ expiryDate: 1 }).limit(units).lean()
        bags = reserved
        // If reserved more than needed, release extras
        if ((reserved?.length || 0) > units) {
          const extras = reserved.slice(units)
          await LabBBBag.updateMany(
            { _id: { $in: extras.map((b: any) => b._id) } },
            { $set: { status: 'Available' }, $unset: { reservedByReceiverId: '', reservedByReceiverCode: '', reservedAt: '' } as any }
          )
          bags = reserved.slice(0, units)
        }
        // If reserved less than needed, supplement from available
        if ((bags?.length || 0) < units) {
          const needed = units - (bags?.length || 0)
          const extraAvail = await LabBBBag.find({ bloodType: type, status: 'Available' }).sort({ expiryDate: 1 }).limit(needed).lean()
          bags = [...bags, ...extraAvail]
        }
      } else {
        bags = await LabBBBag.find({ bloodType: type, status: 'Available' }).sort({ expiryDate: 1 }).limit(units).lean()
      }
      if (!bags || bags.length < units) return res.status(400).json({ error: `Not enough available units for ${type}` })
      const now = new Date().toISOString()
      await LabBBBag.updateMany(
        { _id: { $in: bags.map((b: any) => b._id) } },
        { $set: { status: 'Used', usedByReceiverId: id, usedByReceiverCode: (prev as any).code || '', usedAt: now } }
      )
      // Clear any remaining reservations for this receiver
      await LabBBBag.updateMany(
        { reservedByReceiverId: id, status: 'Quarantined' },
        { $set: { status: 'Available' }, $unset: { reservedByReceiverId: '', reservedByReceiverCode: '', reservedAt: '' } as any }
      )
    }
  }

  const doc = await LabBBReceiver.findByIdAndUpdate(id, { $set: data }, { new: true })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabBBReceiver.findByIdAndDelete(id)
  res.json({ ok: true })
}
