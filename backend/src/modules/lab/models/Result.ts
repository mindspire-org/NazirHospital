import { Schema, model, models } from 'mongoose'

const ResultRowSchema = new Schema({
  test: { type: String, required: true },
  normal: { type: String },
  unit: { type: String },
  prevValue: { type: String },
  value: { type: String },
  flag: { type: String, enum: ['normal','abnormal','critical'], required: false },
  comment: { type: String },
}, { _id: false })

const ResultSchema = new Schema({
  orderId: { type: String, required: true, index: true },
  rows: { type: [ResultRowSchema], default: [] },
  interpretation: { type: String },
  submittedBy: { type: String },
  reportStatus: { type: String, enum: ['pending','approved'], default: 'pending', index: true },
  approvedAt: { type: Date },
  approvedBy: { type: String },
}, { timestamps: true })

export type LabResultDoc = {
  _id: string
  orderId: string
  rows: Array<{ test: string; normal?: string; unit?: string; prevValue?: string; value?: string; flag?: 'normal'|'abnormal'|'critical'; comment?: string }>
  interpretation?: string
  submittedBy?: string
  reportStatus?: 'pending' | 'approved'
  approvedAt?: string
  approvedBy?: string
}

export const LabResult = models.Lab_Result || model('Lab_Result', ResultSchema)
