import { Schema, model, models } from 'mongoose'

const RoomSchema = new Schema({
  name: { type: String, required: true },
  floorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Floor', required: true, index: true },
}, { timestamps: true })

export type HospitalRoomDoc = { _id: string; name: string; floorId: string }

export const HospitalRoom = models.Hospital_Room || model('Hospital_Room', RoomSchema)
