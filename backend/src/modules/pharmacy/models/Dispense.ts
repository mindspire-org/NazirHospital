import { Schema, model, models } from 'mongoose'

const LineSchema = new Schema({
  medicineId: { type: String, required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  qty: { type: Number, required: true },
  costPerUnit: { type: Number, default: 0 },
  discountRs: { type: Number, default: 0 },
})

const DispenseSchema = new Schema({
  datetime: { type: String, required: true }, // ISO
  billNo: { type: String, required: true, index: true },
  customerId: { type: String },
  customer: { type: String, default: 'Walk-in' },
  payment: { type: String, enum: ['Cash','Card','Credit'], default: 'Cash' },
  discountPct: { type: Number, default: 0 },
  lineDiscountTotal: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  lines: { type: [LineSchema], default: [] },
  profit: { type: Number, default: 0 },
  createdBy: { type: String },
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
}, { timestamps: true, collection: 'pharmacy_dispenses' })

export type DispenseDoc = {
  _id: string
  datetime: string
  billNo: string
  customerId?: string
  customer?: string
  payment: 'Cash'|'Card'|'Credit'
  discountPct?: number
  lineDiscountTotal?: number
  subtotal: number
  total: number
  profit?: number
  createdBy?: string
  lines: { medicineId: string; name: string; unitPrice: number; qty: number; costPerUnit?: number; discountRs?: number }[]
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
}

export const Dispense = models.Pharmacy_Dispense || model('Pharmacy_Dispense', DispenseSchema)


