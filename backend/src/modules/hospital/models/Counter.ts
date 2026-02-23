import { Schema, model, models } from 'mongoose'

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true })

export type HospitalCounterDoc = { _id: string; seq: number }

export const HospitalCounter = models.Hospital_Counter || model('Hospital_Counter', CounterSchema)
