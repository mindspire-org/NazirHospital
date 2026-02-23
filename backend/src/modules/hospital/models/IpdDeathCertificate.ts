import { Schema, model, models } from 'mongoose'

const IpdDeathCertificateSchema = new Schema({
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  dateOfDeath: { type: Date },
  timeOfDeath: { type: String },
  causeOfDeath: { type: String },
  placeOfDeath: { type: String },
  notes: { type: String },
  // New structured fields for redesigned form
  dcNo: { type: String },
  mrNumber: { type: String },
  relative: { type: String },
  ageSex: { type: String },
  address: { type: String },
  presentingComplaints: { type: String },
  diagnosis: { type: String },
  primaryCause: { type: String },
  secondaryCause: { type: String },
  receiverName: { type: String },
  receiverRelation: { type: String },
  receiverIdCard: { type: String },
  receiverDate: { type: Date },
  receiverTime: { type: String },
  staffName: { type: String },
  staffSignDate: { type: Date },
  staffSignTime: { type: String },
  doctorName: { type: String },
  doctorSignDate: { type: Date },
  doctorSignTime: { type: String },
  createdBy: { type: String },
  printedAt: { type: Date },
}, { timestamps: true })

IpdDeathCertificateSchema.index({ encounterId: 1 }, { unique: true })

export type HospitalIpdDeathCertificateDoc = {
  _id: string
  encounterId: string
  patientId: string
  doctorId?: string
  departmentId?: string
  dateOfDeath?: Date
  timeOfDeath?: string
  causeOfDeath?: string
  placeOfDeath?: string
  notes?: string
  createdBy?: string
  printedAt?: Date
}

export const HospitalIpdDeathCertificate = models.Hospital_IpdDeathCertificate || model('Hospital_IpdDeathCertificate', IpdDeathCertificateSchema)
