import { Request, Response } from 'express'
import { HospitalFloor } from '../models/Floor'
import { HospitalRoom } from '../models/Room'
import { HospitalWard } from '../models/Ward'
import { HospitalBed } from '../models/Bed'
import { createBedsSchema, createFloorSchema, createRoomSchema, createWardSchema, updateBedStatusSchema, updateBedSchema, updateFloorSchema, updateRoomSchema, updateWardSchema } from '../validators/bed_mgmt'

export async function listFloors(_req: Request, res: Response){
  const rows = await HospitalFloor.find().sort({ name: 1 }).lean()
  res.json({ floors: rows })
}
export async function createFloor(req: Request, res: Response){
  const data = createFloorSchema.parse(req.body)
  const row = await HospitalFloor.create(data)
  res.status(201).json({ floor: row })
}

export async function updateFloor(req: Request, res: Response){
  const id = req.params.id
  const patch = updateFloorSchema.parse(req.body)
  const row = await HospitalFloor.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Floor not found' })
  res.json({ floor: row })
}

export async function removeFloor(req: Request, res: Response){
  const id = req.params.id
  // Safety checks: prevent delete if children exist
  const [roomCount, wardCount, bedCount] = await Promise.all([
    HospitalRoom.countDocuments({ floorId: id }),
    HospitalWard.countDocuments({ floorId: id }),
    HospitalBed.countDocuments({ floorId: id }),
  ])
  if (roomCount || wardCount || bedCount){
    return res.status(409).json({ error: `Cannot delete floor: ${roomCount} rooms, ${wardCount} wards, ${bedCount} beds exist` })
  }
  const row = await HospitalFloor.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Floor not found' })
  res.json({ ok: true })
}

export async function listRooms(req: Request, res: Response){
  const floorId = String((req.query as any).floorId || '')
  const criteria: any = floorId ? { floorId } : {}
  const rows = await HospitalRoom.find(criteria).sort({ name: 1 }).lean()
  res.json({ rooms: rows })
}
export async function createRoom(req: Request, res: Response){
  const data = createRoomSchema.parse(req.body)
  const row = await HospitalRoom.create(data)
  res.status(201).json({ room: row })
}

export async function updateRoom(req: Request, res: Response){
  const id = req.params.id
  const patch = updateRoomSchema.parse(req.body)
  const row = await HospitalRoom.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Room not found' })
  res.json({ room: row })
}

export async function removeRoom(req: Request, res: Response){
  const id = req.params.id
  // Safety: prevent delete if beds exist in this room
  const bedCount = await HospitalBed.countDocuments({ locationType: 'room', locationId: id })
  if (bedCount){ return res.status(409).json({ error: `Cannot delete room: ${bedCount} beds exist` }) }
  const row = await HospitalRoom.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Room not found' })
  res.json({ ok: true })
}

export async function listWards(req: Request, res: Response){
  const floorId = String((req.query as any).floorId || '')
  const criteria: any = floorId ? { floorId } : {}
  const rows = await HospitalWard.find(criteria).sort({ name: 1 }).lean()
  res.json({ wards: rows })
}
export async function createWard(req: Request, res: Response){
  const data = createWardSchema.parse(req.body)
  const row = await HospitalWard.create(data)
  res.status(201).json({ ward: row })
}

export async function updateWard(req: Request, res: Response){
  const id = req.params.id
  const patch = updateWardSchema.parse(req.body)
  const row = await HospitalWard.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Ward not found' })
  res.json({ ward: row })
}

export async function removeWard(req: Request, res: Response){
  const id = req.params.id
  // Safety: prevent delete if beds exist in this ward
  const bedCount = await HospitalBed.countDocuments({ locationType: 'ward', locationId: id })
  if (bedCount){ return res.status(409).json({ error: `Cannot delete ward: ${bedCount} beds exist` }) }
  const row = await HospitalWard.findByIdAndDelete(id)
  if (!row) return res.status(404).json({ error: 'Ward not found' })
  res.json({ ok: true })
}

export async function listBeds(req: Request, res: Response){
  const q = req.query as any
  const criteria: any = {}
  if (q.floorId) criteria.floorId = q.floorId
  if (q.locationType) criteria.locationType = q.locationType
  if (q.locationId) criteria.locationId = q.locationId
  if (q.status) criteria.status = q.status
  const [floors, rooms, wards, rows] = await Promise.all([
    HospitalFloor.find().select('name').lean(),
    HospitalRoom.find().select('name').lean(),
    HospitalWard.find().select('name').lean(),
    HospitalBed.find(criteria)
      .sort({ label: 1 })
    .populate({
      path: 'occupiedByEncounterId',
      select: 'patientId status type',
      populate: { path: 'patientId', select: 'fullName mrn' },
    })
      .lean(),
  ])

  const floorMap = new Map<string, string>((floors || []).map((f: any) => [String(f._id), String(f.name || '')]))
  const roomMap = new Map<string, string>((rooms || []).map((r: any) => [String(r._id), String(r.name || '')]))
  const wardMap = new Map<string, string>((wards || []).map((w: any) => [String(w._id), String(w.name || '')]))
  const items = rows.map((b: any) => {
    const enc = b.occupiedByEncounterId
    const p = enc?.patientId
    const statusNormalized = (b.status === 'occupied' && (!enc || enc.status !== 'admitted' || enc.type !== 'IPD')) ? 'available' : b.status
    const floorName = floorMap.get(String(b.floorId)) || ''
    const locationName = b.locationType === 'room'
      ? (roomMap.get(String(b.locationId)) || '')
      : (wardMap.get(String(b.locationId)) || '')
    return {
      ...b,
      status: statusNormalized,
      occupantName: p?.fullName,
      occupantMrn: p?.mrn,
      occupantEncounterId: enc?._id,
      floorName,
      locationName,
    }
  })
  res.json({ beds: items })
}

export async function addBeds(req: Request, res: Response){
  const data = createBedsSchema.parse(req.body)
  const docs = data.labels.map(l => ({
    label: l,
    floorId: data.floorId,
    locationType: data.locationType,
    locationId: data.locationId,
    status: 'available',
    charges: data.charges,
    category: data.category,
  }))
  const inserted = await HospitalBed.insertMany(docs)
  res.status(201).json({ beds: inserted })
}

export async function updateBedStatus(req: Request, res: Response){
  const data = updateBedStatusSchema.parse(req.body)
  const id = req.params.id
  const bed = await HospitalBed.findById(id)
  if (!bed) return res.status(404).json({ error: 'Bed not found' })
  bed.status = data.status
  if (data.status === 'occupied') bed.occupiedByEncounterId = data.encounterId as any
  if (data.status === 'available') bed.occupiedByEncounterId = undefined as any
  await bed.save()
  res.json({ bed })
}

export async function updateBed(req: Request, res: Response){
  const id = req.params.id
  const patch = updateBedSchema.parse(req.body)
  const row = await HospitalBed.findByIdAndUpdate(id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Bed not found' })
  res.json({ bed: row })
}

export async function removeBed(req: Request, res: Response){
  const id = req.params.id
  const bed = await HospitalBed.findById(id)
  if (!bed) return res.status(404).json({ error: 'Bed not found' })
  if (bed.status === 'occupied') return res.status(409).json({ error: 'Cannot delete an occupied bed' })
  await HospitalBed.deleteOne({ _id: id })
  res.json({ ok: true })
}
