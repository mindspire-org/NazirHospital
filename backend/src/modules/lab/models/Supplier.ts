import { Schema, model, models } from 'mongoose'

const SupplierSchema = new Schema({
  name: { type: String, required: true },
  company: { type: String },
  phone: { type: String },
  address: { type: String },
  taxId: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  totalPurchases: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  lastOrder: { type: String },
}, { timestamps: true })

export type LabSupplierDoc = {
  _id: string
  name: string
  company?: string
  phone?: string
  address?: string
  taxId?: string
  status: 'Active' | 'Inactive'
  totalPurchases?: number
  paid?: number
  lastOrder?: string
}

export const LabSupplier = models.Lab_Supplier || model('Lab_Supplier', SupplierSchema)
