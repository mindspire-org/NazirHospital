import { Schema, model, models } from 'mongoose'

const BBBagSchema = new Schema({
  bagId: { type: String, index: true },
  donorName: { type: String },
  bloodType: { type: String },
  volume: { type: Number }, // ml
  collectionDate: { type: String }, // yyyy-mm-dd
  expiryDate: { type: String },
  status: { type: String, enum: ['Available','Quarantined','Used','Expired'], default: 'Available' },
  notes: { type: String },
  reservedByReceiverId: { type: String },
  reservedByReceiverCode: { type: String },
  reservedAt: { type: String },
  usedByReceiverId: { type: String },
  usedByReceiverCode: { type: String },
  usedAt: { type: String },
}, { timestamps: true, collection: 'lab_bb_bags' })

export type LabBBBagDoc = {
  _id: string
  bagId?: string
  donorName?: string
  bloodType?: string
  volume?: number
  collectionDate?: string
  expiryDate?: string
  status: 'Available'|'Quarantined'|'Used'|'Expired'
  notes?: string
  reservedByReceiverId?: string
  reservedByReceiverCode?: string
  reservedAt?: string
  usedByReceiverId?: string
  usedByReceiverCode?: string
  usedAt?: string
}

export const LabBBBag = models.Lab_BB_Bag || model('Lab_BB_Bag', BBBagSchema)
