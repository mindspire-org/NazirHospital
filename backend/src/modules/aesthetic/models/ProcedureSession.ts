import { Schema, model, models } from 'mongoose'

const ProcedureSessionSchema = new Schema({
  labPatientId: { type: String },
  patientMrn: { type: String },
  patientName: { type: String },
  phone: { type: String },

  procedureId: { type: String, required: true },
  procedureName: { type: String },
  date: { type: String, required: true },
  sessionNo: { type: Number, default: 1 },
  doctorId: { type: String },

  price: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  payments: { type: [{ amount: Number, method: String, dateIso: String, note: String, by: String }], default: [] },

  status: { type: String, default: 'planned' }, // planned|done|cancelled
  procedureCompleted: { type: Boolean, default: false },
  nextVisitDate: { type: String },
  notes: { type: String },

  beforeImages: { type: [String], default: [] },
  afterImages: { type: [String], default: [] },
  consentIds: { type: [String], default: [] },

  createdAtIso: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true, collection: 'aesthetic_procedure_sessions' })

export type ProcedureSessionDoc = {
  _id: string
  labPatientId?: string
  patientMrn?: string
  patientName?: string
  phone?: string
  procedureId: string
  procedureName?: string
  date: string
  sessionNo?: number
  doctorId?: string
  price?: number
  discount?: number
  paid?: number
  balance?: number
  payments?: Array<{ amount: number; method?: string; dateIso: string; note?: string; by?: string }>
  status?: 'planned'|'done'|'cancelled'
  procedureCompleted?: boolean
  nextVisitDate?: string
  notes?: string
  beforeImages?: string[]
  afterImages?: string[]
  consentIds?: string[]
  createdAtIso?: string
}

export const ProcedureSession = models.Aesthetic_ProcedureSession || model('Aesthetic_ProcedureSession', ProcedureSessionSchema)
