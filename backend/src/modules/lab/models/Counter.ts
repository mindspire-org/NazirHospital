import { Schema, model, models } from 'mongoose'

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true })

export type LabCounterDoc = { _id: string; seq: number }

export const LabCounter = models.Lab_Counter || model('Lab_Counter', CounterSchema)
