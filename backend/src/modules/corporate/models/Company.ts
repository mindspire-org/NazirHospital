import { Schema, model, models } from 'mongoose'

const CorporateCompanySchema = new Schema({
  name: { type: String, required: true, index: true },
  code: { type: String, index: true },
  contactName: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  terms: { type: String },
  billingCycle: { type: String }, // e.g., monthly
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

export type CorporateCompanyDoc = {
  _id: string
  name: string
  code?: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  terms?: string
  billingCycle?: string
  active: boolean
}

export const CorporateCompany = models.Corporate_Company || model('Corporate_Company', CorporateCompanySchema)
