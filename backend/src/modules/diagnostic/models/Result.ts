import { Schema, model, models } from 'mongoose'

const ResultSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Diagnostic_Order', required: true },
  testId: { type: String, required: true },
  testName: { type: String, required: true },
  tokenNo: { type: String },
  patient: {
    mrn: String,
    fullName: String,
    phone: String,
    age: String,
    gender: String,
    address: String,
    guardianName: String,
    cnic: String,
  },
  formData: Schema.Types.Mixed,
  images: { type: [String], default: [] },
  status: { type: String, enum: ['draft','final'], default: 'draft' },
  reportedBy: { type: String },
  reportedAt: { type: Date },
  templateVersion: { type: String },
  notes: { type: String },
}, { timestamps: true })

export type DiagnosticResultDoc = {
  _id: string
  orderId: string
  testId: string
  testName: string
  tokenNo?: string
  patient?: any
  formData?: any
  images?: string[]
  status: 'draft'|'final'
  reportedBy?: string
  reportedAt?: string
  templateVersion?: string
  notes?: string
}

export const DiagnosticResult = models.Diagnostic_Result || model('Diagnostic_Result', ResultSchema)
