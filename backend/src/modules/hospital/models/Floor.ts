import { Schema, model, models } from 'mongoose'

const FloorSchema = new Schema({
  name: { type: String, required: true },
  number: { type: String },
}, { timestamps: true })

export type HospitalFloorDoc = { _id: string; name: string; number?: string }

export const HospitalFloor = models.Hospital_Floor || model('Hospital_Floor', FloorSchema)
