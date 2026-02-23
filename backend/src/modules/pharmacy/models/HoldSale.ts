import { Schema, model, models } from 'mongoose'

const HoldLineSchema = new Schema({
  medicineId: { type: String, required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  qty: { type: Number, required: true },
  discountRs: { type: Number, default: 0 },
})

const HoldSaleSchema = new Schema({
  createdAtIso: { type: String, required: true },
  createdBy: { type: String },
  billDiscountPct: { type: Number, default: 0 },
  lines: { type: [HoldLineSchema], default: [] },
}, { timestamps: true, collection: 'pharmacy_hold_sales' })

export type HoldSaleDoc = {
  _id: string
  createdAtIso: string
  createdBy?: string
  billDiscountPct?: number
  lines: Array<{ medicineId: string; name: string; unitPrice: number; qty: number; discountRs?: number }>
}

export const HoldSale = models.Pharmacy_HoldSale || model('Pharmacy_HoldSale', HoldSaleSchema)
