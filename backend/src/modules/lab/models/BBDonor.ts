import { Schema, model, models } from 'mongoose'

const BBDonorSchema = new Schema({
  code: { type: String, index: true },
  name: { type: String, required: true },
  gender: { type: String, enum: ['Male','Female','Other',''], default: '' },
  type: { type: String },
  age: { type: Number },
  cnic: { type: String },
  phone: { type: String },
  address: { type: String },
  weight: { type: Number },
  height: { type: Number },
  lastDonationDate: { type: String },
  donated3Months: { type: String, enum: ['Yes','No',''], default: '' },
  tattoo6Months: { type: String, enum: ['Yes','No',''], default: '' },
  antibiotics: { type: String, enum: ['Yes','No',''], default: '' },
  traveled6Months: { type: String, enum: ['Yes','No',''], default: '' },
  consent: { type: Boolean, default: false },
}, { timestamps: true, collection: 'lab_bb_donors' })

export type LabBBDonorDoc = {
  _id: string
  code?: string
  name: string
  gender?: 'Male'|'Female'|'Other'|''
  type?: string
  age?: number
  cnic?: string
  phone?: string
  address?: string
  weight?: number
  height?: number
  lastDonationDate?: string
  donated3Months?: 'Yes'|'No'|''
  tattoo6Months?: 'Yes'|'No'|''
  antibiotics?: 'Yes'|'No'|''
  traveled6Months?: 'Yes'|'No'|''
  consent?: boolean
}

export const LabBBDonor = models.Lab_BB_Donor || model('Lab_BB_Donor', BBDonorSchema)
