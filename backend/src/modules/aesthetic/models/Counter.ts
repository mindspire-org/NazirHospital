import { Schema, model, models } from 'mongoose'

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true })

export type AestheticCounterDoc = { _id: string; seq: number }

export const AestheticCounter = models.Aesthetic_Counter || model('Aesthetic_Counter', CounterSchema)
