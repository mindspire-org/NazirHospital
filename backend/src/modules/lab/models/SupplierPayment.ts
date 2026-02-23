import { Schema, model, models } from 'mongoose'

const SupplierPaymentSchema = new Schema({
  supplierId: { type: String, required: true, index: true },
  purchaseId: { type: String },
  amount: { type: Number, required: true },
  method: { type: String },
  note: { type: String },
  date: { type: String }, // ISO
}, { timestamps: true, collection: 'lab_supplier_payments' })

export type LabSupplierPaymentDoc = {
  _id: string
  supplierId: string
  purchaseId?: string
  amount: number
  method?: string
  note?: string
  date?: string
}

export const LabSupplierPayment = models.Lab_SupplierPayment || model('Lab_SupplierPayment', SupplierPaymentSchema)
