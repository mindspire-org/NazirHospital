import { Schema, model, models } from 'mongoose'

const TestPictureSchema = new Schema({
  dataUrl: { type: String, required: true },
  name: { type: String },
}, { _id: false })

const TestExpenseSchema = new Schema({
  description: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  category: { type: String, default: '' },
}, { _id: false })

const TestPharmacyConsumptionSchema = new Schema({
  itemKey: { type: String },
  itemName: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  batch: { type: String },
}, { _id: false })

const DiagnosticTestSchema = new Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, default: 0 },
  category: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  templateHtml: { type: String, default: '' },
  picturesEnabled: { type: Boolean, default: false },
  pictures: { type: [TestPictureSchema], default: [] },
  expense: { type: TestExpenseSchema, default: null },
  pharmacyConsumption: { type: [TestPharmacyConsumptionSchema], default: [] },
}, { timestamps: true })

export type DiagnosticTestDoc = {
  _id: string
  name: string
  price: number
  category?: string
  status?: 'active' | 'inactive'
  templateHtml?: string
  picturesEnabled?: boolean
  pictures?: Array<{ dataUrl: string; name?: string }>
  expense?: { description: string; amount: number; category: string } | null
  pharmacyConsumption?: Array<{ itemKey?: string; itemName: string; quantity: number; batch?: string }>
}

export const DiagnosticTest = models.Diagnostic_Test || model('Diagnostic_Test', DiagnosticTestSchema)
