import { Schema, model, models } from 'mongoose'

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  company: { type: String },
  phone: { type: String },
  address: { type: String },
  cnic: { type: String },
  mrNumber: { type: String },
}, { timestamps: true })

export type CustomerDoc = {
  _id: string
  name: string
  company?: string
  phone?: string
  address?: string
  cnic?: string
  mrNumber?: string
}

export const Customer = models.Pharmacy_Customer || model('Pharmacy_Customer', CustomerSchema)
