import { Schema, model, models } from 'mongoose'

const PatientSchema = new Schema({
  mrn: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  fatherName: { type: String },
  phoneNormalized: { type: String, index: true },
  cnicNormalized: { type: String, index: true },
  gender: { type: String },
  age: { type: String },
  guardianRel: { type: String },
  address: { type: String },
  createdAtIso: { type: String },
}, { timestamps: true })

export type LabPatientDoc = {
  _id: string
  mrn: string
  fullName: string
  fatherName?: string
  phoneNormalized?: string
  cnicNormalized?: string
  gender?: string
  age?: string
  guardianRel?: string
  address?: string
  createdAtIso?: string
}

export const LabPatient = models.Lab_Patient || model('Lab_Patient', PatientSchema)
