import { Schema, model, models } from 'mongoose'

const DiagnosticTestSchema = new Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, default: 0 },
}, { timestamps: true })

export type DiagnosticTestDoc = {
  _id: string
  name: string
  price: number
}

export const DiagnosticTest = models.Diagnostic_Test || model('Diagnostic_Test', DiagnosticTestSchema)
