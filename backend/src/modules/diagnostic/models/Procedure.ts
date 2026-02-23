import { Schema, model, models } from 'mongoose'

const ProcedurePictureSchema = new Schema({
  dataUrl: { type: String, required: true },
  name: { type: String },
}, { _id: false })

const ProcedureExpenseSchema = new Schema({
  description: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  category: { type: String, default: '' },
}, { _id: false })

const ProcedurePharmacyConsumptionSchema = new Schema({
  itemKey: { type: String },
  itemName: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  batch: { type: String },
}, { _id: false })

const DiagnosticProcedureSchema = new Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, default: 0 },
  department: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  templateHtml: { type: String, default: '' },
  picturesEnabled: { type: Boolean, default: false },
  pictures: { type: [ProcedurePictureSchema], default: [] },
  expense: { type: ProcedureExpenseSchema, default: null },
  pharmacyConsumption: { type: [ProcedurePharmacyConsumptionSchema], default: [] },
}, { timestamps: true })

export type DiagnosticProcedureDoc = {
  _id: string
  name: string
  price: number
  department: string
  status?: 'active' | 'inactive'
  templateHtml?: string
  picturesEnabled?: boolean
  pictures?: Array<{ dataUrl: string; name?: string }>
  expense?: { description: string; amount: number; category: string } | null
  pharmacyConsumption?: Array<{ itemKey?: string; itemName: string; quantity: number; batch?: string }>
}

export const DiagnosticProcedure = models.Diagnostic_Procedure || model('Diagnostic_Procedure', DiagnosticProcedureSchema)
