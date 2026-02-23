import { Schema, model, models } from 'mongoose'

const WardSchema = new Schema({
  name: { type: String, required: true },
  floorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Floor', required: true, index: true },
}, { timestamps: true })

export type HospitalWardDoc = { _id: string; name: string; floorId: string }

export const HospitalWard = models.Hospital_Ward || model('Hospital_Ward', WardSchema)
