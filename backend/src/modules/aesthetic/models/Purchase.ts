import { Schema, model, models } from 'mongoose'

const LineSchema = new Schema({
  medicineId: { type: String },
  name: { type: String, required: true },
  genericName: { type: String },
  unitsPerPack: { type: Number, default: 1 },
  packs: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
  buyPerPack: { type: Number, default: 0 },
  buyPerUnit: { type: Number, default: 0 },
  salePerPack: { type: Number, default: 0 },
  salePerUnit: { type: Number, default: 0 },
  expiry: { type: String }, // yyyy-mm-dd
  category: { type: String },
  minStock: { type: Number },
  lineTaxType: { type: String, enum: ['percent','fixed'] },
  lineTaxValue: { type: Number },
  buyPerPackAfterTax: { type: Number, default: 0 },
  buyPerUnitAfterTax: { type: Number, default: 0 },
})

const PurchaseSchema = new Schema({
  date: { type: String, required: true }, // yyyy-mm-dd
  invoice: { type: String, required: true, index: true },
  supplierId: { type: String },
  supplierName: { type: String },
  totals: {
    gross: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxable: { type: Number, default: 0 },
    lineTaxes: { type: Number, default: 0 },
    invoiceTaxes: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
  },
  totalAmount: { type: Number, required: true },
  lines: { type: [LineSchema], default: [] },
}, { timestamps: true, collection: 'aesthetic_purchases' })

export type PurchaseDoc = {
  _id: string
  date: string
  invoice: string
  supplierId?: string
  supplierName?: string
  totals?: { gross:number; discount:number; taxable:number; lineTaxes:number; invoiceTaxes:number; net:number }
  totalAmount: number
  lines: {
    medicineId?: string
    name: string
    genericName?: string
    unitsPerPack: number
    packs: number
    totalItems: number
    buyPerPack: number
    buyPerUnit: number
    salePerPack: number
    salePerUnit: number
    expiry?: string
    category?: string
    minStock?: number
    lineTaxType?: 'percent'|'fixed'
    lineTaxValue?: number
    buyPerPackAfterTax?: number
    buyPerUnitAfterTax?: number
  }[]
}

export const Purchase = models.Aesthetic_Purchase || model('Aesthetic_Purchase', PurchaseSchema)
