import { Schema, model, models } from 'mongoose'

const LineSchema = new Schema({
  itemId: { type: String },
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

const PurchaseDraftSchema = new Schema({
  date: { type: String, required: true }, // yyyy-mm-dd
  invoice: { type: String, required: true, index: true },
  supplierId: { type: String },
  supplierName: { type: String },
  invoiceTaxes: { type: [{ name: String, value: Number, type: { type: String, enum: ['percent','fixed'] }, applyOn: { type: String, enum: ['gross','net'] } }], default: [] },
  totals: {
    gross: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxable: { type: Number, default: 0 },
    lineTaxes: { type: Number, default: 0 },
    invoiceTaxes: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
  },
  lines: { type: [LineSchema], default: [] },
}, { timestamps: true, collection: 'lab_purchasedrafts' })

export type LabPurchaseDraftDoc = {
  _id: string
  date: string
  invoice: string
  supplierId?: string
  supplierName?: string
  invoiceTaxes?: { name: string; value: number; type: 'percent'|'fixed'; applyOn: 'gross'|'net' }[]
  totals?: { gross:number; discount:number; taxable:number; lineTaxes:number; invoiceTaxes:number; net:number }
  lines: {
    itemId?: string
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

export const LabPurchaseDraft = models.Lab_PurchaseDraft || model('Lab_PurchaseDraft', PurchaseDraftSchema)
