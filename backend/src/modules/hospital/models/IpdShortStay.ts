import { Schema, model, models } from 'mongoose'

const IpdShortStaySchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  admittedAt: { type: Date },
  dischargedAt: { type: Date },
  data: { type: Schema.Types.Mixed },
  createdBy: { type: String },
  printedAt: { type: Date },
}, { timestamps: true })

IpdShortStaySchema.index({ encounterId: 1 }, { unique: true })

export type HospitalIpdShortStayDoc = {
  _id: string
  encounterId: string
  patientId: string
  doctorId?: string
  departmentId?: string
  admittedAt?: Date
  dischargedAt?: Date
  data?: any
  createdBy?: string
  printedAt?: Date
}

export const HospitalIpdShortStay = models.Hospital_IpdShortStay || model('Hospital_IpdShortStay', IpdShortStaySchema)
