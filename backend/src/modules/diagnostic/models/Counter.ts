import { Schema, model, models } from 'mongoose'

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { timestamps: true })

export type DiagnosticCounterDoc = { _id: string; seq: number }

export const DiagnosticCounter = models.Diagnostic_Counter || model('Diagnostic_Counter', CounterSchema)
