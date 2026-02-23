import { Schema, model, models } from 'mongoose'

const StoreTxnSchema = new Schema({
  type: { type: String, enum: ['RECEIVE','ISSUE','TRANSFER','ADJUSTMENT'], required: true, index: true },
  date: { type: String, required: true, index: true },
  referenceNo: { type: String },
  notes: { type: String },

  fromLocationId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreLocation' },
  toLocationId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreLocation' },

  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },

  lines: [{
    itemId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreItem', required: true },
    lotId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreLot' },
    qty: { type: Number, required: true },
    unitCost: { type: Number },
    lotNo: { type: String },
    expiryDate: { type: String },
  }],
}, { timestamps: true })

export type HospitalStoreTxnDoc = {
  _id: string
  type: 'RECEIVE'|'ISSUE'|'TRANSFER'|'ADJUSTMENT'
  date: string
  referenceNo?: string
  notes?: string
  fromLocationId?: string
  toLocationId?: string
  departmentId?: string
  encounterId?: string
  lines: Array<{ itemId: string; lotId?: string; qty: number; unitCost?: number; lotNo?: string; expiryDate?: string }>
}

export const HospitalStoreTxn = models.Hospital_StoreTxn || model('Hospital_StoreTxn', StoreTxnSchema)
