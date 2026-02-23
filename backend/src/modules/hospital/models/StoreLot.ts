import { Schema, model, models } from 'mongoose'

const StoreLotSchema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreItem', required: true, index: true },
  locationId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreLocation', required: true, index: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Vendor' },
  receivedAt: { type: String, required: true, index: true },
  lotNo: { type: String, required: true },
  expiryDate: { type: String, required: true, index: true },
  unitCost: { type: Number, required: true, min: 0 },
  qtyOnHand: { type: Number, required: true },
}, { timestamps: true })

StoreLotSchema.index({ itemId: 1, locationId: 1, lotNo: 1, expiryDate: 1 }, { unique: true })

export type HospitalStoreLotDoc = {
  _id: string
  itemId: string
  locationId: string
  vendorId?: string
  receivedAt: string
  lotNo: string
  expiryDate: string
  unitCost: number
  qtyOnHand: number
}

export const HospitalStoreLot = models.Hospital_StoreLot || model('Hospital_StoreLot', StoreLotSchema)
