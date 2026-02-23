import { Schema, model, models } from 'mongoose'

const BBReceiverSchema = new Schema({
  code: { type: String, index: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['URGENT','PENDING','DISPENSED','APPROVED'], default: 'PENDING' },
  units: { type: Number, required: true },
  type: { type: String },
  when: { type: String },
  urgency: { type: String, enum: ['Normal','Urgent','Critical',''], default: '' },
  reason: { type: String },
  phone: { type: String },
  cnic: { type: String },
  mrNumber: { type: String },
  pid: { type: String },
  ward: { type: String },
  gender: { type: String, enum: ['Male','Female','Other',''], default: '' },
  age: { type: Number },
}, { timestamps: true, collection: 'lab_bb_receivers' })

export type LabBBReceiverDoc = {
  _id: string
  code?: string
  name: string
  status: 'URGENT'|'PENDING'|'DISPENSED'|'APPROVED'
  units: number
  type?: string
  when?: string
  urgency?: 'Normal'|'Urgent'|'Critical'|''
  reason?: string
  phone?: string
  cnic?: string
  mrNumber?: string
  pid?: string
  ward?: string
  gender?: 'Male'|'Female'|'Other'|''
  age?: number
}

export const LabBBReceiver = models.Lab_BB_Receiver || model('Lab_BB_Receiver', BBReceiverSchema)
