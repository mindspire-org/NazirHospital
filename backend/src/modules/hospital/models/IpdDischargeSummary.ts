import { Schema, model, models } from 'mongoose'

const IpdDischargeSummarySchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  dischargeDate: { type: Date, default: Date.now },
  diagnosis: { type: String },
  courseInHospital: { type: String },
  procedures: [{ type: String }],
  conditionAtDischarge: { type: String },
  medications: [{ type: String }],
  advice: { type: String },
  followUpDate: { type: Date },
  notes: { type: String },
  createdBy: { type: String },
  printedAt: { type: Date },
}, { timestamps: true })

IpdDischargeSummarySchema.index({ encounterId: 1 }, { unique: true })

export type HospitalIpdDischargeSummaryDoc = {
  _id: string
  encounterId: string
  patientId: string
  doctorId?: string
  departmentId?: string
  dischargeDate?: Date
  diagnosis?: string
  courseInHospital?: string
  procedures?: string[]
  conditionAtDischarge?: string
  medications?: string[]
  advice?: string
  followUpDate?: Date
  notes?: string
  createdBy?: string
  printedAt?: Date
}

export const HospitalIpdDischargeSummary = models.Hospital_IpdDischargeSummary || model('Hospital_IpdDischargeSummary', IpdDischargeSummarySchema)
