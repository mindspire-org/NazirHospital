import { Schema, model, models } from 'mongoose'

const IpdReferralSchema = new Schema({
  serial: { type: String, index: true, unique: true },
  status: { type: String, enum: ['New','Accepted','Rejected','Admitted'], default: 'New', index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  patientSnapshot: {
    mrn: String,
    fullName: String,
    fatherHusbandName: String,
    cnic: String,
    phone: String,
    dob: Date,
    age: String,
    gender: String,
    maritalStatus: String,
    address: String,
  },
  referredBy: {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
    doctorName: String,
  },
  referredTo: {
    departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
    departmentName: String,
    doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
    doctorName: String,
  },
  referralDate: { type: Date },
  referralTime: { type: String },
  reasonOfReferral: String,
  provisionalDiagnosis: String,
  vitals: {
    bp: String,
    pulse: Number,
    temperature: Number,
    rr: Number,
  },
  condition: {
    stability: { type: String, enum: ['Stable','Unstable'] },
    consciousness: { type: String, enum: ['Conscious','Unconscious'] },
  },
  remarks: String,
  signStamp: String,
  statusHistory: [{ at: { type: Date, default: Date.now }, action: String, note: String }],
  admittedEncounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
}, { timestamps: true })

IpdReferralSchema.index({ status: 1, createdAt: -1 })
IpdReferralSchema.index({ 'referredTo.departmentId': 1, createdAt: -1 })

export type HospitalIpdReferralDoc = any

export const HospitalIpdReferral = models.Hospital_IpdReferral || model('Hospital_IpdReferral', IpdReferralSchema)
