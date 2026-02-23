import { Schema, model, models } from 'mongoose'

const MockFbrLogSchema = new Schema({
  module: { type: String, required: true }, // e.g., 'pharmacy-sale', 'hospital-ipd'
  refId: { type: String, required: true, index: true }, // reference to bill or encounter id
  dateKey: { type: String, required: true, index: true }, // YYYYMMDD
  fbrInvoiceNo: { type: String, required: true, index: true },
  status: { type: String, default: 'SUCCESS' },
  qrCode: { type: String, default: 'BASE64_QR' }, // base64 placeholder in mock
  // Compliance extras
  fbrStatus: { type: String }, // duplicate of status for easier querying
  fbrMode: { type: String, default: 'MOCK' },
  invoiceType: { type: String }, // e.g., 'OPD','LAB','IPD','PHARMACY'
  amount: { type: Number },
  error: { type: String },
  rawResponse: { type: String },
  payload: { type: Schema.Types.Mixed },
}, { timestamps: true, collection: 'mock_fbr_logs' })

export type MockFbrLogDoc = {
  _id: string
  module: string
  refId: string
  dateKey: string
  fbrInvoiceNo: string
  status: string
  qrCode: string
  fbrStatus?: string
  fbrMode?: string
  invoiceType?: string
  amount?: number
  error?: string
  payload?: any
}

export const MockFbrLog = models.Mock_FBR_Log || model('Mock_FBR_Log', MockFbrLogSchema)
