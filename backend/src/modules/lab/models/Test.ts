import { Schema, model, models } from 'mongoose'

const TestSchema = new Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
  parameter: { type: String },
  unit: { type: String },
  normalRangeMale: { type: String },
  normalRangeFemale: { type: String },
  normalRangePediatric: { type: String },
  parameters: { type: [new Schema({
    name: { type: String, required: true },
    unit: { type: String },
    normalRangeMale: { type: String },
    normalRangeFemale: { type: String },
    normalRangePediatric: { type: String },
  }, { _id: false })], default: [] },
  consumables: { type: [new Schema({ item: { type: String, required: true }, qty: { type: Number, required: true } }, { _id: false })], default: [] },
}, { timestamps: true })

export type LabTestDoc = {
  _id: string
  name: string
  price?: number
  parameter?: string
  unit?: string
  normalRangeMale?: string
  normalRangeFemale?: string
  normalRangePediatric?: string
  parameters?: Array<{ name: string; unit?: string; normalRangeMale?: string; normalRangeFemale?: string; normalRangePediatric?: string }>
  consumables?: Array<{ item: string; qty: number }>
}

export const LabTest = models.Lab_Test || model('Lab_Test', TestSchema)
