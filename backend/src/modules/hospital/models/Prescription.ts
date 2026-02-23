import { Schema, model, models } from 'mongoose'

const PrescriptionSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  prescriptionMode: { type: String, default: 'electronic' },
  manualAttachment: {
    mimeType: { type: String },
    fileName: { type: String },
    dataUrl: { type: String },
    uploadedAt: { type: Date },
  },
  items: [{
    name: { type: String, required: true },
    dose: { type: String },
    frequency: { type: String },
    duration: { type: String },
    notes: { type: String },
  }],
  labTests: [{ type: String }],
  labNotes: { type: String },
  diagnosticTests: [{ type: String }],
  diagnosticNotes: { type: String },
  primaryComplaint: { type: String },
  primaryComplaintHistory: { type: String },
  familyHistory: { type: String },
  treatmentHistory: { type: String },
  allergyHistory: { type: String },
  history: { type: String },
  examFindings: { type: String },
  diagnosis: { type: String },
  advice: { type: String },
  vitals: {
    pulse: { type: Number },
    temperatureC: { type: Number },
    bloodPressureSys: { type: Number },
    bloodPressureDia: { type: Number },
    respiratoryRate: { type: Number },
    bloodSugar: { type: Number },
    weightKg: { type: Number },
    heightCm: { type: Number },
    bmi: { type: Number },
    bsa: { type: Number },
    spo2: { type: Number },
  },
  createdBy: { type: String },
}, { timestamps: true })

export type HospitalPrescriptionDoc = {
  _id: string
  patientId: string
  encounterId: string
  prescriptionMode?: 'electronic'|'manual'
  manualAttachment?: { mimeType?: string; fileName?: string; dataUrl?: string; uploadedAt?: string }
  items: Array<{ name: string; dose?: string; frequency?: string; duration?: string; notes?: string }>
  labTests?: string[]
  labNotes?: string
  diagnosticTests?: string[]
  diagnosticNotes?: string
  primaryComplaint?: string
  primaryComplaintHistory?: string
  familyHistory?: string
  treatmentHistory?: string
  allergyHistory?: string
  history?: string
  examFindings?: string
  diagnosis?: string
  advice?: string
  vitals?: {
    pulse?: number
    temperatureC?: number
    bloodPressureSys?: number
    bloodPressureDia?: number
    respiratoryRate?: number
    bloodSugar?: number
    weightKg?: number
    heightCm?: number
    bmi?: number
    bsa?: number
    spo2?: number
  }
  createdBy?: string
}

export const HospitalPrescription = models.Hospital_Prescription || model('Hospital_Prescription', PrescriptionSchema)
