import { Schema, model, models } from 'mongoose'

const InventoryItemSchema = new Schema({
  key: { type: String, required: true, index: true, unique: true }, // normalized lower-case name
  name: { type: String, required: true },
  genericName: { type: String },
  category: { type: String },
  unitsPerPack: { type: Number, default: 1 },
  onHand: { type: Number, default: 0 },
  minStock: { type: Number },
  earliestExpiry: { type: String }, // yyyy-mm-dd
  lastInvoice: { type: String },
  lastSupplier: { type: String },
  lastSalePerUnit: { type: Number, default: 0 },
  lastSupplierId: { type: String },
  // Track last company associated with this item (for convenience when editing)
  lastCompany: { type: String },
  lastCompanyId: { type: String },
  lastInvoiceDate: { type: String },
  lastExpiry: { type: String },
  lastPacksReceived: { type: Number, default: 0 },
  lastTotalItemsReceived: { type: Number, default: 0 },
  lastBuyPerPack: { type: Number, default: 0 },
  lastBuyPerUnit: { type: Number, default: 0 },
  lastBuyPerPackAfterTax: { type: Number, default: 0 },
  lastBuyPerUnitAfterTax: { type: Number, default: 0 },
  lastSalePerPack: { type: Number, default: 0 },
  lastLineTaxType: { type: String },
  lastLineTaxValue: { type: Number, default: 0 },
  lastMedicineId: { type: String },
  avgCostPerUnit: { type: Number, default: 0 },
  // New: default line discount (%) to auto-apply in POS cart
  defaultDiscountPct: { type: Number, default: 0 },
}, { timestamps: true, collection: 'pharmacy_inventoryitems' })

export type InventoryItemDoc = {
  _id: string
  key: string
  name: string
  genericName?: string
  category?: string
  unitsPerPack: number
  onHand: number
  minStock?: number
  earliestExpiry?: string
  lastInvoice?: string
  lastSupplier?: string
  lastSalePerUnit?: number
  lastSupplierId?: string
  lastCompany?: string
  lastCompanyId?: string
  lastInvoiceDate?: string
  lastExpiry?: string
  lastPacksReceived?: number
  lastTotalItemsReceived?: number
  lastBuyPerPack?: number
  lastBuyPerUnit?: number
  lastBuyPerPackAfterTax?: number
  lastBuyPerUnitAfterTax?: number
  lastSalePerPack?: number
  lastLineTaxType?: 'percent'|'fixed'
  lastLineTaxValue?: number
  lastMedicineId?: string
  avgCostPerUnit?: number
  defaultDiscountPct?: number
}

export const InventoryItem = models.Pharmacy_InventoryItem || model('Pharmacy_InventoryItem', InventoryItemSchema)
