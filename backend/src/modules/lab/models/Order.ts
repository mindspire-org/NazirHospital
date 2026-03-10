import { Schema, model, models } from 'mongoose'

const ConsumableSchema = new Schema({
  item: { type: String, required: true },
  qty: { type: Number, required: true },
}, { _id: false })

const PatientSnapshotSchema = new Schema({
  mrn: { type: String },
  fullName: { type: String, required: true },
  phone: { type: String },
  age: { type: String },
  gender: { type: String },
  address: { type: String },
  guardianRelation: { type: String },
  guardianName: { type: String },
  cnic: { type: String },
}, { _id: false })

const PaymentSchema = new Schema({
  amount: { type: Number, required: true },
  at: { type: String, required: true },
  note: { type: String },
  method: { type: String },
  receivedBy: { type: String },
}, { _id: false })

const OrderSchema = new Schema({
  patientId: { type: String, required: true },
  patient: { type: PatientSnapshotSchema, required: true },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  createdByUsername: { type: String },
  tests: { type: [String], required: true },
  returnedTests: { type: [String], default: [] },
  consumables: { type: [ConsumableSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  receivedAmount: { type: Number, default: 0 },
  receivableAmount: { type: Number, default: 0 },
  payments: { type: [PaymentSchema], default: [] },
  tokenNo: { type: String },
  barcode: { type: String },
  status: { type: String, enum: ['received','completed','returned'], default: 'received' },
  sampleTime: { type: String },
  reportingTime: { type: String },
  referringConsultant: { type: String },
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
}, { timestamps: true })

export type LabOrderDoc = {
  _id: string
  patientId: string
  patient: {
    mrn?: string
    fullName: string
    phone?: string
    age?: string
    gender?: string
    address?: string
    guardianRelation?: string
    guardianName?: string
    cnic?: string
  }
  corporateId?: string
  createdByUsername?: string
  tests: string[]
  returnedTests?: string[]
  consumables: { item: string; qty: number }[]
  subtotal: number
  discount: number
  net: number
  receivedAmount?: number
  receivableAmount?: number
  payments?: Array<{ amount: number; at: string; note?: string; method?: string; receivedBy?: string }>
  tokenNo?: string
  barcode?: string
  status: 'received'|'completed'|'returned'
  sampleTime?: string
  reportingTime?: string
  referringConsultant?: string
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
}

export const LabOrder = models.Lab_Order || model('Lab_Order', OrderSchema)
