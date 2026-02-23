import { Schema, model, models } from 'mongoose'

const IpdBirthCertificateSchema = new Schema({
  // Make encounter optional to allow standalone certificates
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },

  // Auto-generated serial number like YYYYMM_count
  srNo: { type: String, index: true },

  bcSerialNo: { type: String },
  motherName: { type: String },
  fatherName: { type: String },
  mrNumber: { type: String },
  phone: { type: String },
  address: { type: String },

  babyName: { type: String },
  sexOfBaby: { type: String },
  dateOfBirth: { type: Date },
  timeOfBirth: { type: String },

  deliveryType: { type: String }, // SVD | Instrumental | C-Section
  deliveryMode: { type: String }, // Elective | Emergency | Delivery

  conditionAtBirth: { type: String },
  weightAtBirth: { type: String },
  bloodGroup: { type: String },
  birthMark: { type: String },
  congenitalAbnormality: { type: String },
  babyHandedOverTo: { type: String },

  notes: { type: String },
  parentSignature: { type: String },
  doctorSignature: { type: String },
  createdBy: { type: String },
  printedAt: { type: Date },
}, { timestamps: true })

// Keep uniqueness by encounter only when encounterId exists
IpdBirthCertificateSchema.index(
  { encounterId: 1 },
  { unique: true, partialFilterExpression: { encounterId: { $exists: true, $ne: null } } as any }
)

export type HospitalIpdBirthCertificateDoc = {
  _id: string
  encounterId?: string
  patientId?: string
  doctorId?: string
  departmentId?: string
  srNo?: string
  motherName?: string
  mrNumber?: string
  phone?: string
  dateOfBirth?: Date
  timeOfBirth?: string
  parentSignature?: string
  doctorSignature?: string
  createdBy?: string
  printedAt?: Date
}

export const HospitalIpdBirthCertificate = models.Hospital_IpdBirthCertificate || model('Hospital_IpdBirthCertificate', IpdBirthCertificateSchema)
