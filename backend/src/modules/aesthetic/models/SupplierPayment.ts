import { Schema, model, models } from 'mongoose'

const SupplierPaymentSchema = new Schema({
  supplierId: { type: String, required: true, index: true },
  purchaseId: { type: String },
  amount: { type: Number, required: true },
  method: { type: String },
  note: { type: String },
  date: { type: String }, // ISO
}, { timestamps: true, collection: 'aesthetic_supplier_payments' })

export type SupplierPaymentDoc = {
  _id: string
  supplierId: string
  purchaseId?: string
  amount: number
  method?: string
  note?: string
  date?: string
}

export const SupplierPayment = models.Aesthetic_SupplierPayment || model('Aesthetic_SupplierPayment', SupplierPaymentSchema)
